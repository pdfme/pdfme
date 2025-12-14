import { PDFRenderProps, pt2px } from '@pdfme/common';
import { convertForPdfLayoutProps } from '../utils.js';
import type { StyledQrCodeSchema } from './types.js';
import { createStyledQRCode, validateQRInput, getQRCodeCacheKey } from './helper.js';
import { PDFImage } from '@pdfme/pdf-lib';

export const pdfRender = async (arg: PDFRenderProps<StyledQrCodeSchema>) => {
  const { value, schema, pdfDoc, page, _cache } = arg;
  if (!validateQRInput(value)) return;

  const pageHeight = page.getHeight();
  const {
    width,
    height,
    rotate,
    position: { x, y },
    opacity,
  } = convertForPdfLayoutProps({ schema, pageHeight });

  const inputQRCodeCacheKey = getQRCodeCacheKey(schema, value);
  let image = _cache.get(inputQRCodeCacheKey) as PDFImage | undefined;
  if (!image) {
    // Convert points to pixels for qr-code-styling (use 2x resolution for better quality)
    const pixelWidth = pt2px(width) * 2;
    const pixelHeight = pt2px(height) * 2;
    const imageBuf = await createStyledQRCode(schema, value, pixelWidth, pixelHeight);
    image = await pdfDoc.embedPng(imageBuf);
    _cache.set(inputQRCodeCacheKey, image);
  }

  page.drawImage(image, { x, y, rotate, width, height, opacity });
};
