import { PDFRenderProps } from '@pdfme/common';
import { convertForPdfLayoutProps } from '../utils.js';
import type { BarcodeSchema } from './types.js';
import { createBarCode, createBarCodeSvg, validateBarcodeInput } from './helper.js';
import { PDFImage } from '@pdfme/pdf-lib';

const getBarcodeCacheKey = (schema: BarcodeSchema, value: string) => {
  const {
    type,
    backgroundColor,
    barColor,
    textColor,
    includetext,
    alttext,
    textxalign,
    textsize,
    textyoffset,
    scale,
    scaleX,
    scaleY,
    padding,
    paddingtop,
    paddingleft,
    paddingright,
    paddingbottom,
    inkspread,
    showBorder,
    eclevel,
    version,
    mask,
    qzone,
    columns,
    rows,
    compact,
    format,
  } = schema;
  return JSON.stringify({
    type,
    backgroundColor,
    barColor,
    textColor,
    includetext,
    alttext,
    textxalign,
    textsize,
    textyoffset,
    scale,
    scaleX,
    scaleY,
    padding,
    paddingtop,
    paddingleft,
    paddingright,
    paddingbottom,
    inkspread,
    showBorder,
    eclevel,
    version,
    mask,
    qzone,
    columns,
    rows,
    compact,
    format,
    value,
  });
};

export const pdfRender = async (arg: PDFRenderProps<BarcodeSchema>) => {
  const { value, schema, pdfDoc, page, _cache } = arg;
  if (!validateBarcodeInput(schema.type, value)) return;

  const inputBarcodeCacheKey = getBarcodeCacheKey(schema, value);
  // Prefer SVG when requested; fall back to PNG if SVG is unavailable (e.g., in browser builds)
  let image: PDFImage | undefined;
  let svgStr: string | undefined;
  if (schema.format === 'svg') {
    svgStr = _cache.get(inputBarcodeCacheKey) as unknown as string | undefined;
    if (!svgStr) {
      svgStr = await createBarCodeSvg({ ...schema, type: schema.type, input: value });
      _cache.set(inputBarcodeCacheKey, svgStr as unknown as PDFImage);
    }
    if (!svgStr) {
      image = _cache.get(inputBarcodeCacheKey + ':png') as PDFImage | undefined;
      if (!image) {
        const imageBuf = await createBarCode({ ...schema, type: schema.type, input: value });
        image = await pdfDoc.embedPng(imageBuf);
        _cache.set(inputBarcodeCacheKey + ':png', image);
      }
    }
  } else {
    image = _cache.get(inputBarcodeCacheKey) as PDFImage | undefined;
    if (!image) {
      const imageBuf = await createBarCode({ ...schema, type: schema.type, input: value });
      image = await pdfDoc.embedPng(imageBuf);
      _cache.set(inputBarcodeCacheKey, image);
    }
  }

  const pageHeight = page.getHeight();
  const {
    width,
    height,
    rotate,
    position: { x, y },
    opacity,
  } = convertForPdfLayoutProps({ schema, pageHeight });

  if (schema.format === 'svg' && svgStr) {
    await page.drawSvg(svgStr, { x, y: y + height, width, height });
  } else if (image) {
    page.drawImage(image, { x, y, rotate, width, height, opacity });
  }
};
