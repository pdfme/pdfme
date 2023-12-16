import type { PDFRenderProps } from '@pdfme/common';
import type { LineSchema } from './types';
import { rotatePoint, convertForPdfLayoutProps, hex2RgbColor } from '../renderUtils.js';

export const pdfRender = (arg: PDFRenderProps<LineSchema>) => {
  const { page, schema } = arg;
  const pageHeight = page.getHeight();
  const {
    width,
    height,
    rotate,
    position: { x, y },
    opacity,
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });
  const pivot = { x: x + width / 2, y: y + height / 2 };
  page.drawLine({
    start: rotatePoint({ x, y: y + height / 2 }, pivot, rotate.angle),
    end: rotatePoint({ x: x + width, y: y + height / 2 }, pivot, rotate.angle),
    thickness: height,
    color: hex2RgbColor(schema.color ?? '#ffffff'),
    opacity: opacity,
  });
};
