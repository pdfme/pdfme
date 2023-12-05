import type { PDFRenderProps, Schema } from '@pdfme/common';
import type { ImageSchema } from './types';
import { convertForPdfLayoutProps } from '../renderUtils.js';

const getCacheKey = (schema: Schema, input: string) => `${schema.type}${input}`;

export const pdfRender = async (arg: PDFRenderProps<ImageSchema>) => {
  const { value, schema, pdfDoc, page, _cache } = arg;

  const inputImageCacheKey = getCacheKey(schema, value);
  let image = _cache.get(inputImageCacheKey);
  if (!image) {
    const isPng = value.startsWith('data:image/png;');
    image = await (isPng ? pdfDoc.embedPng(value) : pdfDoc.embedJpg(value));
    _cache.set(inputImageCacheKey, image);
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
