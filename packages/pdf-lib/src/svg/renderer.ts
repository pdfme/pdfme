/**
 * The pdf-lib drawing surface used by the SVG converter.
 *
 * The converter walks the SVG tree and calls into this class, which turns each
 * drawing operation straight into pdf-lib operators and PDF objects. There is
 * no intermediate PDF-instruction layer: paths, paints, groups, shadings,
 * patterns, text and images all become pdf-lib calls in one step.
 */

import {
  appendBezierCurve,
  beginText,
  clip,
  clipEvenOdd,
  closePath,
  concatTransformationMatrix,
  drawObject,
  endPath,
  fill,
  fillEvenOdd,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  setDashPattern,
  setFillingCmykColor,
  setFillingRgbColor,
  setFontAndSize,
  setGraphicsState,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingCmykColor,
  setStrokingRgbColor,
  setTextMatrix,
  setTextRenderingMode,
  stroke,
} from '../api/operators.js';
import PDFPage from '../api/PDFPage.js';
import {
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames,
  PDFRef,
  PDFString,
} from '../core/index.js';
import { decodeJpeg, decodePng, type RasterImage } from './image.js';
import { PdfFont } from './font.js';
import { multiplyMatrix, type Matrix } from './geometry.js';

export type WarningCallback = (message: string) => void;

/** Resolve a CSS font-family plus weight/style to an embedded pdf-lib font. */
export type FontCallback = (
  family: string,
  bold: boolean,
  italic: boolean,
  options: { fauxItalic: boolean; fauxBold: boolean },
) => unknown | undefined;

/** The subset of `PDFContext` this module uses. */
type Context = PDFPage['doc']['context'];

/** A color reduced to components in the 0-1 range plus an alpha factor. */
export type ResolvedColor =
  | { space: 'rgb'; components: [number, number, number]; alpha: number }
  | { space: 'cmyk'; components: [number, number, number, number]; alpha: number };

/** A gradient, ready to be turned into a shading pattern. */
export interface GradientSpec {
  type: 'linear' | 'radial';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  r1: number;
  r2: number;
  matrix: Matrix;
  stops: { offset: number; color: number[]; opacity: number }[];
}

/** An open transparency group. */
export interface GroupHandle {
  readonly id: number;
}

/** A finished transparency group, referenced as a form XObject. */
export interface GroupRef {
  readonly ref: PDFRef;
}

/** A tiling pattern that repeats a group's content. */
export interface PatternSpec {
  group: GroupRef;
  /** Resource name the pattern content stream refers to the group by. */
  groupName: string;
  dx: number;
  dy: number;
  matrix: Matrix;
}

/**
 * Build an operator for a name pdf-lib does not export a helper for.
 *
 * `PDFOperator` computes its byte size from its arguments, which only works
 * when every argument is a PDF object, so raw numbers and names are converted
 * through the context first.
 */
function op(context: Context, name: string, args: unknown[] = []): PDFOperator {
  return (PDFOperator.of as unknown as (n: string, a: unknown[]) => PDFOperator)(
    name,
    args.map((arg) => context.obj(arg as never)),
  );
}

/** Decode a base64 string in both browsers and Node. */
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

/**
 * A resource name that is not yet used in `dict`, in pdf-lib's `tag-n` style.
 */
function uniqueKey(dict: PDFDict, tag: string): string {
  for (let i = 1; ; i++) {
    const candidate = `${tag}-${i}`;
    if (!dict.get(PDFName.of(candidate))) return candidate;
  }
}

/**
 * Collects the operators and resources of one output target: the page itself,
 * or a form XObject for a group.
 *
 * Resource names are allocated per target, so a group never collides with the
 * page's own resources or with another group.
 */
class ContentTarget {
  readonly operators: PDFOperator[] = [];

  /** This target's Resources dictionary. For the page target it is the page's own. */
  private readonly resources: PDFDict;

  private readonly context: Context;
  private readonly page: PDFPage | null;

  constructor(context: Context, page: PDFPage | null) {
    this.context = context;
    this.page = page;
    this.resources = page ? page.node.normalizedEntries().Resources : (context.obj({}) as PDFDict);
  }

  push(...operators: PDFOperator[]): void {
    for (const operator of operators) this.operators.push(operator);
  }

  /** A named sub-dictionary of this target's Resources, created if missing. */
  private section(name: string): PDFDict {
    let dict = this.resources.lookupMaybe(PDFName.of(name), PDFDict);
    if (!dict) {
      dict = this.context.obj({}) as PDFDict;
      this.resources.set(PDFName.of(name), dict);
    }
    return dict;
  }

  private register(name: string, ref: PDFRef): string {
    const dict = this.section(name);
    const key = uniqueKey(dict, name === 'ExtGState' ? 'GS' : name);
    dict.set(PDFName.of(key), ref);
    return key;
  }

  /** Register a font under a fresh name and return the name. */
  font(ref: PDFRef): string {
    return this.register('Font', ref);
  }

  /** Register a form XObject (a group, a pattern group, an image). */
  xObject(ref: PDFRef): string {
    return this.register('XObject', ref);
  }

  /** Register a shading or tiling pattern. */
  pattern(ref: PDFRef): string {
    return this.register('Pattern', ref);
  }

  /** Register an ExtGState and return its resource name. */
  extGState(ref: PDFRef): string {
    return this.register('ExtGState', ref);
  }

  /** Build the form XObject for this target. */
  toFormXObject(bbox: [number, number, number, number]): PDFRef {
    return this.context.register(
      this.context.formXObject(this.operators, {
        BBox: bbox,
        // Resources is required on a form XObject, even when empty.
        Resources: this.resources,
        Group: { S: 'Transparency', CS: 'DeviceRGB', I: true, K: false },
      }),
    );
  }

  /** Write the collected content into the page's content stream. */
  flushToPage(): void {
    (this.page as PDFPage).pushOperators(...this.operators);
  }
}

export interface RendererOptions {
  fontCallback?: FontCallback;
  imageCallback?: (link: string) => string;
  warningCallback?: WarningCallback;
}

/**
 * Draws onto a pdf-lib `PDFPage`: SVG paint servers, groups, text, images and
 * annotations all resolve to pdf-lib operators and objects.
 */
export class Renderer {
  private readonly page: PDFPage;
  private readonly context: Context;
  private readonly pageTarget: ContentTarget;
  private readonly options: RendererOptions;

  /**
   * Current transformation matrix, needed to place tiling patterns. A group
   * starts from the identity matrix, so the outer value is kept on a stack.
   */
  private ctm: Matrix = [1, 0, 0, 1, 0, 0];
  private readonly ctmStack: Matrix[] = [];

  /** Open groups; the last entry is the current target. */
  private readonly stack: ContentTarget[] = [];
  private readonly groupBBoxes: [number, number, number, number][] = [];

  private groupCounter = 0;
  private gradientCounter = 0;
  private patternCounter = 0;
  private imageCounter = 0;

  private readonly fonts = new Map<PDFRef, PdfFont>();
  /** Font name to seed the resource name with, per pdf-lib's own convention. */
  private readonly pendingFontName = new Map<PDFRef, string>();
  private readonly fontNames = new Map<ContentTarget, Map<PDFRef, string>>();
  private readonly alphaStates = new Map<string, PDFRef>();
  private readonly alphaNames = new Map<ContentTarget, Map<string, string>>();

  /** True once path operators have been emitted and not yet terminated. */
  private pathStarted = false;
  private inText = false;

  constructor(page: PDFPage, options: RendererOptions = {}) {
    this.page = page;
    this.options = options;
    this.context = page.node.context;
    this.pageTarget = new ContentTarget(this.context, page);
    this.stack = [this.pageTarget];
  }

  private get target(): ContentTarget {
    return this.stack[this.stack.length - 1];
  }

  warn(message: string): void {
    this.options.warningCallback?.(message);
  }

  /* ------------------------------------------------------------------ */
  /* Graphics state                                                       */
  /* ------------------------------------------------------------------ */

  save(): void {
    this.emitNow(pushGraphicsState());
  }

  restore(): void {
    this.endText();
    this.emitNow(popGraphicsState());
  }

  transform(m: Matrix): void {
    this.emitNow(concatTransformationMatrix(m[0], m[1], m[2], m[3], m[4], m[5]));
    // A `cm` operator post-multiplies the CTM, so the new matrix goes on
    // the left. Tiling patterns need this matrix to place themselves in
    // the page's default coordinate system.
    this.ctm = multiplyMatrix(m, this.ctm);
  }

  /* ------------------------------------------------------------------ */
  /* Path construction                                                   */
  /* ------------------------------------------------------------------ */

  moveTo(x: number, y: number): void {
    this.emitNow(moveTo(x, y));
    this.pathStarted = true;
  }

  lineTo(x: number, y: number): void {
    this.emitNow(lineTo(x, y));
    this.pathStarted = true;
  }

  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    this.emitNow(appendBezierCurve(cp1x, cp1y, cp2x, cp2y, x, y));
    this.pathStarted = true;
  }

  closePath(): void {
    this.emitNow(closePath());
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.emitNow(rectangle(x, y, width, height));
    this.pathStarted = true;
  }

  /** Circle as four bezier arcs, matching the SVG arc geometry. */
  circle(x: number, y: number, r: number): void {
    const k = r * 0.5522847498307936;
    this.emitNow(
      moveTo(x + r, y),
      appendBezierCurve(x + r, y + k, x + k, y + r, x, y + r),
      appendBezierCurve(x - k, y + r, x - r, y + k, x - r, y),
      appendBezierCurve(x - r, y - k, x - k, y - r, x, y - r),
      appendBezierCurve(x + k, y - r, x + r, y - k, x + r, y),
    );
    this.pathStarted = true;
  }

  /* ------------------------------------------------------------------ */
  /* Painting                                                            */
  /* ------------------------------------------------------------------ */

  fill(rule: 'nonzero' | 'evenodd'): void {
    this.paint(rule === 'evenodd' ? fillEvenOdd() : fill());
  }

  stroke(): void {
    this.paint(stroke());
  }

  fillAndStroke(rule: 'nonzero' | 'evenodd'): void {
    this.paint(rule === 'evenodd' ? fillEvenOdd() : fill(), stroke());
  }

  clip(rule: 'nonzero' | 'evenodd'): void {
    this.paint(rule === 'evenodd' ? clipEvenOdd() : clip(), endPath());
  }

  /** Terminate the current path with a painting or clipping operator. */
  private paint(...operators: PDFOperator[]): void {
    if (!this.pathStarted) return;
    this.pathStarted = false;
    this.emitNow(...operators);
  }

  private emitNow(...operators: PDFOperator[]): void {
    if (operators.length === 0) return;
    this.target.push(...operators);
  }

  /* ------------------------------------------------------------------ */
  /* Colour                                                              */
  /* ------------------------------------------------------------------ */

  setFillColor(color: ResolvedColor): void {
    const [r, g, b] = color.components as [number, number, number];
    this.emitNow(
      color.space === 'rgb'
        ? setFillingRgbColor(r, g, b)
        : setFillingCmykColor(
            color.components[0],
            color.components[1],
            color.components[2],
            color.components[3],
          ),
    );
    this.applyAlpha(color.alpha, false);
  }

  setStrokeColor(color: ResolvedColor): void {
    const [r, g, b] = color.components as [number, number, number];
    this.emitNow(
      color.space === 'rgb'
        ? setStrokingRgbColor(r, g, b)
        : setStrokingCmykColor(
            color.components[0],
            color.components[1],
            color.components[2],
            color.components[3],
          ),
    );
    this.applyAlpha(color.alpha, true);
  }

  setFillOpacity(opacity: number): void {
    this.applyAlpha(opacity, false);
  }

  setStrokeOpacity(opacity: number): void {
    this.applyAlpha(opacity, true);
  }

  /** Apply a constant alpha through an ExtGState. */
  private applyAlpha(alpha: number, stroke: boolean): void {
    if (alpha >= 1) return;
    const key = `${stroke ? 'S' : 'F'}Alpha-${alpha.toFixed(4)}`;
    let ref = this.alphaStates.get(key);
    if (!ref) {
      ref = this.context.register(
        this.context.obj({
          Type: 'ExtGState',
          [stroke ? 'CA' : 'ca']: alpha,
          AIS: false,
        }),
      );
      this.alphaStates.set(key, ref);
    }
    // The resource name is target-local, so look it up per target.
    let names = this.alphaNames.get(this.target);
    if (!names) {
      names = new Map();
      this.alphaNames.set(this.target, names);
    }
    let name = names.get(key);
    if (!name) {
      name = this.target.extGState(ref);
      names.set(key, name);
    }
    this.emitNow(setGraphicsState(PDFName.of(name)));
  }

  /* ------------------------------------------------------------------ */
  /* Stroke style                                                        */
  /* ------------------------------------------------------------------ */

  setLineWidth(width: number): void {
    this.emitNow(setLineWidth(width));
  }

  setLineCap(cap: 'butt' | 'round' | 'square'): void {
    this.emitNow(setLineCap(cap === 'round' ? 1 : cap === 'square' ? 2 : 0));
  }

  setLineJoin(join: 'miter' | 'round' | 'bevel'): void {
    this.emitNow(setLineJoin(join === 'round' ? 1 : join === 'bevel' ? 2 : 0));
  }

  setMiterLimit(limit: number): void {
    this.emitNow(op(this.context, PDFOperatorNames.SetLineMiterLimit, [PDFNumber.of(limit)]));
  }

  setDash(array: number[], phase: number): void {
    this.emitNow(setDashPattern(array, phase));
  }

  /* ------------------------------------------------------------------ */
  /* Text                                                                */
  /* ------------------------------------------------------------------ */

  /** The page size in PDF units. */
  pageSize(): { width: number; height: number } {
    return this.page.getSize();
  }

  /** Translate the current point. */
  translate(x: number, y: number): void {
    this.transform([1, 0, 0, 1, x, y]);
  }

  /** Resolve an `<image>` href to a source the loader understands. */
  resolveImageLink(href: string): string {
    return this.options.imageCallback ? this.options.imageCallback(href) : href.replace(/\s+/g, '');
  }

  /**
   * Choose a font for the given family, weight and slant.
   *
   * The callback may set `fauxBold` or `fauxItalic` on `options` to ask for
   * synthetic bold or oblique, which the caller needs back.
   */
  selectFont(
    family: string,
    weight: string,
    italic: boolean,
  ): { font: unknown; options: { fauxItalic: boolean; fauxBold: boolean } } {
    const options = { fauxItalic: false, fauxBold: false };
    const bold = weight === 'bold' || weight === 'bolder';
    const result = this.options.fontCallback?.(family, bold, italic, options);
    if (result === undefined || result === null) {
      this.warn(`svg4pdf-lib: no font available for "${family}"; text will be skipped`);
    }
    return { font: result, options };
  }

  /** Wrap a pdf-lib font, registering it once per page. */
  registerFont(pdfFont: unknown, size: number): PdfFont | null {
    if (!pdfFont) return null;
    const embedded = pdfFont as { ref: PDFRef; name: string };
    for (const font of this.fonts.values()) {
      if (font.pdfFont === pdfFont) return font;
    }
    const font = new PdfFont(embedded.ref, embedded as never, size);
    this.fonts.set(embedded.ref, font);
    this.pendingFontName.set(embedded.ref, embedded.name);
    return font;
  }

  beginText(font: PdfFont, size: number): void {
    if (this.inText) this.endText();
    // The font has to be reachable from the current target: text inside a
    // group is drawn from the group's own Resources.
    let names = this.fontNames.get(this.target);
    if (!names) {
      names = new Map();
      this.fontNames.set(this.target, names);
    }
    let name = names.get(font.ref);
    if (!name) {
      name = this.target.font(font.ref);
      names.set(font.ref, name);
    }
    this.emitNow(beginText(), setFontAndSize(PDFName.of(name), size));
    this.inText = true;
  }

  endText(): void {
    if (!this.inText) return;
    this.inText = false;
    this.emitNow(op(this.context, PDFOperatorNames.EndText));
  }

  /**
   * Set the text matrix. The converter draws in a Y-flipped space, so the
   * skew part of the matrix is negated to keep glyphs upright.
   */
  setTextMatrix(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.emitNow(setTextMatrix(a, b, -c, -d, e, f));
  }

  setTextMode(fill: boolean, stroke: boolean): void {
    const mode = fill && stroke ? 2 : stroke ? 1 : fill ? 0 : 3;
    this.emitNow(setTextRenderingMode(mode));
  }

  /** Show glyphs as a single `TJ` array, applying the given kerns. */
  showGlyphs(glyphHexes: string[], kerns: number[]): void {
    let buffer = '';
    const items: (PDFHexString | PDFNumber)[] = [];
    for (let i = 0; i < glyphHexes.length; i++) {
      buffer += glyphHexes[i];
      if (i === glyphHexes.length - 1) {
        items.push(PDFHexString.of(buffer));
        break;
      }
      if (kerns[i] !== 0) {
        items.push(PDFHexString.of(buffer), PDFNumber.of(kerns[i]));
        buffer = '';
      }
    }
    if (!items.length) return;
    const array = PDFArray.withContext(this.context);
    for (const item of items) array.push(item);
    this.emitNow(op(this.context, PDFOperatorNames.ShowTextAdjusted, [array]));
  }

  /* ------------------------------------------------------------------ */
  /* Groups, masks and blend modes                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Start collecting content into a new transparency group. The returned
   * handle must be passed to {@link endGroup} to finish it.
   */
  beginGroup(bbox: [number, number, number, number]): GroupHandle {
    this.endText();
    this.stack.push(new ContentTarget(this.context, null));
    this.groupBBoxes.push(bbox);
    this.ctmStack.push(this.ctm);
    this.ctm = [1, 0, 0, 1, 0, 0];
    return { id: ++this.groupCounter };
  }

  /** Close a group and turn its content into a form XObject. */
  endGroup(handle: GroupHandle): GroupRef {
    const target = this.stack.pop();
    const bbox = this.groupBBoxes.pop() ?? [0, 0, 0, 0];
    this.ctm = this.ctmStack.pop() ?? [1, 0, 0, 1, 0, 0];
    if (!target) throw new Error('endGroup without a matching beginGroup');
    void handle;
    return { ref: target.toFormXObject(bbox) };
  }

  /** Draw a finished group on the current target. */
  insertGroup(group: GroupRef): void {
    const name = this.target.xObject(group.ref);
    this.emitNow(drawObject(PDFName.of(name)));
  }

  /**
   * Make a finished group reachable by name from the current target, and
   * return that name. Tiling patterns need this, because their content stream
   * refers to the group by resource name.
   */
  registerGroup(group: GroupRef): string {
    return this.target.xObject(group.ref);
  }

  /** Use a group's luminance (or alpha) as a soft mask. */
  applyMask(
    group: GroupRef,
    maskType: 'alpha' | 'luminance',
    backdrop: [number, number, number],
  ): void {
    const ref = this.context.register(
      this.context.obj({
        Type: 'ExtGState',
        CA: 1,
        ca: 1,
        BM: 'Normal',
        SMask: {
          S: maskType === 'alpha' ? 'Alpha' : 'Luminosity',
          G: group.ref,
          BC: backdrop,
        },
      }),
    );
    this.emitNow(setGraphicsState(PDFName.of(this.target.extGState(ref))));
  }

  /** Set a blend mode for subsequent painting. */
  applyBlendMode(blendMode: string): void {
    const ref = this.context.register(
      this.context.obj({ Type: 'ExtGState', CA: 1, ca: 1, BM: blendMode }),
    );
    this.emitNow(setGraphicsState(PDFName.of(this.target.extGState(ref))));
  }

  /* ------------------------------------------------------------------ */
  /* Gradients                                                           */
  /* ------------------------------------------------------------------ */

  setFillGradient(gradient: GradientSpec): void {
    this.useGradient(gradient, false);
  }

  setStrokeGradient(gradient: GradientSpec): void {
    this.useGradient(gradient, true);
  }

  private useGradient(gradient: GradientSpec, strokePaint: boolean): void {
    const sorted = [...gradient.stops].sort((a, b) => a.offset - b.offset);
    const isCmyk = sorted.some((stop) => stop.color.length === 4);
    const patternName = this.createShadingPattern(gradient, sorted, isCmyk);

    // Per-stop alpha needs a luminosity soft mask built from a gray shading.
    if (sorted.some((stop) => Math.abs(stop.opacity - 1) > 1e-6)) {
      const alphaPattern = this.createAlphaPattern(gradient, sorted);
      const alphaPatternName = alphaPattern.name;
      const { width, height } = this.page.getSize();
      const formRef = this.context.register(
        this.context.formXObject(
          [
            op(this.context, PDFOperatorNames.PushGraphicsState),
            op(this.context, PDFOperatorNames.NonStrokingColorspace, [PDFName.of('Pattern')]),
            op(this.context, PDFOperatorNames.NonStrokingColorN, [PDFName.of(alphaPatternName)]),
            op(this.context, PDFOperatorNames.AppendRectangle, [0, 0, width, height]),
            op(this.context, PDFOperatorNames.FillNonZero),
            op(this.context, PDFOperatorNames.PopGraphicsState),
          ],
          {
            BBox: [0, 0, width, height],
            Resources: this.context.obj({
              Pattern: { [alphaPattern.name]: alphaPattern.ref },
            }),
            // A form used as a soft mask has to be a transparency
            // group, otherwise viewers reject the mask.
            Group: { S: 'Transparency', CS: 'DeviceGray', I: false, K: false },
          },
        ),
      );
      const maskRef = this.context.register(
        this.context.obj({
          Type: 'ExtGState',
          SMask: { Type: 'Mask', S: 'Alpha', G: formRef },
        }),
      );
      this.emitNow(setGraphicsState(PDFName.of(this.target.extGState(maskRef))));
    }

    this.emitNow(
      op(
        this.context,
        strokePaint ? PDFOperatorNames.StrokingColorspace : PDFOperatorNames.NonStrokingColorspace,
        [PDFName.of('Pattern')],
      ),
      op(
        this.context,
        strokePaint ? PDFOperatorNames.StrokingColorN : PDFOperatorNames.NonStrokingColorN,
        [PDFName.of(patternName)],
      ),
    );
  }

  private shadingCoords(gradient: GradientSpec): number[] {
    return gradient.type === 'linear'
      ? [gradient.x1, gradient.y1, gradient.x2, gradient.y2]
      : [gradient.x1, gradient.y1, gradient.r1, gradient.x2, gradient.y2, gradient.r2];
  }

  /** Convert a stop color into PDF function endpoints. */
  private stopComponents(color: number[], cmyk: boolean): number[] {
    if (cmyk) return color.map((value) => (value > 1 ? value / 100 : value));
    return color.map((value) => value / 255);
  }

  private createShadingPattern(
    gradient: GradientSpec,
    sorted: GradientSpec['stops'],
    cmyk: boolean,
  ): string {
    const shadingRef = this.context.register(
      this.context.obj({
        ShadingType: gradient.type === 'linear' ? 2 : 3,
        ColorSpace: cmyk ? 'DeviceCMYK' : 'DeviceRGB',
        Coords: this.shadingCoords(gradient),
        Function: this.createColorFunction(sorted, cmyk),
        Extend: [true, true],
      }),
    );
    const patternRef = this.context.register(
      this.context.obj({
        Type: 'Pattern',
        PatternType: 2,
        Shading: shadingRef,
        Matrix: gradient.matrix,
      }),
    );
    void this.gradientCounter;
    return this.target.pattern(patternRef);
  }

  /** A DeviceGray shading carrying a gradient's per-stop alpha. */
  private createAlphaPattern(
    gradient: GradientSpec,
    sorted: GradientSpec['stops'],
  ): { name: string; ref: PDFRef } {
    const shadingRef = this.context.register(
      this.context.obj({
        ShadingType: gradient.type === 'linear' ? 2 : 3,
        ColorSpace: 'DeviceGray',
        Coords: this.shadingCoords(gradient),
        Function: this.createScalarFunction(
          sorted.map((stop) => ({ offset: stop.offset, value: stop.opacity })),
        ),
        Extend: [true, true],
      }),
    );
    const ref = this.context.register(
      this.context.obj({
        Type: 'Pattern',
        PatternType: 2,
        Shading: shadingRef,
        Matrix: gradient.matrix,
      }),
    );
    return { name: '', ref };
  }

  private createColorFunction(stops: GradientSpec['stops'], cmyk: boolean): PDFRef {
    if (stops.length <= 2) {
      return this.context.register(
        this.context.obj({
          FunctionType: 2,
          Domain: [0, 1],
          C0: this.stopComponents(stops[0].color, cmyk),
          C1: this.stopComponents(stops[stops.length - 1].color, cmyk),
          N: 1,
        }),
      );
    }
    const { functions, bounds } = this.buildFunctionSegments(
      stops.map((stop) => ({
        offset: stop.offset,
        values: this.stopComponents(stop.color, cmyk),
      })),
    );
    return this.context.register(
      this.context.obj({
        FunctionType: 3,
        Domain: [0, 1],
        Functions: functions,
        Bounds: bounds,
        Encode: functions.flatMap(() => [0, 1]),
      }),
    );
  }

  private createScalarFunction(stops: { offset: number; value: number }[]): PDFRef {
    if (stops.length <= 2) {
      return this.context.register(
        this.context.obj({
          FunctionType: 2,
          Domain: [0, 1],
          C0: [stops[0]?.value ?? 1],
          C1: [stops[stops.length - 1]?.value ?? 1],
          N: 1,
        }),
      );
    }
    const { functions, bounds } = this.buildFunctionSegments(
      stops.map((stop) => ({ offset: stop.offset, values: [stop.value] })),
    );
    return this.context.register(
      this.context.obj({
        FunctionType: 3,
        Domain: [0, 1],
        Functions: functions,
        Bounds: bounds,
        Encode: functions.flatMap(() => [0, 1]),
      }),
    );
  }

  /** Build one type-2 function per stop interval, plus the domain bounds. */
  private buildFunctionSegments(stops: { offset: number; values: number[] }[]): {
    functions: PDFRef[];
    bounds: number[];
  } {
    const functions: PDFRef[] = [];
    const bounds: number[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      functions.push(
        this.context.register(
          this.context.obj({
            FunctionType: 2,
            Domain: [0, 1],
            C0: stops[i].values,
            C1: stops[i + 1].values,
            N: 1,
          }),
        ),
      );
      if (i < stops.length - 2) bounds.push(stops[i + 1].offset);
    }
    return { functions, bounds };
  }

  /* ------------------------------------------------------------------ */
  /* Patterns                                                            */
  /* ------------------------------------------------------------------ */

  setPattern(pattern: PatternSpec, strokePaint: boolean): void {
    const resources = this.context.obj({
      ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI'],
      XObject: { [pattern.groupName]: pattern.group.ref },
    });
    const content = this.context.contentStream([drawObject(PDFName.of(pattern.groupName))], {
      Type: 'Pattern',
      PatternType: 1,
      PaintType: 1,
      TilingType: 2,
      BBox: [0, 0, pattern.dx, pattern.dy],
      XStep: pattern.dx,
      YStep: pattern.dy,
      // A pattern matrix maps pattern space to the page's default
      // coordinate system, so the CTM has to be folded in.
      Matrix: multiplyMatrix(this.ctm, pattern.matrix),
      Resources: resources,
    });
    const patternRef = this.context.register(content);
    const name = this.target.pattern(patternRef);
    this.emitNow(
      op(
        this.context,
        strokePaint ? PDFOperatorNames.StrokingColorspace : PDFOperatorNames.NonStrokingColorspace,
        [PDFName.of('Pattern')],
      ),
      op(
        this.context,
        strokePaint ? PDFOperatorNames.StrokingColorN : PDFOperatorNames.NonStrokingColorN,
        [PDFName.of(name)],
      ),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Images                                                              */
  /* ------------------------------------------------------------------ */

  /** Decode a data URI, or return `undefined` for unsupported sources. */
  loadImage(src: string): RasterImage | undefined {
    const png = src.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/i);
    if (png) return this.decode(() => decodePng(base64ToBytes(png[1])), 'PNG');
    const jpeg = src.match(/^data:image\/(?:jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i);
    if (jpeg) return this.decode(() => decodeJpeg(base64ToBytes(jpeg[1])), 'JPEG');
    this.warn('svg4pdf-lib: unsupported raster image source');
    return undefined;
  }

  private decode(load: () => RasterImage, kind: string): RasterImage | undefined {
    try {
      return load();
    } catch (e) {
      this.warn(`svg4pdf-lib: failed to decode ${kind} image (${(e as Error).message})`);
      return undefined;
    }
  }

  /** Draw an image with its lower-left corner at (x, y). */
  drawImage(image: RasterImage, x: number, y: number, width: number, height: number): void {
    const ref = this.buildImageStream(image);
    if (!ref) return;
    void this.imageCounter;
    const name = this.target.xObject(ref);
    this.emitNow(
      op(this.context, PDFOperatorNames.PushGraphicsState),
      op(this.context, PDFOperatorNames.ConcatTransformationMatrix, [width, 0, 0, height, x, y]),
      drawObject(PDFName.of(name)),
      op(this.context, PDFOperatorNames.PopGraphicsState),
    );
  }

  private buildImageStream(image: RasterImage): PDFRef | undefined {
    if (image.kind === 'png') {
      const rgb = this.context.flateStream(image.rgb, {
        Type: 'XObject',
        Subtype: 'Image',
        Width: image.width,
        Height: image.height,
        BitsPerComponent: 8,
        ColorSpace: 'DeviceRGB',
      });
      if (image.alpha) {
        rgb.dict.set(
          PDFName.of('SMask'),
          this.context.flateStream(image.alpha, {
            Type: 'XObject',
            Subtype: 'Image',
            Width: image.width,
            Height: image.height,
            BitsPerComponent: 8,
            ColorSpace: 'DeviceGray',
          }),
        );
      }
      return this.context.register(rgb);
    }
    const colorSpace = image.colorSpace;
    return this.context.register(
      this.context.stream(image.data, {
        Type: 'XObject',
        Subtype: 'Image',
        Width: image.width,
        Height: image.height,
        BitsPerComponent: 8,
        ColorSpace: colorSpace,
        Filter: 'DCTDecode',
        // Adobe CMYK JPEGs are stored inverted.
        Decode: colorSpace === 'DeviceCMYK' ? [1, 0, 1, 0, 1, 0, 1, 0] : undefined,
      }),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Annotations                                                         */
  /* ------------------------------------------------------------------ */

  /** Add a link annotation covering the given bounding box. */
  addLink(bbox: [number, number, number, number], url: string): void {
    this.page.node.addAnnot(
      this.context.register(
        this.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: bbox,
          Border: [0, 0, 0],
          A: { S: 'URI', URI: PDFString.of(url) },
        }),
      ),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  /** Push everything collected for the page onto its content stream. */
  flush(): void {
    this.endText();
    this.pageTarget.flushToPage();
  }
}
