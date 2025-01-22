import { createCanvas } from 'canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2sizes as _pdf2sizes, Pdf2SizesOptions } from './pdf2sizes.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
// @ts-expect-error
import PDFJSWorker from 'pdfjs-dist/build/pdf.worker';

// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker;

export const pdf2img = async (pdf: ArrayBuffer, options: Pdf2ImgOptions = {}) =>
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

export const pdf2sizes = async (pdf: ArrayBuffer, options: Pdf2SizesOptions = {}) =>
  _pdf2sizes(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
  });
