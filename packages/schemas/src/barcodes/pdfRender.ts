import { PDFRenderProps } from '@pdfme/common';
import type { SvgColorMapper } from '@pdfme/pdf-lib';
import {
  popGraphicsState,
  pushGraphicsState,
  rotateDegrees,
  translate,
} from '@pdfme/pdf-lib';
import { convertForPdfLayoutProps, hex2PrintingColor, rgbColorToCmykColor } from '../utils.js';
import type { BarcodeSchema } from './types.js';
import { createBarCodeSvg, validateBarcodeInput } from './helper.js';

const getBarcodeCacheKey = (schema: BarcodeSchema, value: string) => {
  return `svg:${schema.type}:${schema.width}:${schema.height}:${schema.backgroundColor}:${schema.barColor}:${schema.textColor}:${schema.includetext}:${value}`;
};

const addSvgOpacity = (svg: string, opacity?: number) => {
  return opacity === undefined ? svg : svg.replace(/<svg\b/, `<svg opacity="${opacity}"`);
};

const setSvgRootAttribute = (svg: string, name: string, value: string) => {
  const attrRegex = new RegExp(`\\s${name}="[^"]*"`);
  return svg.replace(/<svg\b([^>]*)>/, (_, attrs: string) => {
    const nextAttrs = attrRegex.test(attrs)
      ? attrs.replace(attrRegex, ` ${name}="${value}"`)
      : `${attrs} ${name}="${value}"`;
    return `<svg${nextAttrs}>`;
  });
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
    svg = setSvgRootAttribute(svg, 'preserveAspectRatio', 'none');
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
    const backgroundColor = hex2PrintingColor(schema.backgroundColor, options.colorType);
    if (backgroundColor) {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: backgroundColor,
        opacity,
      });
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
