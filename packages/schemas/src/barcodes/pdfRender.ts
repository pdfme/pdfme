import { PDFRenderProps } from '@pdfme/common';
import type { SvgColorMapper } from '@pdfme/pdf-lib';
import { popGraphicsState, pushGraphicsState, rotateDegrees, translate } from '@pdfme/pdf-lib';
import {
  applyAlphaToOpacity,
  convertForPdfLayoutProps,
  hex2PrintingColor,
  rgbColorToCmykColor,
  splitHexAlpha,
} from '../utils.js';
import type { BarcodeSchema } from './types.js';
import {
  createBarCodeSvg,
  ensureHexColorHash,
  getBarcodeFitLayout,
  getNaturalBarcodeSize,
  isAspectRatioLockedBarcodeType,
  validateBarcodeInput,
} from './helper.js';

type Size = { width: number; height: number };

const getBarcodeCacheKey = (schema: BarcodeSchema, size: Size, value: string) => {
  return `svg:${schema.type}:${size.width}:${size.height}:${schema.barColor}:${schema.textColor}:${schema.includetext}:${value}`;
};

const getNaturalSize = (
  schema: BarcodeSchema,
  value: string,
  cache: Map<string | number, unknown>,
): Size | undefined => {
  if (!isAspectRatioLockedBarcodeType(schema.type)) return undefined;
  const key = `svg-natural:${schema.type}:${schema.includetext}:${value}`;
  if (cache.has(key)) return cache.get(key) as Size | undefined;
  const size = getNaturalBarcodeSize(schema, value);
  cache.set(key, size);
  return size;
};

const addSvgOpacity = (svg: string, opacity?: number) => {
  return opacity === undefined ? svg : svg.replace(/<svg\b/, `<svg opacity="${opacity}"`);
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

  // Locked types are fitted to their natural ratio (in mm) before bwip-js renders them,
  // so a box that already has that ratio renders exactly as a plain stretch would.
  const natural = getNaturalSize(schema, value, _cache);
  const fitted = getBarcodeFitLayout({
    boxWidth: schema.width,
    boxHeight: schema.height,
    naturalWidth: natural?.width,
    naturalHeight: natural?.height,
  });
  const inputBarcodeCacheKey = getBarcodeCacheKey(schema, fitted, value);
  let svg = _cache.get(inputBarcodeCacheKey) as string | undefined;
  if (!svg) {
    svg = createBarCodeSvg({
      ...schema,
      width: fitted.width,
      height: fitted.height,
      backgroundColor: undefined,
      type: schema.type,
      input: value,
    });
    // pdf-lib's preserveAspectRatio "meet" picks scale by target orientation
    // (scale = targetWidth > targetHeight ? scaleY : scaleX) instead of
    // min(scaleX, scaleY), so a wide symbol in a less-wide box overflows and
    // gets clipped. Compute the contain rect in pdfme and always inject "none".
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
          opacity: applyAlphaToOpacity(opacity, alpha),
        });
      }
    }

    const layout = getBarcodeFitLayout({
      boxWidth: width,
      boxHeight: height,
      naturalWidth: natural?.width,
      naturalHeight: natural?.height,
    });
    await page.drawSvg(addSvgOpacity(svg, opacity), {
      x: x + layout.offsetX,
      // drawSvg's y is the top edge of the graphic (PDF y grows upward).
      y: y + height - layout.offsetY,
      width: layout.width,
      height: layout.height,
      mapColor: getSvgColorMapper(options.colorType),
    });
  } finally {
    if (rotate) page.pushOperators(popGraphicsState());
  }
};
