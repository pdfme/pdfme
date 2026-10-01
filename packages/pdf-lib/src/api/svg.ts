import { colorToComponents, componentsToColor, type Color, type RGB } from './colors.js';
import type PDFFont from './PDFFont.js';
import type PDFPage from './PDFPage.js';
import type { PDFPageDrawSVGElementOptions, SvgColorMapper } from './PDFPageOptions.js';
import { drawSvgToPage } from '../svg/convert.js';
import type { ParsedColor, PaintKind } from '../svg/color.js';

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

    const mapped = mapColor({
      color: raw ?? '',
      parsed: {
        rgb: componentsToColor(components.slice(0, 3), 1 / 255) as RGB,
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
const toFontCallback =
  (fonts: { [fontName: string]: PDFFont } | undefined, page: PDFPage) =>
  (family: string): PDFFont => {
    const normalized = family.toLowerCase().replace(/["']/g, '').split(',')[0].trim();
    const found = (fonts && (fonts[normalized] ?? fonts[family])) || page.getFont()[0];
    return found;
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
