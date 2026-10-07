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
  getSvgViewBoxSize,
  normalizeBarcodeFit,
  validateBarcodeInput,
} from './helper.js';

const getBarcodeCacheKey = (schema: BarcodeSchema, value: string) => {
  const fit = normalizeBarcodeFit(schema.fit);
  const size = fit === 'contain' ? 'natural' : `${schema.width}:${schema.height}`;
  return `svg:${schema.type}:${fit}:${size}:${schema.barColor}:${schema.textColor}:${schema.includetext}:${value}`;
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

  const inputBarcodeCacheKey = getBarcodeCacheKey(schema, value);
  let svg = _cache.get(inputBarcodeCacheKey) as string | undefined;
  if (!svg) {
    svg = createBarCodeSvg({
      ...schema,
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

  const fit = normalizeBarcodeFit(schema.fit);

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

    const natural = fit === 'contain' ? getSvgViewBoxSize(svg) : undefined;
    const layout = getBarcodeFitLayout({
      fit,
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
