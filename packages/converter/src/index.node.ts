import { createCanvas } from 'canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

export const pdf2img = async (
  pdf: ArrayBuffer,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as HTMLCanvasElement,
    canvasToArrayBuffer: (canvas, imageType) => {
      // @ts-ignore
      const buffer = canvas.toBuffer(`image/${imageType}`);
      // @ts-ignore
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  });

export const pdf2size = async (pdf: ArrayBuffer, options: Pdf2SizeOptions = {}) =>
  _pdf2size(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
  });

export { img2pdf } from './img2pdf.js';
