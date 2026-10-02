import { colorToComponents, componentsToColor, rgb, type Color, type RGB } from './colors.js';
import type PDFFont from './PDFFont.js';
import type PDFPage from './PDFPage.js';
import type { PDFPageDrawSVGElementOptions, SvgColorMapper } from './PDFPageOptions.js';
import { drawSvgToPage } from '../svg/convert.js';
import type { ParsedColor, PaintKind } from '../svg/color.js';

/** Convert 0-1 CMYK components to pdf-lib's 0-1 RGB. */
const cmykToRgb = ([c, m, y, k]: [number, number, number, number]): RGB =>
  rgb(1 - Math.min(1, c + k), 1 - Math.min(1, m + k), 1 - Math.min(1, y + k));

/**
 * Adapt {@link SvgColorMapper} to the converter's color callback.
 *
 * The converter calls the callback once per resolved fill or stroke, with the
 * color still in its own units (0-255 for RGB, 0-1 for CMYK), so this converts
 * to and from pdf-lib's 0-1 representation.
 */
const toColorCallback =
  (mapColor: SvgColorMapper | undefined) =>
  (color: ParsedColor, raw?: string, kind?: PaintKind): ParsedColor => {
    const [components, alpha] = color;
    // Spot colors are passed through untouched.
    if (typeof components === 'string') return color;
    if (!mapColor) return color;

    // `parsed.rgb` is always RGB, so a CMYK paint has to be converted first:
    // its components are 0-1, not 0-255 like the converter's RGB form.
    const rgb: RGB =
      components.length === 4
        ? cmykToRgb(components as [number, number, number, number])
        : (componentsToColor(components, 1 / 255) as RGB);
    const mapped = mapColor({
      color: raw ?? '',
      parsed: {
        rgb,
        alpha: alpha === 1 ? undefined : alpha,
      },
      kind: kind ?? 'fill',
    });
    if (!mapped) return color;
    const mappedComponents = colorToComponents(mapped.color as Color);
    const scaled =
      mapped.color.type === 'RGB' ? mappedComponents.map((c) => c * 255) : mappedComponents;
    return [scaled, mapped.alpha ?? alpha];
  };

/**
 * Resolve a CSS font family against the `fonts` option, falling back to the
 * page font the way the previous implementation did.
 */
/**
 * Resolve a CSS font family, weight and slant against the `fonts` option.
 *
 * Keys may carry a variant suffix (`Helvetica_bold_italic`), matching the
 * lookup the previous implementation did, so callers keep working.
 */
const toFontCallback =
  (fonts: { [fontName: string]: PDFFont } | undefined, page: PDFPage) =>
  (family: string, bold: boolean, italic: boolean): PDFFont => {
    // SVG font lists may be quoted and comma separated; the first family is
    // the one to match, and it is matched case-insensitively as CSS requires.
    const requested = family.toLowerCase().replace(/["']/g, '').split(',')[0].trim();
    if (!fonts) return page.getFont()[0];

    // Accept the keys both as written by the caller and lower-cased, so that
    // `fonts: { Helvetica_bold }` and `fonts: { 'helvetica_bold' }` both work.
    const names = Object.keys(fonts);
    const match = (b: boolean, i: boolean): PDFFont | undefined => {
      const wanted = `${requested}${b ? '_bold' : ''}${i ? '_italic' : ''}`;
      const key = names.find((n) => n.toLowerCase() === wanted);
      return key === undefined ? undefined : fonts[key];
    };
    const prefixed = names.find((name) => name.toLowerCase().startsWith(requested));
    return (
      match(bold, italic) ??
      match(bold, false) ??
      match(false, italic) ??
      match(false, false) ??
      (prefixed ? fonts[prefixed] : undefined) ??
      page.getFont()[0]
    );
  };

/**
 * Draw an SVG document onto a page.
 *
 * See {@link PDFPage.drawSvg} for the public entry point.
 */
export const drawSvg = async (
  page: PDFPage,
  svg: string,
  options: PDFPageDrawSVGElementOptions = {},
): Promise<void> => {
  if (!svg) return;
  drawSvgToPage(page, svg, options.x ?? 0, options.y ?? 0, {
    // `PDFPage.drawSvg` positions the SVG by its top edge, not its bottom.
    anchorY: 'top',
    width: options.width,
    height: options.height,
    initialFontSize: options.fontSize,
    fontCallback: toFontCallback(options.fonts, page),
    colorCallback: toColorCallback(options.mapColor),
  });
};
