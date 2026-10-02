/**
 * The SVG element model.
 *
 * Each element type computes its own geometry and style, then draws through the
 * {@link Renderer}. Groups, clip paths, masks, gradients, patterns and text are
 * all handled here; the renderer only ever sees finished drawing operations.
 */

import {
  IDENTITY,
  SvgShape,
  inverseMatrix,
  isEqual,
  isNotEqual,
  multiplyMatrix,
  parseAspectRatio,
  parseTransform,
  transformPoint,
  validateMatrix,
  validateNumber,
  type BBox,
  type Matrix,
  type TransformOriginFn,
} from './geometry.js';
import { SvgNode } from './xml.js';
import {
  StyleResolver,
  buildProperties,
  combineArrays,
  parseStyleSheet,
  type PaintServer,
  type ResolvedStyle,
  type StyleContext,
  type StyleRule,
} from './style.js';
import {
  createDefaultColors,
  isSpotColor,
  opacityToColor,
  type ColorCallback,
  type ParsedColor,
  type PaintKind,
} from './color.js';
import type {
  FontCallback,
  GradientSpec,
  GroupHandle,
  PatternSpec,
  Renderer,
  ResolvedColor,
} from './renderer.js';
import type { PdfFont } from './font.js';

export interface ConvertOptions {
  width?: number;
  height?: number;
  /**
   * Whether `y` is the bottom ("bottom", default) or the top ("top") edge of
   * the drawing area. `PDFPage.drawSvg` places the SVG by its top edge.
   */
  anchorY?: 'bottom' | 'top';
  /** Initial `font-size` in SVG user units (default 16). */
  initialFontSize?: number;
  preserveAspectRatio?: string;
  assumePt?: boolean;
  pointsPerInch?: number;
  precision?: number;
  cmyk?: boolean;
  fontCallback?: FontCallback;
  imageCallback?: (link: string) => string;
  colorCallback?: ColorCallback;
  documentCallback?: (file: string) => unknown;
  warningCallback?: (message: string) => void;
}

/** A paint resolved to something the renderer can apply. */
export type Paint =
  | { type: 'color'; color: ResolvedColor }
  | { type: 'gradient'; gradient: GradientSpec; opacity: number }
  | { type: 'pattern'; pattern: PatternSpec; opacity: number };

export type FillRule = 'nonzero' | 'evenodd';

/** One laid-out glyph of a text run. */
export interface GlyphPlacement {
  glyph: string;
  rotate: number;
  x: number;
  kern: number;
  y: number;
  width: number;
  ascent: number;
  descent: number;
  scale: number;
  hidden: boolean;
  continuous: boolean;
}

const BLEND_MODES: Record<string, string> = {
  normal: 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
  'color-dodge': 'ColorDodge',
  'color-burn': 'ColorBurn',
  'hard-light': 'HardLight',
  'soft-light': 'SoftLight',
  difference: 'Difference',
  exclusion: 'Exclusion',
  hue: 'Hue',
  saturation: 'Saturation',
  color: 'Color',
  luminosity: 'Luminosity',
};

/** Shared converter state: the renderer, options and style tables. */
export class Conversion {
  readonly renderer: Renderer;
  readonly properties: Record<string, ReturnType<typeof buildProperties>[string]>;
  readonly defaultColors: Record<string, ParsedColor>;
  readonly rules: StyleRule[];
  readonly documentCache: Record<string, SvgNode[]> = {};
  readonly precision: number;
  readonly cmyk: boolean;
  readonly colorCallback: ColorCallback | null;
  readonly documentCallback: ((file: string) => unknown) | null;

  root: SvgNode | null = null;
  stack: SvgNode[] = [];
  viewportWidth = 0;
  viewportHeight = 0;
  preserveAspectRatio: string | null = null;

  /** Scale from SVG px to PDF units. */
  pxToPt = 0.75;

  constructor(renderer: Renderer, options: ConvertOptions) {
    this.renderer = renderer;
    this.cmyk = options.cmyk === true;
    this.colorCallback = options.colorCallback ?? null;
    this.documentCallback = options.documentCallback ?? null;
    this.defaultColors = createDefaultColors(this.cmyk);
    this.properties = buildProperties(this.defaultColors, options.initialFontSize);
    this.rules = [];
    this.precision = Math.ceil(Math.max(1, options.precision ?? 0)) || 3;
  }

  /**
   * Paint-server elements currently being constructed, so an `href` chain that
   * loops back on itself stops instead of recursing forever.
   */
  readonly paintServerStack: SvgNode[] = [];

  /** Enter a paint server; returns false if it is already being built. */
  pushPaintServer(node: SvgNode): boolean {
    if (this.paintServerStack.includes(node)) return false;
    this.paintServerStack.push(node);
    return true;
  }

  popPaintServer(node: SvgNode): void {
    const index = this.paintServerStack.lastIndexOf(node);
    if (index >= 0) this.paintServerStack.splice(index, 1);
  }

  warn(message: string): void {
    this.renderer.warn(message);
  }

  /** Build the style context for an element. */
  private contextFor(inherits: StyleResolver | null): StyleContext {
    return {
      root: this.root,
      stack: this.stack,
      cmyk: this.cmyk,
      colorCallback: this.colorCallback,
      documentCallback: this.documentCallback,
      documentCache: this.documentCache,
      createPaintServer: (node, fallback) => this.createPaintServer(node, fallback),
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      elemViewport: () => this.rootViewport(),
      elemFontSize: (resolver) => this.elemFontSize(resolver),
      warn: (message) => this.warn(message),
    };
  }

  makeResolver(elem: SvgNode, inherits: StyleResolver | null): StyleResolver {
    return new StyleResolver(
      this.contextFor(inherits),
      this.properties,
      elem,
      inherits,
      this.rules,
    );
  }

  /** Diagonal of the root viewport, used for viewport-relative lengths. */
  rootViewport(): number {
    return Math.sqrt(
      0.5 * this.viewportWidth * this.viewportWidth +
        0.5 * this.viewportHeight * this.viewportHeight,
    );
  }

  elemFontSize(resolver: StyleResolver): number {
    const value = resolver.get('font-size');
    return typeof value === 'number' ? value : 16;
  }

  createPaintServer(node: SvgNode, fallback: ParsedColor | undefined): PaintServer {
    if (node.nodeName === 'pattern') {
      return new SvgElemPattern(node, null, fallback, this);
    }
    return new SvgElemGradient(node, null, fallback, this);
  }
}

/* -------------------------------------------------------------------------- */
/* Paint conversion                                                            */
/* -------------------------------------------------------------------------- */

/** Convert a parsed color into renderable components, or `undefined`. */
function toColor(paint: ParsedColor): ResolvedColor | undefined {
  const value = paint[0];
  if (isSpotColor(value)) return undefined;
  const alpha = paint[1];
  if (value.length === 4) {
    return {
      space: 'cmyk',
      components: [
        value[0] > 1 ? value[0] / 100 : value[0],
        value[1] > 1 ? value[1] / 100 : value[1],
        value[2] > 1 ? value[2] / 100 : value[2],
        value[3] > 1 ? value[3] / 100 : value[3],
      ],
      alpha,
    };
  }
  if (value.length === 3) {
    return {
      space: 'rgb',
      components: [value[0] / 255, value[1] / 255, value[2] / 255],
      alpha,
    };
  }
  return undefined;
}

/**
 * Order a bounding box so `x0 <= x1` and `y0 <= y1`, which is what a form
 * XObject's BBox requires.
 */
function normalizeBox(box: BBox): BBox {
  return [
    Math.min(box[0], box[2]),
    Math.min(box[1], box[3]),
    Math.max(box[0], box[2]),
    Math.max(box[1], box[3]),
  ];
}

/* -------------------------------------------------------------------------- */
/* Base element                                                                */
/* -------------------------------------------------------------------------- */

/** A style value that may be a paint server rather than a plain color. */
type PaintValue = ParsedColor | 'none' | PaintServer;

export class SvgElem {
  /** True for text content, where `<a>` behaves as a tspan. */
  readonly isText: boolean = false;

  /** Paint this element onto the current target. */
  drawInDocument(_isClip: boolean, _isMask: boolean): void {}

  readonly name: string;
  readonly isOuterElement: boolean;
  readonly inherits: SvgElem | null;
  readonly stack: SvgNode[];
  readonly resolver: StyleResolver;
  allowedChildren: string[] = [];

  protected readonly conversion: Conversion;
  protected readonly node: SvgNode;
  private childrenCache: SvgElem[] | null = null;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    this.node = obj;
    this.name = obj.nodeName ?? '';
    this.conversion = conversion;
    this.isOuterElement = obj === conversion.root || !obj.parentNode;
    this.inherits =
      inherits ?? (this.isOuterElement ? null : createElement(obj.parentNode!, null, conversion));
    this.stack = this.inherits != null ? this.inherits.stack.concat(obj) : [obj];
    conversion.stack = this.stack;
    this.resolver = conversion.makeResolver(obj, this.inherits?.resolver ?? null);
  }

  get element(): SvgNode {
    return this.node;
  }

  attr(key: string): string | null {
    return this.node.getAttribute(key);
  }

  get(key: string, kind?: PaintKind): ResolvedStyle {
    return this.resolver.get(key, kind);
  }

  getChildren(): SvgElem[] {
    if (this.childrenCache !== null) return this.childrenCache;
    const children: SvgElem[] = [];
    for (const child of this.node.childNodes) {
      if (!child.error && this.allowedChildren.includes(child.nodeName ?? '')) {
        children.push(createElement(child, this, this.conversion));
      }
    }
    return (this.childrenCache = children);
  }

  /* ------------------------------------------------------------------ */
  /* Geometry helpers                                                     */
  /* ------------------------------------------------------------------ */

  getParentVWidth(): number {
    return this.inherits ? this.inherits.getVWidth() : this.conversion.viewportWidth;
  }

  getParentVHeight(): number {
    return this.inherits ? this.inherits.getVHeight() : this.conversion.viewportHeight;
  }

  getVWidth(): number {
    return this.getParentVWidth();
  }

  getVHeight(): number {
    return this.getParentVHeight();
  }

  getViewport(): number {
    return this.conversion.rootViewport();
  }

  computeLength(
    value: string | null,
    percent: number | undefined,
    initial: number | undefined,
    isFontSize = false,
  ): number | undefined {
    return this.resolver.computeLength(value ?? '', percent, initial, isFontSize);
  }

  computeLengthList(
    value: string | null,
    percent: number | undefined,
    strict: boolean,
  ): number[] | undefined {
    return this.resolver.computeLengthList(value ?? '', percent, strict);
  }

  getLength(key: string, percent: number | undefined, initial?: number): number {
    return this.computeLength(this.attr(key), percent, initial) as number;
  }

  getLengthList(key: string, percent: number | undefined): number[] {
    return this.computeLengthList(this.attr(key), percent, false) ?? [];
  }

  getUrl(key: string): SvgNode | null {
    return this.resolver.resolveUrl(this.attr(key) ?? '');
  }

  getNumberList(key: string): number[] & { error?: string } {
    return this.resolver.parseNumberList(this.attr(key) ?? '');
  }

  getViewbox(key: string, initial: number[]): number[] {
    const viewBox = this.getNumberList(key);
    if (viewBox.length === 4 && viewBox[2] >= 0 && viewBox[3] >= 0) return viewBox;
    return initial;
  }

  /** Clamp a value into 0-1, accepting plain numbers and percentages. */
  getPercent(key: string, initial: number): number {
    const value = this.attr(key);
    if (value == null) return initial;
    const match = /^([+-]?(?:[0-9]*\.)?[0-9]+)(%?)$/.exec(value.trim());
    if (!match) return initial;
    const number = Number(match[1]) * (match[2] === '%' ? 0.01 : 1);
    return Math.max(0, Math.min(1, number));
  }

  /** Pick the first argument that is neither null nor NaN. */
  chooseValue(...args: unknown[]): unknown {
    for (const arg of args) {
      if (arg != null && arg === arg) return arg;
    }
    return args[args.length - 1];
  }

  getBoundingShape(): SvgShape {
    return new SvgShape(this.conversion.precision);
  }

  getBoundingBox(): BBox {
    return this.getBoundingShape().getBoundingBox();
  }

  /** The element's own `transform`. */
  getTransformation(): Matrix | undefined {
    return this.get('transform') as Matrix | undefined;
  }

  /** Apply `transform`, honouring `transform-origin`. */
  transform(): void {
    const matrix = this.appliedTransformation();
    if (matrix) this.conversion.renderer.transform(matrix);
  }

  /**
   * The transformation to apply when drawing: the element's `transform`
   * wrapped around its `transform-origin`, i.e. translate(origin) *
   * transform * translate(-origin).
   */
  appliedTransformation(): Matrix | undefined {
    const transform = this.getTransformation();
    const origin = this.get('transform-origin');
    if (typeof origin !== 'function') return transform;
    const [x, y] = (origin as TransformOriginFn)(this.getVWidth(), this.getVHeight());
    if (!x && !y) return transform;
    return multiplyMatrix([1, 0, 0, 1, x, y], transform as Matrix, [1, 0, 0, 1, -x, -y]);
  }

  /**
   * The box a transparency group has to cover.
   *
   * A form XObject's BBox is interpreted in the group's own coordinate space,
   * and it must satisfy `x0 <= x1` and `y0 <= y1`. Since the group's content
   * is emitted in the SVG user space that the root transform already maps onto
   * the page, the page rectangle covers it directly and is ordered by
   * construction.
   */
  pageBox(): BBox {
    const { width, height } = this.conversion.renderer.pageSize();
    return [0, 0, width, height];
  }

  /* ------------------------------------------------------------------ */
  /* Clipping and masking                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Install the element's clip path as a soft mask, if it has one.
   * Returns whether a clip was installed.
   */
  clip(): boolean {
    const ref = this.get('clip-path');
    if (!(ref instanceof SvgNode)) return false;
    const clipPath = new SvgElemClipPath(ref, null, this.conversion);
    clipPath.useMask(
      clipPath.attr('clipPathUnits') === 'objectBoundingBox' ? this.getBoundingBox() : null,
    );
    return true;
  }

  /** Install the element's mask as a soft mask, if it has one. */
  mask(): boolean {
    const ref = this.get('mask');
    if (!(ref instanceof SvgNode)) return false;
    new SvgElemMask(ref, null, this.conversion).useMask(this.getBoundingBox());
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Paints                                                              */
  /* ------------------------------------------------------------------ */

  getFill(isClip: boolean, isMask: boolean): Paint | undefined {
    const opacity = this.get('opacity') as number;
    const fillOpacity = this.get('fill-opacity') as number;
    if (isClip) {
      const color = toColor(this.conversion.defaultColors.white);
      return color ? { type: 'color', color } : undefined;
    }
    if (!opacity || !fillOpacity) return undefined;
    return this.resolvePaint(this.get('fill', 'fill') as PaintValue, fillOpacity * opacity, isMask);
  }

  getStroke(isClip: boolean, isMask: boolean): Paint | undefined {
    const opacity = this.get('opacity') as number;
    const strokeOpacity = this.get('stroke-opacity') as number;
    if (isClip || isEqual(this.get('stroke-width') as number, 0)) return undefined;
    if (!opacity || !strokeOpacity) return undefined;
    return this.resolvePaint(
      this.get('stroke', 'stroke') as PaintValue,
      strokeOpacity * opacity,
      isMask,
    );
  }

  /**
   * Turn a `fill`/`stroke` value into a {@link Paint}, resolving paint servers
   * against the element's bounding box.
   */
  private resolvePaint(value: PaintValue, opacity: number, isMask: boolean): Paint | undefined {
    if (value === 'none' || value == null) return undefined;
    if (typeof value === 'object' && 'getPaint' in value) {
      const result = value.getPaint(this.getBoundingBox(), opacity, false, isMask);
      if (!result) return undefined;
      const [server, serverOpacity] = result;
      const concrete = server?.concrete;
      if (!concrete) return undefined;
      return concrete.type === 'gradient'
        ? {
            type: 'gradient',
            gradient: concrete.gradient as GradientSpec,
            opacity: serverOpacity,
          }
        : {
            type: 'pattern',
            pattern: concrete.pattern as PatternSpec,
            opacity: serverOpacity,
          };
    }
    const color = toColor(opacityToColor(value as ParsedColor, opacity, isMask));
    return color ? { type: 'color', color } : undefined;
  }
}

type ElementCtor = new (obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) => SvgElem;

/** Instantiate the element class matching the node name. */
export function createElement(
  obj: SvgNode,
  inherits: SvgElem | null,
  conversion: Conversion,
): SvgElem {
  // `<a>` behaves as a group outside text and as a tspan inside it.
  if (obj.nodeName === 'a') {
    return inherits && inherits.isText
      ? new SvgElemTextLink(obj, inherits, conversion)
      : new SvgElemLink(obj, inherits, conversion);
  }
  const ctor = ELEMENT_TYPES[obj.nodeName ?? ''];
  return ctor ? new ctor(obj, inherits, conversion) : new SvgElem(obj, inherits, conversion);
}

/* -------------------------------------------------------------------------- */
/* Containers                                                                  */
/* -------------------------------------------------------------------------- */

/** Elements with children and no geometry of their own. */
export class SvgElemHasChildren extends SvgElem {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.allowedChildren = [
      'use',
      'g',
      'a',
      'svg',
      'image',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
      'path',
      'text',
    ];
  }

  getBoundingShape(): SvgShape {
    const shape = new SvgShape(this.conversion.precision);
    for (const child of this.getChildren()) {
      if (child.get('display') !== 'none') {
        const childShape = child.getBoundingShape().clone();
        const transformation = child.appliedTransformation();
        if (transformation) childShape.transform(transformation);
        shape.mergeShape(childShape);
      }
    }
    return shape;
  }

  drawChildren(isClip: boolean, isMask: boolean): void {
    for (const child of this.getChildren()) {
      if (child.get('display') !== 'none') {
        const drawable = child as { drawInDocument?(c: boolean, m: boolean): void };
        drawable.drawInDocument?.(isClip, isMask);
      }
    }
  }
}

/** Elements that establish a new coordinate system and may form a group. */
export class SvgElemContainer extends SvgElemHasChildren {
  drawContent(isClip: boolean, isMask: boolean, blendMode?: string): void {
    const renderer = this.conversion.renderer;
    this.transform();
    const clipped = this.clip();
    const masked = this.mask();
    const needsGroup = (this.get('opacity') as number) < 1 || clipped || masked || blendMode;
    let group: GroupHandle | undefined;
    if (needsGroup && !isClip) {
      group = renderer.beginGroup(this.pageBox());
    }
    this.drawChildren(isClip, isMask);
    if (group) {
      const finished = renderer.endGroup(group);
      if (blendMode) renderer.applyBlendMode(blendMode);
      renderer.setFillOpacity(this.get('opacity') as number);
      renderer.insertGroup(finished);
    }
  }

  drawInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    renderer.save();
    const style = this.resolver.style['mix-blend-mode'];
    const blendMode = style ? BLEND_MODES[style.trim().toLowerCase()] : undefined;
    this.drawContent(isClip, isMask, blendMode);
    renderer.restore();
  }
}

export class SvgElemUse extends SvgElemContainer {
  private readonly x: number;
  private readonly y: number;
  private readonly child: SvgElem | null;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.x = this.getLength('x', this.getVWidth(), 0);
    this.y = this.getLength('y', this.getVHeight(), 0);
    const ref = this.getUrl('href') ?? this.getUrl('xlink:href');
    this.child = ref ? createElement(ref, this, conversion) : null;
  }

  getChildren(): SvgElem[] {
    return this.child ? [this.child] : [];
  }

  drawInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    renderer.save();
    this.drawContent(isClip, isMask);
    renderer.restore();
  }

  getTransformation(): Matrix | undefined {
    return multiplyMatrix(this.get('transform') as Matrix, [1, 0, 0, 1, this.x, this.y]);
  }
}

export class SvgElemSymbol extends SvgElemContainer {
  protected width: number;
  protected height: number;
  protected aspectRatio: string;
  protected viewBox: number[];

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.width = this.getLength('width', this.getParentVWidth(), this.getParentVWidth());
    this.height = this.getLength('height', this.getParentVHeight(), this.getParentVHeight());
    if (inherits instanceof SvgElemUse) {
      this.width = inherits.getLength('width', inherits.getParentVWidth(), this.width);
      this.height = inherits.getLength('height', inherits.getParentVHeight(), this.height);
    }
    this.aspectRatio = (this.attr('preserveAspectRatio') || '').trim();
    this.viewBox = this.getViewbox('viewBox', [0, 0, this.width, this.height]);
  }

  getVWidth(): number {
    return this.viewBox[2];
  }

  getVHeight(): number {
    return this.viewBox[3];
  }

  drawInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    renderer.save();
    this.drawContent(isClip, isMask);
    renderer.restore();
  }

  getTransformation(): Matrix | undefined {
    return multiplyMatrix(
      parseAspectRatio(
        this.aspectRatio,
        this.width,
        this.height,
        this.viewBox[2],
        this.viewBox[3],
        0,
      ),
      [1, 0, 0, 1, -this.viewBox[0], -this.viewBox[1]],
    );
  }
}

export class SvgElemGroup extends SvgElemContainer {
  link: string | null = null;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
  }

  drawInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    renderer.save();
    if (this.link && !isClip && !isMask) this.addLink();
    let blendMode: string | undefined;
    const style = this.resolver.style['mix-blend-mode'];
    if (style) blendMode = BLEND_MODES[style.trim().toLowerCase()];
    this.drawContent(isClip, isMask, blendMode);
    renderer.restore();
  }

  /** Add a link annotation covering this group's bounds. */
  addLink(): void {
    const link = this.link!;
    if (!link.match(/^(?:[a-z][a-z0-9+.-]*:|\/\/)?/i)) return;
    if (!this.getChildren().length) return;
    const bbox = this.getBoundingShape().transform(this.globalMatrix()).getBoundingBox();
    this.conversion.renderer.addLink(bbox, link);
  }

  /** The current transform combined with every enclosing group's. */
  globalMatrix(): Matrix {
    return multiplyMatrix(
      ...[this.inherits as SvgElemContainer | null, this].map((elem) =>
        elem ? (elem.getTransformation() as Matrix) : IDENTITY,
      ),
    );
  }
}

/** `<a>` outside text: a group that also carries a link. */
export class SvgElemLink extends SvgElemGroup {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.link = this.attr('href') || this.attr('xlink:href');
  }
}

export class SvgElemSvg extends SvgElemContainer {
  private width: number;
  private height: number;
  private x: number;
  private y: number;
  private aspectRatio: string;
  private viewBox: number[];

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.width = this.getLength('width', this.getParentVWidth(), this.getParentVWidth());
    this.height = this.getLength('height', this.getParentVHeight(), this.getParentVHeight());
    this.x = this.getLength('x', this.getParentVWidth(), 0);
    this.y = this.getLength('y', this.getParentVHeight(), 0);
    if (inherits instanceof SvgElemUse) {
      this.width = inherits.getLength('width', inherits.getParentVWidth(), this.width);
      this.height = inherits.getLength('height', inherits.getParentVHeight(), this.height);
    }
    this.aspectRatio = this.attr('preserveAspectRatio') ?? '';
    this.viewBox = this.getViewbox('viewBox', [0, 0, this.width, this.height]);
    if (this.isOuterElement && conversion.preserveAspectRatio) {
      this.x = this.y = 0;
      this.width = conversion.viewportWidth;
      this.height = conversion.viewportHeight;
      this.aspectRatio = conversion.preserveAspectRatio;
    }
  }

  getVWidth(): number {
    return this.viewBox[2];
  }

  getVHeight(): number {
    return this.viewBox[3];
  }

  drawInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    renderer.save();
    if (this.get('overflow') === 'hidden') {
      new SvgShape(this.conversion.precision)
        .M(this.x, this.y)
        .L(this.x + this.width, this.y)
        .L(this.x + this.width, this.y + this.height)
        .L(this.x, this.y + this.height)
        .Z()
        .transform(this.get('transform') as Matrix)
        .insertInDocument(renderer);
      renderer.clip('nonzero');
    }
    this.drawContent(isClip, isMask);
    renderer.restore();
  }

  getTransformation(): Matrix | undefined {
    return multiplyMatrix(
      this.get('transform') as Matrix,
      [1, 0, 0, 1, this.x, this.y],
      parseAspectRatio(
        this.aspectRatio,
        this.width,
        this.height,
        this.viewBox[2],
        this.viewBox[3],
        0,
      ),
      [1, 0, 0, 1, -this.viewBox[0], -this.viewBox[1]],
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Images                                                                      */
/* -------------------------------------------------------------------------- */

export class SvgElemImage extends SvgElem {
  private readonly x: number;
  private readonly y: number;
  private width: number;
  private height: number;
  private readonly image;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    const renderer = conversion.renderer;
    const link = renderer.resolveImageLink(this.attr('href') || this.attr('xlink:href') || '');
    this.x = this.getLength('x', this.getVWidth(), 0);
    this.y = this.getLength('y', this.getVHeight(), 0);
    this.width = this.getLength('width', this.getVWidth(), 0);
    this.height = this.getLength('height', this.getVHeight(), 0);
    this.image = renderer.loadImage(link);
    if (this.image) {
      if (this.width === 0 && this.height !== 0) {
        this.width = (this.height * this.image.width) / this.image.height;
      } else if (this.height === 0 && this.width !== 0) {
        this.height = (this.width * this.image.height) / this.image.width;
      } else if (this.width === 0 && this.height === 0) {
        this.width = this.image.width;
        this.height = this.image.height;
      }
    }
    if (this.width < 0) this.width = 0;
    if (this.height < 0) this.height = 0;
  }

  getTransformation(): Matrix | undefined {
    return this.get('transform') as Matrix | undefined;
  }

  getBoundingShape(): SvgShape {
    return new SvgShape(this.conversion.precision)
      .M(this.x, this.y)
      .L(this.x + this.width, this.y)
      .M(this.x + this.width, this.y + this.height)
      .L(this.x, this.y + this.height);
  }

  drawInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    if (this.get('visibility') === 'hidden' || !this.image) return;
    renderer.save();
    this.transform();
    if (this.get('overflow') === 'hidden') {
      renderer.rect(this.x, this.y, this.width, this.height);
      renderer.clip('nonzero');
    }
    this.clip();
    this.mask();
    renderer.translate(this.x, this.y);
    renderer.transform(
      parseAspectRatio(
        this.attr('preserveAspectRatio'),
        this.width,
        this.height,
        this.image.width,
        this.image.height,
        0,
      ),
    );
    if (!isClip) {
      renderer.setFillOpacity(this.get('opacity') as number);
      renderer.drawImage(this.image, 0, 0, this.image.width, this.image.height);
    } else {
      renderer.rect(0, 0, this.image.width, this.image.height);
      const color = toColor(this.conversion.defaultColors.white);
      if (color) {
        renderer.setFillColor(color);
        renderer.fill('nonzero');
      }
    }
    renderer.restore();
  }
}

/* -------------------------------------------------------------------------- */
/* Paint servers                                                               */
/* -------------------------------------------------------------------------- */

export class SvgElemPattern extends SvgElemHasChildren implements PaintServer {
  /** The pattern as drawable content, once `getPaint` has run. */
  concrete?: { type: 'pattern'; pattern: PatternSpec };

  private readonly ref: SvgElemPattern | null;
  private readonly baseAttr: (key: string) => string | null;
  private readonly baseGetChildren: () => SvgElem[];

  constructor(
    obj: SvgNode,
    inherits: SvgElem | null,
    fallback: ParsedColor | undefined,
    private readonly conversionRef: Conversion,
  ) {
    super(obj, inherits, conversionRef);
    const target = this.getUrl('href') ?? this.getUrl('xlink:href');
    this.ref =
      target && target.nodeName === obj.nodeName && conversionRef.pushPaintServer(obj)
        ? new SvgElemPattern(target, inherits, fallback, conversionRef)
        : null;
    conversionRef.popPaintServer(obj);

    // Attribute and child lookups fall through to the referenced pattern.
    this.baseAttr = super.attr.bind(this);
    this.attr = (key: string) => {
      const attr = this.baseAttr(key);
      if (attr != null || key === 'href' || key === 'xlink:href') return attr;
      return this.ref ? this.ref.attr(key) : null;
    };
    this.baseGetChildren = super.getChildren.bind(this);
    this.getChildren = () => {
      const children = this.baseGetChildren();
      if (children.length > 0) return children;
      return this.ref ? this.ref.getChildren() : [];
    };
  }

  getVWidth(): number {
    const bBoxUnitsPattern = this.attr('patternUnits') !== 'userSpaceOnUse';
    const width = this.getLength('width', bBoxUnitsPattern ? 1 : this.getParentVWidth(), 0);
    return this.getViewbox('viewBox', [0, 0, width, 0])[2];
  }

  getVHeight(): number {
    const bBoxUnitsPattern = this.attr('patternUnits') !== 'userSpaceOnUse';
    const height = this.getLength('height', bBoxUnitsPattern ? 1 : this.getParentVHeight(), 0);
    return this.getViewbox('viewBox', [0, 0, 0, height])[3];
  }

  getPaint(
    bBox: BBox,
    gOpacity: number,
    isClip: boolean,
    isMask: boolean,
  ): [PaintServer | null, number] {
    const renderer = this.conversion.renderer;
    const bBoxUnitsPattern = this.attr('patternUnits') !== 'userSpaceOnUse';
    const bBoxUnitsContent = this.attr('patternContentUnits') === 'objectBoundingBox';
    let x = this.getLength('x', bBoxUnitsPattern ? 1 : this.getParentVWidth(), 0);
    let y = this.getLength('y', bBoxUnitsPattern ? 1 : this.getParentVHeight(), 0);
    let width = this.getLength('width', bBoxUnitsPattern ? 1 : this.getParentVWidth(), 0);
    let height = this.getLength('height', bBoxUnitsPattern ? 1 : this.getParentVHeight(), 0);

    if (bBoxUnitsContent && !bBoxUnitsPattern) {
      // Use the same units for the pattern and its content.
      x = (x - bBox[0]) / (bBox[2] - bBox[0]) || 0;
      y = (y - bBox[1]) / (bBox[3] - bBox[1]) || 0;
      width = width / (bBox[2] - bBox[0]) || 0;
      height = height / (bBox[3] - bBox[1]) || 0;
    } else if (!bBoxUnitsContent && bBoxUnitsPattern) {
      x = bBox[0] + x * (bBox[2] - bBox[0]);
      y = bBox[1] + y * (bBox[3] - bBox[1]);
      width = width * (bBox[2] - bBox[0]);
      height = height * (bBox[3] - bBox[1]);
    }

    const viewBox = this.getViewbox('viewBox', [0, 0, width, height]);
    const aspectRatioMatrix = multiplyMatrix(
      parseAspectRatio(this.attr('preserveAspectRatio'), width, height, viewBox[2], viewBox[3], 0),
      [1, 0, 0, 1, -viewBox[0], -viewBox[1]],
    );
    let matrix = parseTransform(this.attr('patternTransform'));
    if (bBoxUnitsContent) {
      matrix = multiplyMatrix(
        [bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]],
        matrix as Matrix,
      );
    }
    matrix = multiplyMatrix(matrix as Matrix, [1, 0, 0, 1, x, y]);

    const validatedMatrix = validateMatrix(matrix as Matrix);
    const validatedAspect = validateMatrix(aspectRatioMatrix);
    const validatedWidth = validateNumber(width);
    const validatedHeight = validateNumber(height);
    if (
      !validatedMatrix ||
      !validatedAspect ||
      !isFinite(validatedWidth) ||
      !isFinite(validatedHeight)
    ) {
      return [null, gOpacity];
    }

    const open = renderer.beginGroup(normalizeBox([0, 0, validatedWidth, validatedHeight]));
    renderer.transform(validatedAspect);
    this.drawChildren(isClip, isMask);
    const group = renderer.endGroup(open);
    this.concrete = {
      type: 'pattern',
      pattern: {
        group,
        groupName: renderer.registerGroup(group),
        dx: validatedWidth,
        dy: validatedHeight,
        matrix: validatedMatrix,
      },
    };
    return [this, gOpacity];
  }
}

export class SvgElemGradient extends SvgElem implements PaintServer {
  /** The gradient as drawable content, once `getPaint` has run. */
  concrete?: { type: 'gradient'; gradient: GradientSpec };

  private readonly ref: SvgElemGradient | null;
  private readonly baseAttr: (key: string) => string | null;
  private readonly baseGetChildren: () => SvgElem[];

  constructor(
    obj: SvgNode,
    inherits: SvgElem | null,
    fallback: ParsedColor | undefined,
    conversion: Conversion,
  ) {
    super(obj, inherits, conversion);
    this.allowedChildren = ['stop'];
    const target = this.getUrl('href') ?? this.getUrl('xlink:href');
    this.ref =
      target && target.nodeName === obj.nodeName && conversion.pushPaintServer(obj)
        ? new SvgElemGradient(target, inherits, fallback, conversion)
        : null;
    conversion.popPaintServer(obj);

    this.baseAttr = super.attr.bind(this);
    this.attr = (key: string) => {
      const attr = this.baseAttr(key);
      if (attr != null || key === 'href' || key === 'xlink:href') return attr;
      return this.ref ? this.ref.attr(key) : null;
    };
    this.baseGetChildren = super.getChildren.bind(this);
    this.getChildren = () => {
      const children = this.baseGetChildren();
      if (children.length > 0) return children;
      return this.ref ? this.ref.getChildren() : [];
    };
  }

  getPaint(
    bBox: BBox,
    gOpacity: number,
    isClip: boolean,
    isMask: boolean,
  ): [PaintServer | null, number] {
    void isClip;
    void isMask;
    const children = this.getChildren();
    if (children.length === 0) return [null, 1];

    if (children.length === 1) {
      const stopColor = children[0].get('stop-color');
      if (stopColor === 'none') return [null, 1];
      const color = toColor(
        opacityToColor(
          stopColor as ParsedColor,
          (children[0].get('stop-opacity') as number) * gOpacity,
          false,
        ),
      );
      if (color) {
        this.concrete = { type: 'gradient', gradient: singleColorGradient(color) };
        return [this, 1];
      }
      return [null, 1];
    }

    const bBoxUnits = this.attr('gradientUnits') !== 'userSpaceOnUse';
    let matrix = parseTransform(this.attr('gradientTransform'));
    const spread = this.attr('spreadMethod');
    let nAfter = 0;
    let nBefore = 0;
    let nTotal = 1;
    let x1: number;
    let y1: number;
    let x2: number;
    let y2: number;
    let r1 = 0;
    let r2 = 0;

    if (bBoxUnits) {
      matrix = multiplyMatrix(
        [bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]],
        matrix as Matrix,
      );
    }
    const validated = validateMatrix(matrix as Matrix);
    if (!validated) return [null, gOpacity];

    if (this.name === 'linearGradient') {
      x1 = this.getLength('x1', bBoxUnits ? 1 : this.getVWidth(), 0);
      x2 = this.getLength('x2', bBoxUnits ? 1 : this.getVWidth(), bBoxUnits ? 1 : this.getVWidth());
      y1 = this.getLength('y1', bBoxUnits ? 1 : this.getVHeight(), 0);
      // Per spec the default gradient vector is horizontal.
      y2 = this.getLength('y2', bBoxUnits ? 1 : this.getVHeight(), 0);
    } else {
      x2 = this.getLength(
        'cx',
        bBoxUnits ? 1 : this.getVWidth(),
        bBoxUnits ? 0.5 : 0.5 * this.getVWidth(),
      );
      y2 = this.getLength(
        'cy',
        bBoxUnits ? 1 : this.getVHeight(),
        bBoxUnits ? 0.5 : 0.5 * this.getVHeight(),
      );
      r2 = this.getLength(
        'r',
        bBoxUnits ? 1 : this.getViewport(),
        bBoxUnits ? 0.5 : 0.5 * this.getViewport(),
      );
      x1 = this.getLength('fx', bBoxUnits ? 1 : this.getVWidth(), x2);
      y1 = this.getLength('fy', bBoxUnits ? 1 : this.getVHeight(), y2);
      if (r2 < 0) {
        this.conversion.warn('SvgElemGradient: negative r value');
        return [null, gOpacity];
      }
      const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      let multiplier = 1;
      if (d > r2) {
        // Per spec, pull the focus point inside the gradient circle.
        multiplier = r2 / d;
        x1 = x2 + (x1 - x2) * multiplier;
        y1 = y2 + (y1 - y2) * multiplier;
      }
      r2 = Math.max(r2, d * multiplier * (1 + 1e-6));
    }
    x1 = validateNumber(x1);
    y1 = validateNumber(y1);
    x2 = validateNumber(x2);
    y2 = validateNumber(y2);

    if (spread === 'reflect' || spread === 'repeat') {
      // Repeat the gradient enough times to cover the bounding box.
      const inv = inverseMatrix(validated);
      const corner1 = transformPoint([bBox[0], bBox[1]], inv);
      const corner2 = transformPoint([bBox[2], bBox[1]], inv);
      const corner3 = transformPoint([bBox[2], bBox[3]], inv);
      const corner4 = transformPoint([bBox[0], bBox[3]], inv);
      const corners = [corner1, corner2, corner3, corner4];
      if (this.name === 'linearGradient') {
        const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        nAfter =
          Math.max(...corners.map((c) => (c[0] - x2) * (x2 - x1) + (c[1] - y2) * (y2 - y1))) /
          lengthSquared;
        nBefore =
          Math.max(...corners.map((c) => (c[0] - x1) * (x1 - x2) + (c[1] - y1) * (y1 - y2))) /
          lengthSquared;
      } else {
        nAfter =
          Math.sqrt(Math.max(...corners.map((c) => (c[0] - x2) ** 2 + (c[1] - y2) ** 2))) / r2 - 1;
      }
      // Add a little margin because the stroke can extend past the bbox.
      nAfter = Math.ceil(nAfter + 0.5);
      nBefore = Math.ceil(nBefore + 0.5);
      nTotal = nBefore + 1 + nAfter;
    }

    const stops: GradientSpec['stops'] = [];
    for (let n = 0; n < nTotal; n++) {
      const inOrder = spread !== 'reflect' || (n - nBefore) % 2 === 0;
      let offset = 0;
      for (let i = 0; i < children.length; i++) {
        const child = children[inOrder ? i : children.length - 1 - i];
        let stopColor = child.get('stop-color');
        if (stopColor === 'none') {
          stopColor = this.conversion.defaultColors.transparent;
        }
        const color = toColor(
          opacityToColor(
            stopColor as ParsedColor,
            (child.get('stop-opacity') as number) * gOpacity,
            false,
          ),
        );
        if (!color) continue;
        const components = color.components;
        offset = Math.max(
          offset,
          inOrder
            ? (child.getPercent('offset', 0) as number)
            : 1 - (child.getPercent('offset', 0) as number),
        );
        const componentList: number[] =
          color.space === 'rgb' ? components.map((v) => v * 255) : components;
        const denom = nAfter + nBefore + 1;
        if (i === 0 && offset > 0) {
          stops.push({ offset: n / nTotal, color: componentList, opacity: color.alpha });
        }
        stops.push({
          offset: (n + offset) / denom,
          color: componentList,
          opacity: color.alpha,
        });
        if (i === children.length - 1 && offset < 1) {
          stops.push({
            offset: (n + 1) / nTotal,
            color: componentList,
            opacity: color.alpha,
          });
        }
      }
    }

    this.concrete = {
      type: 'gradient',
      gradient: {
        type: this.name === 'linearGradient' ? 'linear' : 'radial',
        x1: this.name === 'linearGradient' ? x1 - nBefore * (x2 - x1) : x1,
        y1: this.name === 'linearGradient' ? y1 - nBefore * (y2 - y1) : y1,
        x2: this.name === 'linearGradient' ? x2 + nAfter * (x2 - x1) : x2,
        y2: this.name === 'linearGradient' ? y2 + nAfter * (y2 - y1) : y2,
        r1: 0,
        r2: this.name === 'linearGradient' ? 0 : r2 + nAfter * r2,
        matrix: validated,
        stops,
      },
    };
    return [this, 1];
  }
}

/** A degenerate gradient that paints one flat color. */
function singleColorGradient(color: ResolvedColor): GradientSpec {
  const components: number[] =
    color.space === 'rgb' ? color.components.map((v) => v * 255) : color.components;
  return {
    type: 'linear',
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 0,
    r1: 0,
    r2: 0,
    matrix: IDENTITY,
    stops: [{ offset: 0, color: components, opacity: color.alpha }],
  };
}

/* -------------------------------------------------------------------------- */
/* Basic shapes                                                                */
/* -------------------------------------------------------------------------- */

export class SvgElemBasicShape extends SvgElem {
  shape: SvgShape | null = null;
  dashScale = 1;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
  }

  getBoundingShape(): SvgShape {
    return this.shape ?? new SvgShape(this.conversion.precision);
  }

  drawInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    if (this.get('visibility') === 'hidden' || !this.shape) return;

    renderer.save();
    if (this.get('vector-effect') === 'non-scaling-stroke') {
      this.shape.transform(this.appliedTransformation() as Matrix);
    } else {
      this.transform();
    }
    this.clip();

    if (!isClip) {
      let group: GroupHandle | undefined;
      if (this.mask()) {
        group = renderer.beginGroup(this.pageBox());
      }
      const subPaths = this.shape.getSubPaths();
      const fill = this.getFill(isClip, isMask);
      const stroke = this.getStroke(isClip, isMask);
      let lineWidth = this.get('stroke-width') as number;
      const lineCap = this.get('stroke-linecap') as 'butt' | 'round' | 'square';

      if (this.get('vector-effect') === 'non-scaling-stroke') {
        lineWidth = lineWidth / this.pageScale();
      }

      if (fill || stroke) {
        if (fill) this.applyFillPaint(fill);
        if (stroke) {
          // Dots for zero-length sub-paths, honouring the line cap.
          for (const subPath of subPaths) {
            if (!isEqual(subPath.totalLength, 0)) continue;
            if (lineCap !== 'square' && lineCap !== 'round') continue;
            if (lineWidth <= 0) continue;
            const start = subPath.startPoint;
            if (!start || start.length < 2) continue;
            const [x, y] = start;
            this.applyFillPaint(stroke);
            if (lineCap === 'square') {
              renderer.rect(x - 0.5 * lineWidth, y - 0.5 * lineWidth, lineWidth, lineWidth);
            } else {
              renderer.circle(x, y, 0.5 * lineWidth);
            }
            renderer.fill('nonzero');
          }
          let dashArray = (this.get('stroke-dasharray') as number[]).slice();
          let dashOffset = this.get('stroke-dashoffset') as number;
          if (isNotEqual(this.dashScale, 1)) {
            for (let j = 0; j < dashArray.length; j++) dashArray[j] *= this.dashScale;
            dashOffset *= this.dashScale;
          }
          this.applyStrokePaint(stroke);
          renderer.setLineWidth(lineWidth);
          renderer.setMiterLimit(this.get('stroke-miterlimit') as number);
          renderer.setLineJoin(this.get('stroke-linejoin') as 'miter' | 'round' | 'bevel');
          renderer.setLineCap(lineCap);
          this.applyDash(dashArray, dashOffset);
        }
        for (const subPath of subPaths) {
          if (subPath.totalLength > 0) subPath.insertInDocument(renderer);
        }
        if (fill && stroke) {
          renderer.fillAndStroke(this.get('fill-rule') as FillRule);
        } else if (fill) {
          renderer.fill(this.get('fill-rule') as FillRule);
        } else {
          renderer.stroke();
        }
      }

      this.drawMarkers(isMask, lineWidth);
      if (group) {
        renderer.insertGroup(renderer.endGroup(group));
      }
    } else {
      this.shape.insertInDocument(renderer);
      const color = toColor(this.conversion.defaultColors.white);
      if (color) {
        renderer.setFillColor(color);
        renderer.fill(this.get('clip-rule') as FillRule);
      }
    }
    renderer.restore();
  }

  /** Draw `marker-start`, `marker-mid` and `marker-end`. */
  private drawMarkers(isMask: boolean, lineWidth: number): void {
    const markerStart = this.get('marker-start');
    const markerMid = this.get('marker-mid');
    const markerEnd = this.get('marker-end');
    if (markerStart === 'none' && markerMid === 'none' && markerEnd === 'none') return;

    const positions = this.shape!.getMarkers();
    const draw = (ref: SvgNode, index: number, isStart: boolean): void => {
      const marker = new SvgElemMarker(ref, null, this.conversion);
      marker.drawMarker(false, isMask, positions[index], lineWidth, isStart);
    };
    if (markerStart !== 'none' && positions.length > 0 && markerStart instanceof SvgNode) {
      draw(markerStart, 0, true);
    }
    if (markerMid !== 'none' && markerMid instanceof SvgNode) {
      for (let i = 1; i < positions.length - 1; i++) draw(markerMid, i, false);
    }
    if (markerEnd !== 'none' && positions.length > 0 && markerEnd instanceof SvgNode) {
      draw(markerEnd, positions.length - 1, false);
    }
  }

  private applyFillPaint(paint: Paint): void {
    const renderer = this.conversion.renderer;
    if (paint.type === 'color') {
      renderer.setFillColor(paint.color);
    } else if (paint.type === 'gradient') {
      renderer.setFillOpacity(paint.opacity);
      renderer.setFillGradient(paint.gradient);
    } else {
      renderer.setFillOpacity(paint.opacity);
      renderer.setPattern(paint.pattern, false);
    }
  }

  private applyStrokePaint(paint: Paint): void {
    const renderer = this.conversion.renderer;
    if (paint.type === 'color') {
      renderer.setStrokeColor(paint.color);
    } else if (paint.type === 'gradient') {
      renderer.setStrokeOpacity(paint.opacity);
      renderer.setStrokeGradient(paint.gradient);
    } else {
      renderer.setStrokeOpacity(paint.opacity);
      renderer.setPattern(paint.pattern, true);
    }
  }

  /**
   * Fix up a dash pattern that a PDF viewer cannot express, by merging zero
   * length elements and normalizing the offset.
   */
  private applyDash(dashArray: number[], dashOffset: number): void {
    let array = dashArray.slice();
    let offset = dashOffset;

    if (array[0] === 0 && array[1] === 0) {
      // All-zero dash pattern: draw a solid line by clearing the pattern.
      array = [];
    } else {
      if (array[0] === 0) {
        // Merge the first space into the last and drop both.
        offset -= array[1];
        array[array.length - 1] += array[1];
        array = array.slice(2);
      }
      if (array[array.length - 1] === 0) {
        // Merge the last dash into the first and drop both.
        offset += array[array.length - 2];
        array[0] += array[array.length - 2];
        array = array.slice(0, -2);
      }
    }

    // Keep the offset non-negative; see crbug.com/660850.
    let length = 0;
    for (const value of array) length += value;
    if (length > 0) {
      while (offset < 0) offset += length;
    }
    this.conversion.renderer.setDash(array, offset);
  }

  /** Uniform scale from the root viewport to PDF units. */
  private pageScale(): number {
    return this.conversion.pxToPt;
  }
}

export class SvgElemRect extends SvgElemBasicShape {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    const x = this.getLength('x', this.getVWidth(), 0);
    const y = this.getLength('y', this.getVHeight(), 0);
    const w = this.getLength('width', this.getVWidth(), 0);
    const h = this.getLength('height', this.getVHeight(), 0);
    let rx = this.computeLength(this.attr('rx'), this.getVWidth(), undefined);
    let ry = this.computeLength(this.attr('ry'), this.getVHeight(), undefined);
    if (rx === undefined && ry === undefined) {
      rx = ry = 0;
    } else if (rx === undefined) {
      rx = ry;
    } else if (ry === undefined) {
      ry = rx;
    }
    if (w > 0 && h > 0) {
      const shape = new SvgShape(this.conversion.precision);
      if (rx && ry) {
        rx = Math.min(rx, 0.5 * w);
        ry = Math.min(ry, 0.5 * h);
        shape
          .M(x + rx, y)
          .L(x + w - rx, y)
          .A(rx, ry, 0, 0, 1, x + w, y + ry)
          .L(x + w, y + h - ry)
          .A(rx, ry, 0, 0, 1, x + w - rx, y + h)
          .L(x + rx, y + h)
          .A(rx, ry, 0, 0, 1, x, y + h - ry)
          .L(x, y + ry)
          .A(rx, ry, 0, 0, 1, x + rx, y)
          .Z();
      } else {
        shape
          .M(x, y)
          .L(x + w, y)
          .L(x + w, y + h)
          .L(x, y + h)
          .Z();
      }
      this.shape = shape;
    } else {
      this.shape = new SvgShape(this.conversion.precision);
    }
  }
}

export class SvgElemCircle extends SvgElemBasicShape {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    const cx = this.getLength('cx', this.getVWidth(), 0);
    const cy = this.getLength('cy', this.getVHeight(), 0);
    const r = this.getLength('r', this.getViewport(), 0);
    this.shape =
      r > 0
        ? new SvgShape(this.conversion.precision)
            .M(cx + r, cy)
            .A(r, r, 0, 0, 1, cx - r, cy)
            .A(r, r, 0, 0, 1, cx + r, cy)
            .Z()
        : new SvgShape(this.conversion.precision);
  }
}

export class SvgElemEllipse extends SvgElemBasicShape {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    const cx = this.getLength('cx', this.getVWidth(), 0);
    const cy = this.getLength('cy', this.getVHeight(), 0);
    const rx = this.getLength('rx', this.getVWidth(), 0);
    const ry = this.getLength('ry', this.getVHeight(), 0);
    this.shape =
      rx > 0 && ry > 0
        ? new SvgShape(this.conversion.precision)
            .M(cx + rx, cy)
            .A(rx, ry, 0, 0, 1, cx - rx, cy)
            .A(rx, ry, 0, 0, 1, cx + rx, cy)
            .Z()
        : new SvgShape(this.conversion.precision);
  }
}

export class SvgElemLine extends SvgElemBasicShape {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    const x1 = this.getLength('x1', this.getVWidth(), 0);
    const y1 = this.getLength('y1', this.getVHeight(), 0);
    const x2 = this.getLength('x2', this.getVWidth(), 0);
    const y2 = this.getLength('y2', this.getVHeight(), 0);
    this.shape = new SvgShape(this.conversion.precision).M(x1, y1).L(x2, y2);
  }
}

/** Shared implementation of `<polyline>` and `<polygon>`. */
class SvgElemPolyPoints extends SvgElemBasicShape {
  protected constructor(
    obj: SvgNode,
    inherits: SvgElem | null,
    conversion: Conversion,
    closed: boolean,
    label: string,
  ) {
    super(obj, inherits, conversion);
    const points = this.getNumberList('points');
    const shape = new SvgShape(this.conversion.precision);
    for (let i = 0; i < points.length - 1; i += 2) {
      if (i === 0) shape.M(points[i], points[i + 1]);
      else shape.L(points[i], points[i + 1]);
    }
    if (closed) shape.Z();
    if (points.error) {
      conversion.warn(`${label}: unexpected string ${points.error}`);
    }
    if (points.length % 2 === 1) {
      conversion.warn(`${label}: uneven number of coordinates`);
    }
    this.shape = shape;
  }
}

export class SvgElemPolyline extends SvgElemPolyPoints {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion, false, 'SvgElemPolyline');
  }
}

export class SvgElemPolygon extends SvgElemPolyPoints {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion, true, 'SvgElemPolygon');
  }
}

export class SvgElemPath extends SvgElemBasicShape {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    const shape = new SvgShape(this.conversion.precision).path(this.attr('d') ?? '', (message) =>
      conversion.warn(message),
    );
    this.shape = shape;
    const pathLength = this.getLength('pathLength', this.getViewport());
    this.dashScale = pathLength > 0 ? shape.totalLength / pathLength : 1;
  }
}

/* -------------------------------------------------------------------------- */
/* Markers, clip paths and masks                                               */
/* -------------------------------------------------------------------------- */

export class SvgElemMarker extends SvgElemHasChildren {
  private width: number;
  private height: number;
  private viewBox: number[];

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.width = this.getLength('markerWidth', this.getParentVWidth(), 3);
    this.height = this.getLength('markerHeight', this.getParentVHeight(), 3);
    this.viewBox = this.getViewbox('viewBox', [0, 0, this.width, this.height]);
  }

  getVWidth(): number {
    return this.viewBox[2];
  }

  getVHeight(): number {
    return this.viewBox[3];
  }

  /** Draw the marker at a position and tangent angle. */
  drawMarker(
    isClip: boolean,
    isMask: boolean,
    posArray: [number, number, number],
    strokeWidth: number,
    isStart = false,
  ): void {
    const renderer = this.conversion.renderer;
    renderer.save();
    const orient = this.attr('orient');
    const units = this.attr('markerUnits');
    let rotate =
      orient === 'auto' || orient === 'auto-start-reverse'
        ? posArray[2]
        : ((parseFloat(orient ?? '') || 0) * Math.PI) / 180;
    const scale = units === 'userSpaceOnUse' ? 1 : strokeWidth;
    if (orient === 'auto-start-reverse' && isStart) rotate += Math.PI;
    renderer.transform([
      Math.cos(rotate) * scale,
      Math.sin(rotate) * scale,
      -Math.sin(rotate) * scale,
      Math.cos(rotate) * scale,
      posArray[0],
      posArray[1],
    ]);

    const refX = this.getLength('refX', this.getVWidth(), 0);
    const refY = this.getLength('refY', this.getVHeight(), 0);
    const aspectRatioMatrix = parseAspectRatio(
      this.attr('preserveAspectRatio'),
      this.width,
      this.height,
      this.viewBox[2],
      this.viewBox[3],
      0.5,
    );
    if (this.get('overflow') === 'hidden') {
      renderer.rect(
        aspectRatioMatrix[0] * (this.viewBox[0] + this.viewBox[2] / 2 - refX) - this.width / 2,
        aspectRatioMatrix[3] * (this.viewBox[1] + this.viewBox[3] / 2 - refY) - this.height / 2,
        this.width,
        this.height,
      );
      renderer.clip('nonzero');
    }
    renderer.transform(aspectRatioMatrix);
    renderer.translate(-refX, -refY);

    let group: GroupHandle | undefined;
    if ((this.get('opacity') as number) < 1 && !isClip) {
      group = renderer.beginGroup(this.pageBox());
    }
    this.drawChildren(isClip, isMask);
    if (group) {
      renderer.setFillOpacity(this.get('opacity') as number);
      renderer.insertGroup(renderer.endGroup(group));
    }
    renderer.restore();
  }
}

export class SvgElemClipPath extends SvgElemHasChildren {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
  }

  /** Render the clip path into a soft mask and apply it. */
  useMask(bBox: BBox | null): void {
    const renderer = this.conversion.renderer;
    const open = renderer.beginGroup(this.pageBox());
    renderer.save();
    const transform = this.get('transform') as Matrix;
    renderer.transform(transform);
    if (this.attr('clipPathUnits') === 'objectBoundingBox' && bBox) {
      renderer.transform([bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]]);
    }
    this.clip();
    this.drawChildren(true, false);
    renderer.restore();
    renderer.applyMask(renderer.endGroup(open), 'luminance', [0, 0, 0]);
  }
}

export class SvgElemMask extends SvgElemHasChildren {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
  }

  useMask(bBox: BBox): void {
    const renderer = this.conversion.renderer;
    const open = renderer.beginGroup(this.pageBox());
    renderer.save();
    let x: number;
    let y: number;
    let w: number;
    let h: number;
    if (this.attr('maskUnits') === 'userSpaceOnUse') {
      x = this.getLength('x', this.getVWidth(), -0.1 * (bBox[2] - bBox[0]) + bBox[0]);
      y = this.getLength('y', this.getVHeight(), -0.1 * (bBox[3] - bBox[1]) + bBox[1]);
      w = this.getLength('width', this.getVWidth(), 1.2 * (bBox[2] - bBox[0]));
      h = this.getLength('height', this.getVHeight(), 1.2 * (bBox[3] - bBox[1]));
    } else {
      x = this.getLength('x', this.getVWidth(), -0.1) * (bBox[2] - bBox[0]) + bBox[0];
      y = this.getLength('y', this.getVHeight(), -0.1) * (bBox[3] - bBox[1]) + bBox[1];
      w = this.getLength('width', this.getVWidth(), 1.2) * (bBox[2] - bBox[0]);
      h = this.getLength('height', this.getVHeight(), 1.2) * (bBox[3] - bBox[1]);
    }
    // The mask region bounds the mask: content outside it does not contribute,
    // so it is clipped away. The region is in the referring element's user
    // space, i.e. before the maskContentUnits transform.
    renderer.rect(x, y, w, h);
    renderer.clip('nonzero');
    if (this.attr('maskContentUnits') === 'objectBoundingBox') {
      renderer.transform([bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]]);
    }
    this.clip();
    this.drawChildren(false, true);
    renderer.restore();
    const group = renderer.endGroup(open);

    const maskType = this.resolver.style['mask-type'] || this.attr('mask-type') || 'luminance';
    renderer.applyMask(group, maskType === 'alpha' ? 'alpha' : 'luminance', [0, 0, 0]);
  }
}

/* -------------------------------------------------------------------------- */
/* Text                                                                        */
/* -------------------------------------------------------------------------- */

/** A font selection with the metrics layout needs. */
interface TextFont {
  font: PdfFont;
  size: number;
  fauxItalic: boolean;
  fauxBold: boolean;
}

export class SvgElemTextNode extends SvgElem {
  readonly textContent: string;
  /** Glyph positions assigned during layout. */
  _posRef: GlyphPlacement[] | null = null;
  /** Font selection inherited from the owning text element. */
  textFont: TextFont | null = null;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.textContent = obj.nodeValue ?? '';
  }
}

export class SvgElemTextContainer extends SvgElem {
  override readonly isText = true;
  _pos: GlyphPlacement[] = [];
  _font: TextFont | null = null;

  /** Per-character positioning attributes, indexed by glyph. */
  _x: number[] = [];
  _y: number[] = [];
  _dx: number[] = [];
  _dy: number[] = [];
  _rot: number[] = [];
  _defRot = 0;
  _index = 0;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.allowedChildren = ['tspan', '#text', '#cdata-section', 'a'];
  }

  getBoundingShape(): SvgShape {
    const shape = new SvgShape(this.conversion.precision);
    for (const pos of this._pos) {
      if (pos.hidden) continue;
      const dx0 = pos.ascent * Math.sin(pos.rotate);
      const dy0 = -pos.ascent * Math.cos(pos.rotate);
      const dx1 = pos.descent * Math.sin(pos.rotate);
      const dy1 = -pos.descent * Math.cos(pos.rotate);
      const dx2 = pos.width * Math.cos(pos.rotate);
      const dy2 = pos.width * Math.sin(pos.rotate);
      shape
        .M(pos.x + dx0, pos.y + dy0)
        .L(pos.x + dx0 + dx2, pos.y + dy0 + dy2)
        .M(pos.x + dx1 + dx2, pos.y + dy1 + dy2)
        .L(pos.x + dx1, pos.y + dy1);
    }
    return shape;
  }

  /** Draw the underline / overline / strike-through rules. */
  decorate(lineWidth: number, linePosition: number, isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    const fill = this.getFill(isClip, isMask);
    const stroke = this.getStroke(isClip, isMask);
    if (fill) this.applyFillPaint(fill);
    if (stroke) {
      this.applyStrokePaint(stroke);
      renderer.setLineWidth(this.get('stroke-width') as number);
      renderer.setMiterLimit(this.get('stroke-miterlimit') as number);
      renderer.setLineJoin(this.get('stroke-linejoin') as 'miter' | 'round' | 'bevel');
      renderer.setLineCap(this.get('stroke-linecap') as 'butt' | 'round' | 'square');
      renderer.setDash(
        this.get('stroke-dasharray') as number[],
        this.get('stroke-dashoffset') as number,
      );
    }
    for (const pos of this._pos) {
      if (pos.hidden) continue;
      const dx0 = (linePosition + lineWidth / 2) * Math.sin(pos.rotate);
      const dy0 = -(linePosition + lineWidth / 2) * Math.cos(pos.rotate);
      const dx1 = (linePosition - lineWidth / 2) * Math.sin(pos.rotate);
      const dy1 = -(linePosition - lineWidth / 2) * Math.cos(pos.rotate);
      const dx2 = pos.width * Math.cos(pos.rotate);
      const dy2 = pos.width * Math.sin(pos.rotate);
      new SvgShape(this.conversion.precision)
        .M(pos.x + dx0, pos.y + dy0)
        .L(pos.x + dx0 + dx2, pos.y + dy0 + dy2)
        .L(pos.x + dx1 + dx2, pos.y + dy1 + dy2)
        .L(pos.x + dx1, pos.y + dy1)
        .Z()
        .insertInDocument(renderer);
      if (fill && stroke) renderer.fillAndStroke('nonzero');
      else if (fill) renderer.fill('nonzero');
      else if (stroke) renderer.stroke();
    }
  }

  protected applyFillPaint(paint: Paint): void {
    const renderer = this.conversion.renderer;
    if (paint.type === 'color') renderer.setFillColor(paint.color);
    else if (paint.type === 'gradient') {
      renderer.setFillOpacity(paint.opacity);
      renderer.setFillGradient(paint.gradient);
    } else {
      renderer.setFillOpacity(paint.opacity);
      renderer.setPattern(paint.pattern, false);
    }
  }

  protected applyStrokePaint(paint: Paint): void {
    const renderer = this.conversion.renderer;
    if (paint.type === 'color') renderer.setStrokeColor(paint.color);
    else if (paint.type === 'gradient') {
      renderer.setStrokeOpacity(paint.opacity);
      renderer.setStrokeGradient(paint.gradient);
    } else {
      renderer.setStrokeOpacity(paint.opacity);
      renderer.setPattern(paint.pattern, true);
    }
  }

  drawTextInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    const font = this._font!;
    const linkOwner = this as unknown as { addLink?(): void };
    if (!isClip && !isMask) linkOwner.addLink?.();
    if (this.get('text-decoration') === 'underline') {
      this.decorate(0.05 * font.size, -0.075 * font.size, isClip, isMask);
    }
    if (this.get('text-decoration') === 'overline') {
      this.decorate(0.05 * font.size, getAscent(font.font) + 0.075 * font.size, isClip, isMask);
    }

    const fill = this.getFill(isClip, isMask);
    let stroke = this.getStroke(isClip, isMask);
    let strokeWidth = this.get('stroke-width') as number;
    if (font.fauxBold) {
      // Approximate bold text by stroking a thin outline.
      if (!stroke) {
        stroke = fill;
        strokeWidth = font.size * 0.03;
      } else {
        strokeWidth += font.size * 0.03;
      }
    }

    for (const child of this.getChildren()) {
      switch (child.name) {
        case 'tspan':
        case 'textPath':
        case 'a':
          if (child.get('display') !== 'none') {
            (child as SvgElemTextContainer).drawTextInDocument(isClip, isMask);
          }
          break;
        case '#text':
        case '#cdata-section': {
          if (this.get('visibility') === 'hidden') break;
          if (!fill && !stroke && !isClip) break;
          if (fill) this.applyFillPaint(fill);
          if (stroke && strokeWidth) {
            this.applyStrokePaint(stroke);
            renderer.setLineWidth(strokeWidth);
            renderer.setMiterLimit(this.get('stroke-miterlimit') as number);
            renderer.setLineJoin(this.get('stroke-linejoin') as 'miter' | 'round' | 'bevel');
            renderer.setLineCap(this.get('stroke-linecap') as 'butt' | 'round' | 'square');
            renderer.setDash(
              this.get('stroke-dasharray') as number[],
              this.get('stroke-dashoffset') as number,
            );
          }
          this.showGlyphs((child as SvgElemTextNode)._posRef ?? [], font, !!fill, !!stroke);
          break;
        }
      }
    }

    if (this.get('text-decoration') === 'line-through') {
      this.decorate(
        0.05 * font.size,
        0.5 * (getAscent(font.font) + getDescent(font.font)),
        isClip,
        isMask,
      );
    }
  }

  /**
   * Emit the glyph runs of one text node.
   *
   * Consecutive glyphs share a single text matrix; a glyph that breaks the
   * run (explicit `x`/`y`, rotation, or spacing) starts a new one.
   */
  private showGlyphs(
    positions: GlyphPlacement[],
    font: TextFont,
    hasFill: boolean,
    hasStroke: boolean,
  ): void {
    const renderer = this.conversion.renderer;
    renderer.beginText(font.font, font.size);
    renderer.setTextMode(hasFill, hasStroke);

    let start = 0;
    while (start < positions.length) {
      let end = start;
      while (end < positions.length && positions[end].continuous && !positions[end].hidden) {
        end++;
      }
      if (end > start) {
        this.showRun(positions.slice(start, end), font);
      } else if (!positions[start].hidden) {
        // A discontinuity needs its own text matrix.
        this.showRun([positions[start]], font);
      }
      start = end === start ? start + 1 : end;
    }
    renderer.endText();
  }

  /** Emit one run of glyphs, using a `TJ` array with kerning adjustments. */
  private showRun(positions: GlyphPlacement[], font: TextFont): void {
    const renderer = this.conversion.renderer;
    const first = positions[0];
    if (!first || first.hidden) return;

    const xScale = first.scale;
    const rotate = first.rotate;
    const sin = Math.sin(rotate);
    const cos = Math.cos(rotate);
    // Faux italic is a horizontal skew of the text matrix.
    const skew = font.fauxItalic ? 0.2 * font.size : 0;
    renderer.setTextMatrix(
      xScale * cos,
      xScale * sin,
      xScale * -sin + skew,
      xScale * cos,
      first.x - skew * sin,
      first.y,
    );

    const glyphHexes: string[] = [];
    const kerns: number[] = [];
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (pos.hidden) continue;
      glyphHexes.push(pos.glyph);
      // The last glyph must not be followed by an adjustment.
      kerns.push(i === positions.length - 1 ? 0 : -pos.kern);
    }
    renderer.showGlyphs(glyphHexes, kerns);
  }
}

export class SvgElemTspan extends SvgElemTextContainer {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
  }
}

/** `<a>` inside text: a tspan that also carries a link. */
export class SvgElemTextLink extends SvgElemTspan {
  private linkTarget: string | null;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.allowedChildren = ['textPath', 'tspan', '#text', '#cdata-section', 'a'];
    this.linkTarget = this.attr('href') || this.attr('xlink:href');
  }

  /** Annotate the covered text with a link. */
  addLink(): void {
    const url = this.linkTarget;
    if (!url || !url.match(/^(?:[a-z][a-z0-9+.-]*:|\/\/)?/i)) return;
    if (!this._pos.length) return;
    const first = this._pos[0];
    const last = this._pos[this._pos.length - 1];
    this.conversion.renderer.addLink(
      [
        first.x,
        Math.min(first.y, last.y) - first.ascent,
        last.x + last.width,
        Math.max(first.y, last.y) + first.descent,
      ],
      url,
    );
  }
}

export class SvgElemTextPath extends SvgElemTextContainer {
  pathObject: SvgShape | null = null;
  pathLength = 0;
  pathScale = 1;

  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    const temp = this.attr('path');
    const ref = this.getUrl('href') ?? this.getUrl('xlink:href');
    if (temp && temp.trim() !== '') {
      const declaredLength = this.getLength('pathLength', this.getViewport());
      this.pathObject = new SvgShape(this.conversion.precision).path(temp, (message) =>
        conversion.warn(message),
      );
      this.pathLength = declaredLength > 0 ? declaredLength : this.pathObject.totalLength;
      this.pathScale = this.pathObject.totalLength / this.pathLength;
    } else if (ref && ref.nodeName === 'path') {
      const pathElem = new SvgElemPath(ref, this, conversion);
      this.pathObject = pathElem.shape!.clone().transform(pathElem.get('transform') as Matrix);
      this.pathLength =
        (this.chooseValue(
          pathElem.dashScale === 1 ? undefined : pathElem.dashScale,
          this.pathObject.totalLength,
        ) as number) ?? this.pathObject.totalLength;
      this.pathScale = this.pathObject.totalLength / this.pathLength;
    }
  }
}

export class SvgElemText extends SvgElemTextContainer {
  constructor(obj: SvgNode, inherits: SvgElem | null, conversion: Conversion) {
    super(obj, inherits, conversion);
    this.allowedChildren = ['textPath', 'tspan', '#text', '#cdata-section', 'a'];
    layoutText(this, conversion);
  }

  drawInDocument(isClip: boolean, isMask: boolean): void {
    const renderer = this.conversion.renderer;
    renderer.save();
    this.transform();
    this.clip();
    let group: GroupHandle | undefined;
    if (this.mask()) {
      const { width, height } = renderer.pageSize();
      group = renderer.beginGroup(this.pageBox());
    }
    this.drawTextInDocument(isClip, isMask);
    if (group) {
      renderer.insertGroup(renderer.endGroup(group));
    }
    renderer.restore();
  }
}

/* -------------------------------------------------------------------------- */
/* Text layout                                                                 */
/* -------------------------------------------------------------------------- */

function getAscent(font: PdfFont): number {
  return font.metrics.ascender / 1000;
}

function getDescent(font: PdfFont): number {
  return font.metrics.descender / 1000;
}

function getXHeight(font: PdfFont): number {
  return font.metrics.xHeight / 1000;
}

/** Resolve the vertical offset implied by `dominant-baseline`. */
function getBaseline(
  font: PdfFont,
  size: number,
  baseline: string,
  shift: string | number,
): number {
  let dy1: number;
  switch (baseline) {
    case 'middle':
      dy1 = 0.5 * getXHeight(font) * size;
      break;
    case 'central':
      dy1 = 0.5 * (getDescent(font) * size + getAscent(font) * size);
      break;
    case 'after-edge':
    case 'text-after-edge':
      dy1 = getDescent(font) * size;
      break;
    case 'alphabetic':
    case 'auto':
    case 'baseline':
      dy1 = 0;
      break;
    case 'mathematical':
      dy1 = 0.5 * getAscent(font) * size;
      break;
    case 'hanging':
      dy1 = 0.8 * getAscent(font) * size;
      break;
    case 'before-edge':
    case 'text-before-edge':
      dy1 = getAscent(font) * size;
      break;
    default:
      dy1 = 0;
      break;
  }
  let dy2: number;
  switch (shift) {
    case 'baseline':
      dy2 = 0;
      break;
    case 'super':
      dy2 = 0.6 * size;
      break;
    case 'sub':
      dy2 = -0.6 * size;
      break;
    default:
      dy2 = shift as number;
      break;
  }
  return dy1 - dy2;
}

/** Lay out the glyph positions of a text element and its children. */
function layoutText(root: SvgElemText, conversion: Conversion): void {
  const renderer = conversion.renderer;
  let processedText = '';
  let remainingText = root.element.textContent;
  let currentChunk: GlyphPlacement[] = [];
  let currentAnchor: string;
  let currentDirection: string;
  let currentX = 0;
  let currentY = 0;
  const textPaths: SvgElemTextPath[] = [];

  const doAnchoring = (): void => {
    if (currentChunk.length) {
      const last = currentChunk[currentChunk.length - 1];
      const first = currentChunk[0];
      const width = last.x + last.width - first.x;
      const anchorDx =
        {
          startltr: 0,
          middleltr: 0.5,
          endltr: 1,
          startrtl: 1,
          middlertl: 0.5,
          endrtl: 0,
        }[`${currentAnchor}${currentDirection}`]! * width || 0;
      for (const glyph of currentChunk) glyph.x -= anchorDx;
    }
    currentChunk = [];
  };

  const adjustLength = (
    positions: GlyphPlacement[],
    length: number,
    spacingAndGlyphs: boolean,
  ): void => {
    const first = positions[0];
    const last = positions[positions.length - 1];
    const startX = first.x;
    const endX = last.x + last.width;
    if (spacingAndGlyphs) {
      const textScale = length / (endX - startX);
      if (textScale > 0 && textScale < Infinity) {
        for (const glyph of positions) {
          glyph.continuous = false;
          glyph.x = startX + textScale * (glyph.x - startX);
          glyph.scale *= textScale;
          glyph.width *= textScale;
        }
      }
    } else if (positions.length >= 2) {
      const spaceDiff = (length - (endX - startX)) / (positions.length - 1);
      for (let j = 0; j < positions.length; j++) {
        positions[j].continuous = false;
        positions[j].x += j * spaceDiff;
      }
    }
    currentX += length - (endX - startX);
  };

  const recursive = (elem: SvgElemTextContainer, parent: SvgElemTextContainer | null): void => {
    elem._x = combineArrays(
      elem.getLengthList('x', elem.getVWidth()),
      parent ? parent._x.slice(parent._pos.length) : [],
    );
    elem._y = combineArrays(
      elem.getLengthList('y', elem.getVHeight()),
      parent ? parent._y.slice(parent._pos.length) : [],
    );
    elem._dx = combineArrays(
      elem.getLengthList('dx', elem.getVWidth()),
      parent ? parent._dx.slice(parent._pos.length) : [],
    );
    elem._dy = combineArrays(
      elem.getLengthList('dy', elem.getVHeight()),
      parent ? parent._dy.slice(parent._pos.length) : [],
    );
    elem._rot = combineArrays(
      elem.getNumberList('rotate'),
      parent ? parent._rot.slice(parent._pos.length) : [],
    );
    elem._defRot =
      (elem.chooseValue(elem._rot[elem._rot.length - 1], parent && parent._defRot, 0) as number) ??
      0;
    if (elem.name === 'textPath') elem._y = [];

    const fontResult = renderer.selectFont(
      elem.get('font-family') as string,
      elem.get('font-weight') as string,
      elem.get('font-style') === 'italic',
    );
    const fontOptions = fontResult.options;
    const font = renderer.registerFont(fontResult.font, 16);
    if (!font) {
      // Without a font there is nothing meaningful to lay out.
      elem._pos = [];
      elem._index = 0;
      elem._font = null;
      return;
    }
    elem._pos = [];
    elem._index = 0;
    elem._font = {
      font,
      size: elem.get('font-size') as number,
      fauxItalic: fontOptions.fauxItalic,
      fauxBold: fontOptions.fauxBold,
    };

    const textLength = elem.computeLength(elem.attr('textLength'), elem.getVWidth(), undefined);
    const spacingAndGlyphs = elem.attr('lengthAdjust') === 'spacingAndGlyphs';
    const wordSpacing = elem.get('word-spacing') as number;
    const letterSpacing = elem.get('letter-spacing') as number;
    const textAnchor = elem.get('text-anchor') as string;
    const textDirection = elem.get('direction') as string;
    // Per spec, `alignment-baseline` and `baseline-shift` do not apply to
    // `<text>`; only `dominant-baseline` does. Chrome applies
    // `alignment-baseline` anyway, but following the spec keeps output
    // consistent across browsers.
    const isTextElem = elem.name === 'text';
    const baselineAttr = (
      isTextElem
        ? elem.get('dominant-baseline')
        : elem.get('alignment-baseline') || elem.get('dominant-baseline')
    ) as string;
    const baselineShiftAttr = (isTextElem ? 'baseline' : elem.get('baseline-shift')) as
      | string
      | number;
    const baseline = getBaseline(font, elem._font.size, baselineAttr, baselineShiftAttr);

    if (elem.name === 'textPath') {
      doAnchoring();
      currentX = currentY = 0;
    }

    for (const child of elem.getChildren()) {
      switch (child.name) {
        case 'tspan':
        case 'textPath':
        case 'a':
          recursive(child as SvgElemTextContainer, elem);
          break;
        case '#text':
        case '#cdata-section': {
          const textNode = child as SvgElemTextNode;
          const rawText = textNode.textContent;
          let renderedText = rawText;
          remainingText = remainingText.substring(rawText.length);
          if (elem.get('xml:space') === 'preserve') {
            renderedText = renderedText.replace(/[\s]/g, ' ');
          } else {
            renderedText = renderedText.replace(/[\s]+/g, ' ');
            if (/[\s]$|^$/.test(processedText)) {
              renderedText = renderedText.replace(/^[\s]/, '');
            }
            if (/^[\s]*$/.test(remainingText)) {
              renderedText = renderedText.replace(/[\s]$/, '');
            }
          }
          processedText += rawText;
          textNode.textFont = elem._font;
          textNode._posRef = [];

          const words = wordSpacing === 0 ? [renderedText] : renderedText.split(/(\s)/);
          for (const word of words) {
            const pos = getTextPos(font, elem._font.size, word);
            for (let j = 0; j < pos.length; j++) {
              const index = elem._index;
              const xAttr = elem._x[index];
              const yAttr = elem._y[index];
              const dxAttr = elem._dx[index];
              const dyAttr = elem._dy[index];
              const rotAttr = elem._rot[index];
              let continuous = !(word === words[0] && j === 0);
              if (letterSpacing !== 0) continuous = false;
              if (wordSpacing !== 0) continuous = false;
              if (xAttr !== undefined) {
                continuous = false;
                doAnchoring();
                currentX = xAttr;
              }
              if (yAttr !== undefined) {
                continuous = false;
                doAnchoring();
                currentY = yAttr;
              }
              if (dxAttr !== undefined) {
                continuous = false;
                currentX += dxAttr;
              }
              if (dyAttr !== undefined) {
                continuous = false;
                currentY += dyAttr;
              }
              if (rotAttr !== undefined || elem._defRot !== 0) {
                continuous = false;
              }
              const glyph: GlyphPlacement = {
                glyph: pos[j].glyph,
                rotate: (Math.PI / 180) * (elem.chooseValue(rotAttr, elem._defRot) as number),
                x: currentX + pos[j].xOffset,
                kern: pos[j].kern,
                y: currentY + baseline + pos[j].yOffset,
                width: pos[j].width,
                ascent: getAscent(font) * elem._font.size,
                descent: getDescent(font) * elem._font.size,
                scale: 1,
                hidden: false,
                continuous,
              };
              currentChunk.push(glyph);
              textNode._posRef!.push(glyph);
              elem._pos.push(glyph);
              elem._index += pos[j].unicode;
              if (currentChunk.length === 1) {
                currentAnchor = textAnchor;
                currentDirection = textDirection;
              }
              currentX += pos[j].xAdvance;
              currentY += pos[j].yAdvance;
            }
            if (word === ' ') currentX += wordSpacing;
          }
          break;
        }
        default:
          remainingText = remainingText.substring((child as SvgElemTextNode).textContent.length);
      }
    }

    if (textLength && elem._pos.length) {
      adjustLength(elem._pos, textLength, spacingAndGlyphs);
    }
    if (elem.name === 'textPath' || elem.name === 'text') doAnchoring();
    if (elem.name === 'textPath') {
      textPaths.push(elem as SvgElemTextPath);
      const pathObject = (elem as SvgElemTextPath).pathObject;
      if (pathObject?.endPoint) {
        currentX = pathObject.endPoint[0];
        currentY = pathObject.endPoint[1];
      }
    }
    if (parent) {
      parent._pos = parent._pos.concat(elem._pos);
      parent._index += elem._index;
    }
  };

  /** Rotate and position glyphs along the text path. */
  const textOnPath = (elem: SvgElemTextPath): void => {
    const pathObject = elem.pathObject;
    const pathLength = elem.pathLength;
    const pathScale = elem.pathScale;
    if (!pathObject) {
      for (const glyph of elem._pos) glyph.hidden = true;
      return;
    }
    const textOffset = elem.computeLength(elem.attr('startOffset'), pathLength, 0) as number;
    for (const glyph of elem._pos) {
      const charMidX = textOffset + glyph.x + 0.5 * glyph.width;
      if (charMidX > pathLength || charMidX < 0) {
        glyph.hidden = true;
        continue;
      }
      const point = pathObject.getPointAtLength(charMidX * pathScale)!;
      if (isNotEqual(pathScale, 1)) {
        glyph.scale *= pathScale;
        glyph.width *= pathScale;
      }
      glyph.x = point[0] - 0.5 * glyph.width * Math.cos(point[2]) - glyph.y * Math.sin(point[2]);
      glyph.y = point[1] - 0.5 * glyph.width * Math.sin(point[2]) + glyph.y * Math.cos(point[2]);
      glyph.rotate = point[2] + glyph.rotate;
      glyph.continuous = false;
    }
  };

  recursive(root, null);
  for (const elem of textPaths) textOnPath(elem);
}

/** One glyph's metrics, in 1/1000 em and px. */
interface TextGlyph {
  glyph: string;
  kern: number;
  width: number;
  xOffset: number;
  yOffset: number;
  xAdvance: number;
  yAdvance: number;
  /** Number of source characters this glyph covers. */
  unicode: number;
}

/** Measure and encode one word. */
function getTextPos(font: PdfFont, size: number, text: string): TextGlyph[] {
  const [hexes, positions] = font.encode('' + text);
  const data: TextGlyph[] = [];
  for (let i = 0; i < hexes.length; i++) {
    const pos = positions[i];
    data.push({
      glyph: hexes[i],
      kern: pos.advanceWidth - pos.xAdvance,
      width: (pos.advanceWidth * size) / 1000,
      xOffset: (pos.xOffset * size) / 1000,
      yOffset: (pos.yOffset * size) / 1000,
      xAdvance: (pos.xAdvance * size) / 1000,
      yAdvance: (pos.yAdvance * size) / 1000,
      unicode: pos.unicode,
    });
  }
  return data;
}

/* -------------------------------------------------------------------------- */
/* Element registry                                                            */
/* -------------------------------------------------------------------------- */

const ELEMENT_TYPES: Record<string, ElementCtor> = {
  use: SvgElemUse,
  symbol: SvgElemSymbol,
  g: SvgElemGroup,
  svg: SvgElemSvg,
  image: SvgElemImage,
  rect: SvgElemRect,
  circle: SvgElemCircle,
  ellipse: SvgElemEllipse,
  line: SvgElemLine,
  polyline: SvgElemPolyline,
  polygon: SvgElemPolygon,
  path: SvgElemPath,
  text: SvgElemText,
  tspan: SvgElemTspan,
  textPath: SvgElemTextPath,
  '#text': SvgElemTextNode,
  '#cdata-section': SvgElemTextNode,
};

export { parseStyleSheet };
