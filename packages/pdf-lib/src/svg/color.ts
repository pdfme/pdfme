/**
 * Color parsing.
 *
 * Colors are kept in the shape the rest of the converter expects: a value
 * (component list or spot-color name) plus an alpha multiplier. RGB components
 * are 0-255, CMYK components 0-1.
 */

/** A color value: numeric components, or the name of a spot color. */
export type ColorValue = number[] | string;

/** A color value together with its alpha, as produced by {@link parseColor}. */
export type ParsedColor = [ColorValue, number];

/** Which paint a color is being resolved for. */
export type PaintKind = 'fill' | 'stroke';

/**
 * Transforms a parsed color before it is applied. Return `undefined` to reject
 * the color, in which case the paint is left alone. `kind` reports whether the
 * color came from `fill` or `stroke`; it is undefined for colors resolved
 * outside a paint context, such as `stop-color`.
 */
export type ColorCallback = (
  color: ParsedColor,
  raw?: string,
  kind?: PaintKind,
) => ParsedColor | undefined;

export const NAMED_COLORS: Record<string, number[]> = {
  aliceblue: [240, 248, 255],
  antiquewhite: [250, 235, 215],
  aqua: [0, 255, 255],
  aquamarine: [127, 255, 212],
  azure: [240, 255, 255],
  beige: [245, 245, 220],
  bisque: [255, 228, 196],
  black: [0, 0, 0],
  blanchedalmond: [255, 235, 205],
  blue: [0, 0, 255],
  blueviolet: [138, 43, 226],
  brown: [165, 42, 42],
  burlywood: [222, 184, 135],
  cadetblue: [95, 158, 160],
  chartreuse: [127, 255, 0],
  chocolate: [210, 105, 30],
  coral: [255, 127, 80],
  cornflowerblue: [100, 149, 237],
  cornsilk: [255, 248, 220],
  crimson: [220, 20, 60],
  cyan: [0, 255, 255],
  darkblue: [0, 0, 139],
  darkcyan: [0, 139, 139],
  darkgoldenrod: [184, 134, 11],
  darkgray: [169, 169, 169],
  darkgrey: [169, 169, 169],
  darkgreen: [0, 100, 0],
  darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139],
  darkolivegreen: [85, 107, 47],
  darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204],
  darkred: [139, 0, 0],
  darksalmon: [233, 150, 122],
  darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139],
  darkslategray: [47, 79, 79],
  darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209],
  darkviolet: [148, 0, 211],
  deeppink: [255, 20, 147],
  deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105],
  dimgrey: [105, 105, 105],
  dodgerblue: [30, 144, 255],
  firebrick: [178, 34, 34],
  floralwhite: [255, 250, 240],
  forestgreen: [34, 139, 34],
  fuchsia: [255, 0, 255],
  gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255],
  gold: [255, 215, 0],
  goldenrod: [218, 165, 32],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  green: [0, 128, 0],
  greenyellow: [173, 255, 47],
  honeydew: [240, 255, 240],
  hotpink: [255, 105, 180],
  indianred: [205, 92, 92],
  indigo: [75, 0, 130],
  ivory: [255, 255, 240],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  lavenderblush: [255, 240, 245],
  lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205],
  lightblue: [173, 216, 230],
  lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255],
  lightgoldenrodyellow: [250, 250, 210],
  lightgray: [211, 211, 211],
  lightgrey: [211, 211, 211],
  lightgreen: [144, 238, 144],
  lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122],
  lightseagreen: [32, 178, 170],
  lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153],
  lightslategrey: [119, 136, 153],
  lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224],
  lime: [0, 255, 0],
  limegreen: [50, 205, 50],
  linen: [250, 240, 230],
  magenta: [255, 0, 255],
  maroon: [128, 0, 0],
  mediumaquamarine: [102, 205, 170],
  mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211],
  mediumpurple: [147, 112, 219],
  mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238],
  mediumspringgreen: [0, 250, 154],
  mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133],
  midnightblue: [25, 25, 112],
  mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225],
  moccasin: [255, 228, 181],
  navajowhite: [255, 222, 173],
  navy: [0, 0, 128],
  oldlace: [253, 245, 230],
  olive: [128, 128, 0],
  olivedrab: [107, 142, 35],
  orange: [255, 165, 0],
  orangered: [255, 69, 0],
  orchid: [218, 112, 214],
  palegoldenrod: [238, 232, 170],
  palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238],
  palevioletred: [219, 112, 147],
  papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185],
  peru: [205, 133, 63],
  pink: [255, 192, 203],
  plum: [221, 160, 221],
  powderblue: [176, 224, 230],
  purple: [128, 0, 128],
  rebeccapurple: [102, 51, 153],
  red: [255, 0, 0],
  rosybrown: [188, 143, 143],
  royalblue: [65, 105, 225],
  saddlebrown: [139, 69, 19],
  salmon: [250, 128, 114],
  sandybrown: [244, 164, 96],
  seagreen: [46, 139, 87],
  seashell: [255, 245, 238],
  sienna: [160, 82, 45],
  silver: [192, 192, 192],
  skyblue: [135, 206, 235],
  slateblue: [106, 90, 205],
  slategray: [112, 128, 144],
  slategrey: [112, 128, 144],
  snow: [255, 250, 250],
  springgreen: [0, 255, 127],
  steelblue: [70, 130, 180],
  tan: [210, 180, 140],
  teal: [0, 128, 128],
  thistle: [216, 191, 216],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
  wheat: [245, 222, 179],
  white: [255, 255, 255],
  whitesmoke: [245, 245, 245],
  yellow: [255, 255, 0],
};

/** Convert 0-255 RGB components to 0-1 CMYK components. */
export function rgb2cmyk(color: number[]): number[] {
  const [r, g, b] = color;
  if (r == null || g == null || b == null || isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error('Please enter numeric RGB values!');
  }
  if (r < 0 || g < 0 || b < 0 || r > 255 || g > 255 || b > 255) {
    throw new Error('RGB values must be in the range 0 to 255.');
  }
  if (r === 0 && g === 0 && b === 0) return [0, 0, 0, 1];

  let c = 1 - r / 255;
  let m = 1 - g / 255;
  let y = 1 - b / 255;
  const k = Math.min(c, m, y);
  c = (c - k) / (1 - k);
  m = (m - k) / (1 - k);
  y = (y - k) / (1 - k);
  return [c, m, y, k];
}

function hslToRgb(h: number, s: number, l: number): number[] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, h) * 255),
    Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  ];
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** The default paints: black, white and transparent black. */
export function createDefaultColors(cmyk: boolean): Record<string, ParsedColor> {
  const convert = (rgb: number[]): number[] => (cmyk ? rgb2cmyk(rgb) : rgb);
  return {
    black: [convert(NAMED_COLORS.black), 1],
    white: [convert(NAMED_COLORS.white), 1],
    transparent: [convert(NAMED_COLORS.black), 0],
  };
}

/** Look up a named color, honoring the `cmyk` option. */
export function lookupNamedColor(name: string, cmyk: boolean): number[] | undefined {
  const rgb = NAMED_COLORS[name];
  if (!rgb) return undefined;
  return cmyk ? rgb2cmyk(rgb) : rgb.slice();
}

/**
 * Parse a CSS color value. Returns `[value, alpha]`, or `undefined` when the
 * value is not a color at all.
 */
export function parseColor(
  raw: string,
  cmyk: boolean,
  colorCallback: ColorCallback | null,
  kind?: PaintKind,
): ParsedColor | undefined {
  raw = (raw || '').trim();
  let temp: RegExpMatchArray | null;

  const finish = (result: ParsedColor): ParsedColor | undefined =>
    colorCallback ? colorCallback(result, raw, kind) : result;

  if ((temp = /^[a-z]+$/i.exec(raw)) && NAMED_COLORS[temp[0]]) {
    return finish([lookupNamedColor(temp[0], cmyk)!, 1]);
  }
  if (
    (temp = raw.match(/^cmyk\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i))
  ) {
    const c = parseFloat(temp[1]);
    const m = parseFloat(temp[2]);
    const y = parseFloat(temp[3]);
    const k = parseFloat(temp[4]);
    if (c <= 100 && m <= 100 && y <= 100 && k <= 100) {
      return finish([[c / 100, m / 100, y / 100, k / 100], 1]);
    }
  } else if (
    (temp = raw.match(/^rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i))
  ) {
    const r = parseFloat(temp[1]);
    const g = parseFloat(temp[2]);
    const b = parseFloat(temp[3]);
    const a = parseFloat(temp[4]);
    if (r < 256 && g < 256 && b < 256 && a <= 1) {
      return finish([[r, g, b], a]);
    }
  } else if ((temp = raw.match(/^rgb\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i))) {
    const r = parseFloat(temp[1]);
    const g = parseFloat(temp[2]);
    const b = parseFloat(temp[3]);
    if (r < 256 && g < 256 && b < 256) return finish([[r, g, b], 1]);
  } else if ((temp = raw.match(/^rgb\(\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/i))) {
    const r = parseFloat(temp[1]);
    const g = parseFloat(temp[2]);
    const b = parseFloat(temp[3]);
    if (r <= 100 && g <= 100 && b <= 100) return finish([[r * 2.55, g * 2.55, b * 2.55], 1]);
  } else if (
    (temp = raw.match(
      /^hsla\(\s*([0-9.]+)(?:deg)?\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)\s*\)$/i,
    ))
  ) {
    const h = parseFloat(temp[1]);
    const s = parseFloat(temp[2]);
    const l = parseFloat(temp[3]);
    const a = parseFloat(temp[4]);
    if (h <= 360 && s <= 100 && l <= 100 && a <= 1) {
      return finish([hslToRgb(h / 360, s / 100, l / 100), a]);
    }
  } else if (
    (temp = raw.match(/^hsl\(\s*([0-9.]+)(?:deg)?\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/i))
  ) {
    const h = parseFloat(temp[1]);
    const s = parseFloat(temp[2]);
    const l = parseFloat(temp[3]);
    if (h <= 360 && s <= 100 && l <= 100) {
      return finish([hslToRgb(h / 360, s / 100, l / 100), 1]);
    }
  } else if ((temp = raw.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i))) {
    return finish([[parseInt(temp[1], 16), parseInt(temp[2], 16), parseInt(temp[3], 16)], 1]);
  } else if ((temp = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i))) {
    return finish([
      [0x11 * parseInt(temp[1], 16), 0x11 * parseInt(temp[2], 16), 0x11 * parseInt(temp[3], 16)],
      1,
    ]);
  } else if (!raw.startsWith('url(')) {
    // Not a CSS color: treat it as a spot-color name. Spaces are escaped so
    // the name survives as a single PDF string.
    return finish([raw.replace(/ /g, '#20'), 1]);
  }
  return undefined;
}

/** Multiply a color's alpha by `opacity`. */
export function opacityToColor(color: ParsedColor, opacity: number, isMask: boolean): ParsedColor {
  if (typeof color[0] === 'string') return [color[0], color[1] * opacity];

  const value = color[0].slice();
  const newOpacity = color[1] * opacity;
  if (isMask) {
    // Masks are evaluated from the color's luminance, so the opacity has to
    // be baked into the components.
    for (let i = 0; i < color.length; i++) value[i] *= newOpacity;
    return [value, 1];
  }
  return [value, newOpacity];
}

/** True when the value names a spot color rather than giving components. */
export function isSpotColor(color: ColorValue): color is string {
  return typeof color === 'string';
}
