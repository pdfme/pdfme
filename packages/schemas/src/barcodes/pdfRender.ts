import { PDFRenderProps } from '@pdfme/common';
import { convertForPdfLayoutProps } from '../utils.js';
import type { BarcodeSchema } from './types.js';
import { createBarCode, validateBarcodeInput } from './helper.js';
import { PDFImage } from '@pdfme/pdf-lib';

const getBarcodeCacheKey = (schema: BarcodeSchema, value: string) => {
  return `${schema.type}${schema.backgroundColor}${schema.barColor}${schema.textColor}${value}${schema.includetext}`;
};

export const pdfRender = async (arg: PDFRenderProps<BarcodeSchema>) => {
  const { value, schema, pdfDoc, page, _cache } = arg;
  if (!validateBarcodeInput(schema.type, value)) return;

  const inputBarcodeCacheKey = getBarcodeCacheKey(schema, value);
  let image = _cache.get(inputBarcodeCacheKey) as PDFImage | undefined;
  if (!image) {
    const imageBuf = await createBarCode({
      ...schema,
      type: schema.type,
      input: value,
    });
    image = await pdfDoc.embedPng(imageBuf);
    _cache.set(inputBarcodeCacheKey, image);
  }

  const pageHeight = page.getHeight();
  const {
    width,
    height,
    rotate,
    position: { x, y },
    opacity,
  } = convertForPdfLayoutProps({ schema, pageHeight });

  page.drawImage(image, { x, y, rotate, width, height, opacity });
};
