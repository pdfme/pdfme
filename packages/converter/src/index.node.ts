import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';

const clonePdfData = (pdf: ArrayBuffer | Uint8Array) =>
  pdf instanceof Uint8Array ? new Uint8Array(pdf) : new Uint8Array(pdf);

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> => {
  return _pdf2img(pdf, options, {
    getDocument: (pdf) =>
      pdfjsLib.getDocument({
        data: clonePdfData(pdf),
        isEvalSupported: false,
      }).promise,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as HTMLCanvasElement,
    canvasToArrayBuffer: (canvas, imageType) => {
      const nodeCanvas = canvas as unknown as Canvas;
      const buffer =
        imageType === 'png' ? nodeCanvas.toBuffer('image/png') : nodeCanvas.toBuffer('image/jpeg');
      const arrayBuffer = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(arrayBuffer).set(buffer);
      return arrayBuffer;
    },
  });
};

export const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) => {
  return _pdf2size(pdf, options, {
    getDocument: (pdf) =>
      pdfjsLib.getDocument({
        data: clonePdfData(pdf),
        isEvalSupported: false,
      }).promise,
  });
};

export { img2pdf } from './img2pdf.js';
