/**
 * CSS-ish style resolution.
 *
 * Supports presentation attributes, `style="..."` and `<style>` rules with
 * tag/id/class selectors, plus inheritance.
 */

import { StringParser, type SvgNode } from './xml.js';
import { NAMED_COLORS } from './color.js';
import type { ColorCallback, ParsedColor, PaintKind } from './color.js';
import { parseColor } from './color.js';
import {
  parseTransform,
  parseTransformOrigin,
  type Matrix,
  type TransformOriginFn,
} from './geometry.js';

export interface StylePropertySpec {
  inherit: boolean;
  initial: unknown;
  values?: Record<string, unknown>;
  css?: string;
}

export interface Selector {
  tags: string[];
  ids: string[];
  classes: string[];
  specificity: number;
}

export interface StyleRule {
  selector: Selector;
  css: Record<string, string>;
}

/** A paint server (`<linearGradient>`, `<radialGradient>`, `<pattern>`). */
export interface PaintServer {
  /**
   * Resolve the server against a bounding box. On success, `concrete` holds
   * the gradient or pattern to draw with.
   */
  getPaint(
    bBox: [number, number, number, number],
    gOpacity: number,
    isClip: boolean,
    isMask: boolean,
  ): [PaintServer | null, number] | undefined;
  /** Set by `getPaint`; the resolved gradient or pattern. */
  concrete?: { type: 'gradient'; gradient: unknown } | { type: 'pattern'; pattern: unknown };
}

/** Everything a style lookup may need from the surrounding converter. */
export interface StyleContext {
  /** The parsed document root, for `url(#id)` lookups. */
  root: SvgNode | null;
  /** Element stack, innermost last; used to detect reference loops. */
  stack: SvgNode[];
  /** The `cmyk` option. */
  cmyk: boolean;
  colorCallback: ColorCallback | null;
  /** Resolves `url(file#id)` for references into other documents. */
  documentCallback: ((file: string) => unknown) | null;
  documentCache: Record<string, SvgNode[]>;
  /** Builds a paint server for a gradient/pattern element. */
  createPaintServer(node: SvgNode, fallback: ParsedColor | undefined): PaintServer | undefined;
  /** Viewport size, for resolving `vw`-like fallbacks. */
  viewportWidth: number;
  viewportHeight: number;
  /** Computes an element's viewport diagonal. */
  elemViewport(elem: SvgNode): number;
  /** Resolves an element's `font-size`, honouring inheritance. */
  elemFontSize(resolver: StyleResolver): number;
  warn(message: string): void;
}

export type ResolvedStyle = unknown;

export function buildProperties(
  defaultColors: Record<string, ParsedColor>,
  initialFontSize = 16,
): Record<string, StylePropertySpec> {
  return {
    color: { inherit: true, initial: undefined },
    visibility: {
      inherit: true,
      initial: 'visible',
      values: { hidden: 'hidden', collapse: 'hidden', visible: 'visible' },
    },
    fill: { inherit: true, initial: defaultColors.black },
    stroke: { inherit: true, initial: 'none' },
    'stop-color': { inherit: false, initial: defaultColors.black },
    'fill-opacity': { inherit: true, initial: 1 },
    'stroke-opacity': { inherit: true, initial: 1 },
    'stop-opacity': { inherit: false, initial: 1 },
    'fill-rule': {
      inherit: true,
      initial: 'nonzero',
      values: { nonzero: 'nonzero', evenodd: 'evenodd' },
    },
    'clip-rule': {
      inherit: true,
      initial: 'nonzero',
      values: { nonzero: 'nonzero', evenodd: 'evenodd' },
    },
    'stroke-width': { inherit: true, initial: 1 },
    'stroke-dasharray': { inherit: true, initial: [] },
    'stroke-dashoffset': { inherit: true, initial: 0 },
    'stroke-miterlimit': { inherit: true, initial: 4 },
    'stroke-linejoin': {
      inherit: true,
      initial: 'miter',
      values: { miter: 'miter', round: 'round', bevel: 'bevel' },
    },
    'stroke-linecap': {
      inherit: true,
      initial: 'butt',
      values: { butt: 'butt', round: 'round', square: 'square' },
    },
    'font-size': {
      inherit: true,
      initial: initialFontSize,
      values: {
        'xx-small': 9,
        'x-small': 10,
        small: 13,
        medium: 16,
        large: 18,
        'x-large': 24,
        'xx-large': 32,
      },
    },
    'font-family': { inherit: true, initial: 'sans-serif' },
    'font-weight': {
      inherit: true,
      initial: 'normal',
      values: {
        '600': 'bold',
        '700': 'bold',
        '800': 'bolder',
        '900': 'bolder',
        bold: 'bold',
        bolder: 'bolder',
        '500': 'normal',
        '400': 'normal',
        '300': 'normal',
        '200': 'normal',
        '100': 'normal',
        normal: 'normal',
        lighter: 'normal',
      },
    },
    'font-style': {
      inherit: true,
      initial: 'normal',
      values: { italic: 'italic', oblique: 'italic', normal: 'normal' },
    },
    'text-anchor': {
      inherit: true,
      initial: 'start',
      values: { start: 'start', middle: 'middle', end: 'end' },
    },
    direction: { inherit: true, initial: 'ltr', values: { ltr: 'ltr', rtl: 'rtl' } },
    'dominant-baseline': {
      inherit: true,
      initial: 'baseline',
      values: {
        auto: 'baseline',
        baseline: 'baseline',
        'before-edge': 'before-edge',
        'text-before-edge': 'before-edge',
        middle: 'middle',
        central: 'central',
        'after-edge': 'after-edge',
        'text-after-edge': 'text-after-edge',
        ideographic: 'ideographic',
        alphabetic: 'alphabetic',
        hanging: 'hanging',
        mathematical: 'mathematical',
      },
    },
    'alignment-baseline': {
      inherit: false,
      initial: undefined,
      values: {
        auto: 'baseline',
        baseline: 'baseline',
        'before-edge': 'before-edge',
        'text-before-edge': 'before-edge',
        middle: 'middle',
        central: 'central',
        'after-edge': 'after-edge',
        'text-after-edge': 'text-after-edge',
        ideographic: 'ideographic',
        alphabetic: 'alphabetic',
        hanging: 'hanging',
        mathematical: 'mathematical',
      },
    },
    'baseline-shift': {
      inherit: true,
      initial: 'baseline',
      values: { baseline: 'baseline', sub: 'sub', super: 'super' },
    },
    'word-spacing': { inherit: true, initial: 0, values: { normal: 0 } },
    'letter-spacing': { inherit: true, initial: 0, values: { normal: 0 } },
    'text-decoration': {
      inherit: false,
      initial: 'none',
      values: {
        none: 'none',
        underline: 'underline',
        overline: 'overline',
        'line-through': 'line-through',
      },
    },
    'xml:space': {
      inherit: true,
      initial: 'default',
      css: 'white-space',
      values: {
        preserve: 'preserve',
        default: 'default',
        pre: 'preserve',
        'pre-line': 'preserve',
        'pre-wrap': 'preserve',
        nowrap: 'default',
      },
    },
    'marker-start': { inherit: true, initial: 'none' },
    'marker-mid': { inherit: true, initial: 'none' },
    'marker-end': { inherit: true, initial: 'none' },
    opacity: { inherit: false, initial: 1 },
    transform: { inherit: false, initial: [1, 0, 0, 1, 0, 0] as Matrix },
    'transform-origin': { inherit: false, initial: '0 0' },
    display: {
      inherit: false,
      initial: 'inline',
      values: { none: 'none', inline: 'inline', block: 'inline' },
    },
    'clip-path': { inherit: false, initial: 'none' },
    mask: { inherit: false, initial: 'none' },
    overflow: {
      inherit: false,
      initial: 'hidden',
      values: { hidden: 'hidden', scroll: 'hidden', visible: 'visible' },
    },
    'vector-effect': {
      inherit: true,
      initial: 'none',
      values: { none: 'none', 'non-scaling-stroke': 'non-scaling-stroke' },
    },
  };
}

export function parseStyleAttr(v: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  for (const declaration of (v || '').trim().split(/;/)) {
    const key = (declaration.split(':')[0] || '').trim();
    const value = (declaration.split(':')[1] || '').trim();
    if (key) result[key] = value;
  }
  if (result.marker) {
    if (!result['marker-start']) result['marker-start'] = result.marker;
    if (!result['marker-mid']) result['marker-mid'] = result.marker;
    if (!result['marker-end']) result['marker-end'] = result.marker;
  }
  if (result.font) {
    let fontFamily: string | null = null;
    let fontSize: string | null = null;
    let fontStyle = 'normal';
    let fontWeight = 'normal';
    let fontVariant = 'normal';
    for (const part of result.font.split(/\s+/)) {
      switch (part) {
        case 'normal':
          break;
        case 'italic':
        case 'oblique':
          fontStyle = part;
          break;
        case 'small-caps':
          fontVariant = part;
          break;
        case 'bold':
        case 'bolder':
        case 'lighter':
        case '100':
        case '200':
        case '300':
        case '400':
        case '500':
        case '600':
        case '700':
        case '800':
        case '900':
          fontWeight = part;
          break;
        default:
          if (!fontSize) fontSize = part.split('/')[0];
          else if (!fontFamily) fontFamily = part;
          else fontFamily += ' ' + part;
          break;
      }
    }
    if (!result['font-style']) result['font-style'] = fontStyle;
    if (!result['font-variant']) result['font-variant'] = fontVariant;
    if (!result['font-weight']) result['font-weight'] = fontWeight;
    if (!result['font-size']) result['font-size'] = fontSize ?? '';
    if (!result['font-family']) result['font-family'] = fontFamily ?? '';
  }
  return result;
}

export function parseSelector(v: string): Selector | undefined {
  const ids: string[] = [];
  const classes: string[] = [];
  const tags: string[] = [];
  for (const part of v.split(/(?=[.#])/g)) {
    let temp: RegExpMatchArray | null;
    if ((temp = part.match(/^[#]([_A-Za-z0-9-]+)$/))) ids.push(temp[1]);
    else if ((temp = part.match(/^[.]([_A-Za-z0-9-]+)$/))) classes.push(temp[1]);
    else if ((temp = part.match(/^([_A-Za-z0-9-]+)$/))) tags.push(temp[1]);
    else if (part !== '*') return undefined;
  }
  return {
    tags,
    ids,
    classes,
    specificity: ids.length * 10000 + classes.length * 100 + tags.length,
  };
}

export function parseStyleSheet(v: string): StyleRule[] {
  const parser = new StringParser(v.trim());
  const rules: StyleRule[] = [];
  let rule: RegExpMatchArray | undefined;
  while (
    (rule = parser.match(/^\s*([^{}]*?)\s*\{([^{}]*?)\}/, true) as RegExpMatchArray | undefined)
  ) {
    const css = parseStyleAttr(rule[2]);
    for (const rawSelector of rule[1].split(/\s*,\s*/g)) {
      const selector = parseSelector(rawSelector);
      if (selector) rules.push({ selector, css });
    }
  }
  return rules;
}

export function matchesSelector(elem: SvgNode, selector: Selector): boolean {
  if (elem.nodeType !== 1) return false;
  for (const tag of selector.tags) if (tag !== elem.nodeName) return false;
  for (const id of selector.ids) if (id !== elem.id) return false;
  for (const className of selector.classes) {
    if (!elem.classList.includes(className)) return false;
  }
  return true;
}

export function getStyle(elem: SvgNode, rules: StyleRule[]): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  const specificities: Record<string, number> = Object.create(null);
  for (const rule of rules) {
    if (!matchesSelector(elem, rule.selector)) continue;
    for (const key in rule.css) {
      if (!(specificities[key] > rule.selector.specificity)) {
        result[key] = rule.css[key];
        specificities[key] = rule.selector.specificity;
      }
    }
  }
  return result;
}

export function combineArrays<T>(array1: T[], array2: T[]): T[] {
  return array1.concat(array2.slice(array1.length));
}

const UNIT_FACTORS: Record<string, number> = {
  '': 1,
  px: 1,
  pt: 96 / 72,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  in: 96,
  pc: 96 / 6,
};

/**
 * Resolves properties for one SVG element, with caching and inheritance
 * delegated to the parent resolver.
 */
export class StyleResolver {
  readonly elem: SvgNode;
  readonly inherits: StyleResolver | null;
  readonly style: Record<string, string>;
  readonly css: Record<string, string>;
  private readonly cache: Record<string, unknown> = Object.create(null);

  constructor(
    private readonly host: StyleContext,
    private readonly properties: Record<string, StylePropertySpec>,
    elem: SvgNode,
    inherits: StyleResolver | null,
    rules: StyleRule[],
  ) {
    this.elem = elem;
    this.inherits = inherits;
    this.style = parseStyleAttr(elem.getAttribute('style'));
    this.css = getStyle(elem, rules);
  }

  /**
   * Resolve a property, honouring inline style, CSS, attributes and
   * inheritance. `kind` tells `colorCallback` which paint the property is
   * being resolved for.
   */
  get(key: string, kind?: PaintKind): ResolvedStyle {
    const cached = this.cache[key];
    if (cached !== undefined) return cached;

    const keyInfo = this.properties[key] ?? {};
    for (let i = 0; i < 3; i++) {
      const value =
        i === 0
          ? this.style[key]
          : i === 1
            ? this.css[keyInfo.css || key]
            : (this.elem.getAttribute(key) ?? undefined);

      if (value === 'inherit') {
        const inherited = this.inherits ? this.inherits.get(key) : keyInfo.initial;
        if (inherited != null) return (this.cache[key] = inherited);
      }
      if (keyInfo.values != null) {
        const mapped = keyInfo.values[value as string];
        if (mapped != null) return (this.cache[key] = mapped);
      }
      if (value == null) continue;

      const resolved = this.parseValue(key, value, keyInfo, kind);
      if (resolved !== undefined) return (this.cache[key] = resolved);
    }
    return (this.cache[key] =
      keyInfo.inherit && this.inherits ? this.inherits.get(key) : keyInfo.initial);
  }

  /** Convert a length in this element's user units. */
  computeUnits(
    value: number,
    unit: string,
    percent: number | undefined,
    isFontSize: boolean,
  ): number {
    if (unit === '%') {
      const base = isFontSize || percent != null ? percent! : this.host.elemViewport(this.elem);
      return (value / 100) * base;
    }
    if (unit === 'ex' || unit === 'em') {
      const size = isFontSize ? percent! : this.host.elemFontSize(this);
      return value * { em: 1, ex: 0.5 }[unit]! * size;
    }
    return value * (UNIT_FACTORS[unit] ?? 1);
  }

  /** Parse a length with an optional unit, falling back to `initial`. */
  computeLength(
    value: string,
    percent: number | undefined,
    initial: number | undefined,
    isFontSize = false,
  ): number | undefined {
    const parser = new StringParser((value || '').trim());
    const num = parser.matchNumber();
    const unit = parser.matchLengthUnit();
    if (typeof num === 'string' && typeof unit === 'string' && !parser.matchAll()) {
      return this.computeUnits(Number(num), unit, percent, isFontSize);
    }
    return initial;
  }

  /** Parse a whitespace-separated list of lengths. */
  computeLengthList(
    value: string,
    percent: number | undefined,
    strict: boolean,
  ): number[] | undefined {
    const parser = new StringParser((value || '').trim());
    const result: number[] = [];
    let num: string | undefined;
    let unit: string | undefined;
    while (
      typeof (num = parser.matchNumber()) === 'string' &&
      typeof (unit = parser.matchLengthUnit()) === 'string'
    ) {
      result.push(this.computeUnits(Number(num), unit, percent, false));
      parser.matchSeparator();
    }
    if (strict && parser.matchAll()) return undefined;
    return result;
  }

  /** Parse a whitespace-separated list of numbers (no units). */
  parseNumberList(value: string): number[] & { error?: string } {
    const parser = new StringParser((value || '').trim());
    const result: number[] & { error?: string } = [];
    let temp: string | undefined;
    while ((temp = parser.matchNumber())) {
      result.push(Number(temp));
      parser.matchSeparator();
    }
    const error = parser.matchAll();
    if (error) result.error = error;
    return result;
  }

  /** Resolve a `url(#id)` / `url(file#id)` reference to an element. */
  resolveUrl(value: string): SvgNode | null {
    const temp =
      (value || '').match(
        /^\s*(?:url\("(.*)#(.*)"\)|url\('(.*)#(.*)'\)|url\((.*)#(.*)\)|(.*)#(.*))\s*$/,
      ) ?? [];
    const file = temp[1] || temp[3] || temp[5] || temp[7];
    const id = temp[2] || temp[4] || temp[6] || temp[8];
    if (!id) return null;

    if (!file) {
      const target = this.host.root?.getElementById(id);
      if (target) {
        if (!this.host.stack.includes(target)) return target;
        this.host.warn(`SVGtoPDF: loop of circular references for id "${id}"`);
        return null;
      }
    }
    if (this.host.documentCallback) {
      let docs = this.host.documentCache[file];
      if (!docs) {
        const loaded = this.host.documentCallback(file);
        docs = (Array.isArray(loaded) ? loaded : [loaded]) as SvgNode[];
        this.host.documentCache[file] = docs;
      }
      for (const doc of docs) {
        const target = doc.getElementById(id);
        if (target) {
          if (!this.host.stack.includes(target)) return target;
          this.host.warn(`SVGtoPDF: loop of circular references for id "${file}#${id}"`);
          return null;
        }
      }
    }
    return null;
  }

  private parseValue(
    key: string,
    value: string,
    keyInfo: StylePropertySpec,
    kind?: PaintKind,
  ): ResolvedStyle {
    switch (key) {
      case 'font-size':
        return this.computeLength(
          value,
          this.inherits ? (this.inherits.get(key) as number) : (keyInfo.initial as number),
          undefined,
          true,
        );
      case 'baseline-shift':
        return this.computeLength(value, this.host.elemFontSize(this), undefined);
      case 'font-family':
        return value || undefined;
      case 'opacity':
      case 'stroke-opacity':
      case 'fill-opacity':
      case 'stop-opacity': {
        const num = parseFloat(value);
        return isNaN(num) ? undefined : Math.max(0, Math.min(1, num));
      }
      case 'transform':
        return parseTransform(value);
      case 'transform-origin':
        return parseTransformOrigin(value) as TransformOriginFn;
      case 'stroke-dasharray':
        return this.parseDashArray(value);
      case 'color':
        if (value === 'none' || value === 'transparent') return 'none';
        // Parsed without `colorCallback`: `color` only exists as a
        // source for `currentColor`, and mapping it here would invoke
        // the callback without knowing which paint consumes it. The
        // raw value travels with it so `currentColor` can report the
        // color it actually resolved to.
        {
          const parsed = parseColor(value, this.host.cmyk, null);
          return parsed ? { value: parsed, raw: value } : undefined;
        }
      case 'fill':
      case 'stroke':
      case 'stop-color':
        return this.parsePaint(value, kind);
      case 'marker-start':
      case 'marker-mid':
      case 'marker-end':
      case 'clip-path':
      case 'mask':
        return value === 'none' ? 'none' : this.resolveUrl(value);
      case 'stroke-width': {
        const width = this.computeLength(value, this.host.elemViewport(this.elem), undefined);
        return width != null && width >= 0 ? width : undefined;
      }
      case 'stroke-miterlimit': {
        const limit = parseFloat(value);
        return limit >= 1 ? limit : undefined;
      }
      case 'word-spacing':
      case 'letter-spacing':
      case 'stroke-dashoffset':
        return this.computeLength(value, this.host.elemViewport(this.elem), undefined);
      default:
        return undefined;
    }
  }

  private parseDashArray(value: string): number[] | undefined {
    if (value === 'none') return [];
    const parsed = this.computeLengthList(value, this.host.elemViewport(this.elem), true);
    if (!parsed) return undefined;
    let sum = 0;
    for (const length of parsed) {
      if (length < 0) return undefined;
      sum += length;
    }
    if (sum === 0) return [];
    return parsed.length % 2 === 1 ? parsed.concat(parsed) : parsed;
  }

  private parsePaint(value: string, kind?: PaintKind): ResolvedStyle {
    if (value === 'none' || value === 'transparent') return 'none';
    if (value === 'currentColor') {
      const current = this.get('color') as { value: ParsedColor; raw: string } | 'none' | undefined;
      // The initial value of `color` is black.
      if (current === undefined || current === 'none') {
        return this.mapColor([NAMED_COLORS.black, 1], '#000000', kind);
      }
      return this.mapColor(current.value, current.raw, kind);
    }

    const parsed = parseColor(value, this.host.cmyk, null);
    if (parsed) return this.mapColor(parsed, value, kind);

    const parts = (value || '').split(' ');
    const object = this.resolveUrl(parts[0]);
    const fallbackColor =
      parts[1] !== undefined
        ? this.mapColor(parseColor(parts[1], this.host.cmyk, null), parts[1], kind)
        : undefined;
    if (object == null) return fallbackColor;
    if (
      object.nodeName === 'linearGradient' ||
      object.nodeName === 'radialGradient' ||
      object.nodeName === 'pattern'
    ) {
      return this.host.createPaintServer(object, fallbackColor);
    }
    return fallbackColor;
  }

  /** Hand a parsed color to `colorCallback`, if one is configured. */
  private mapColor(
    color: ParsedColor | undefined,
    raw: string,
    kind?: PaintKind,
  ): ParsedColor | undefined {
    if (color === undefined) return undefined;
    const callback = this.host.colorCallback;
    return callback ? callback(color, raw, kind) : color;
  }
}
