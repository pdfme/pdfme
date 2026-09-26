import { PDFRenderProps } from '@pdfme/common';
import type { SvgColorMapper } from '@pdfme/pdf-lib';
import { popGraphicsState, pushGraphicsState, rotateDegrees, translate } from '@pdfme/pdf-lib';
import { convertForPdfLayoutProps, hex2PrintingColor, rgbColorToCmykColor } from '../utils.js';
import type { BarcodeSchema } from './types.js';
import { createBarCodeSvg, ensureHexColorHash, validateBarcodeInput } from './helper.js';

const getBarcodeCacheKey = (schema: BarcodeSchema, value: string) => {
  return `svg:${schema.type}:${schema.width}:${schema.height}:${schema.barColor}:${schema.textColor}:${schema.includetext}:${value}`;
};

const addSvgOpacity = (svg: string, opacity?: number) => {
  return opacity === undefined ? svg : svg.replace(/<svg\b/, `<svg opacity="${opacity}"`);
};

// Split a '#RGBA'/'#RRGGBBAA' hex into its opaque color and alpha channel,
// since pdf-lib colors carry no alpha.
const splitHexAlpha = (hexColor: string): { color: string; alpha: number } => {
  const hex = hexColor.slice(1);
  if (hex.length !== 4 && hex.length !== 8) return { color: hexColor, alpha: 1 };
  const rgbLength = hex.length === 4 ? 3 : 6;
  const alphaHex = hex.slice(rgbLength);
  return {
    color: `#${hex.slice(0, rgbLength)}`,
    alpha: parseInt(alphaHex.length === 1 ? alphaHex.repeat(2) : alphaHex, 16) / 255,
  };
};

const getSvgColorMapper = (colorType = ''): SvgColorMapper | undefined => {
  return colorType.toLowerCase() === 'cmyk'
    ? ({ parsed }) => ({
        color: rgbColorToCmykColor(parsed.rgb),
        alpha: parsed.alpha,
      })
    : undefined;
};

export const pdfRender = async (arg: PDFRenderProps<BarcodeSchema>) => {
  const { value, schema, page, options, _cache } = arg;
  if (!validateBarcodeInput(schema.type, value)) return;

  const inputBarcodeCacheKey = getBarcodeCacheKey(schema, value);
  let svg = _cache.get(inputBarcodeCacheKey) as string | undefined;
  if (!svg) {
    svg = createBarCodeSvg({
      ...schema,
      backgroundColor: undefined,
      type: schema.type,
      input: value,
    });
    // Stretch to the schema box like the pre-SVG raster rendering did.
    svg = svg.replace(/<svg\b/, '<svg preserveAspectRatio="none"');
    _cache.set(inputBarcodeCacheKey, svg);
  }

  const pageHeight = page.getHeight();
  const {
    width,
    height,
    position: { x, y },
    opacity,
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

  const pivot = { x: x + width / 2, y: y + height / 2 };
  const rotate = schema.rotate ? -schema.rotate : 0;
  if (rotate) {
    page.pushOperators(
      pushGraphicsState(),
      translate(pivot.x, pivot.y),
      rotateDegrees(rotate),
      translate(-pivot.x, -pivot.y),
    );
  }

  try {
    const backgroundHex = ensureHexColorHash(schema.backgroundColor);
    if (backgroundHex) {
      const { color: backgroundColorHex, alpha } = splitHexAlpha(backgroundHex);
      const backgroundColor =
        alpha > 0 ? hex2PrintingColor(backgroundColorHex, options.colorType) : undefined;
      if (backgroundColor) {
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: backgroundColor,
          opacity: (opacity ?? 1) * alpha,
        });
      }
    }

    await page.drawSvg(addSvgOpacity(svg, opacity), {
      x,
      y: y + height,
      width,
      height,
      mapColor: getSvgColorMapper(options.colorType),
    });
  } finally {
    if (rotate) page.pushOperators(popGraphicsState());
  }
};
