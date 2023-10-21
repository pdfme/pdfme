import type { PDFRenderProps } from '@pdfme/common';
import type { ImageSchema } from './types';
import { getCacheKey, convertForPdfLayoutProps } from '../renderUtils';

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
  } = convertForPdfLayoutProps({ schema, pageHeight });

  page.drawImage(image, { x, y, rotate, width, height });
};
