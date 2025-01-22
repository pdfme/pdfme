import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error
import PDFJSWorker from 'pdfjs-dist/legacy/build/pdf.worker.js';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2sizes as _pdf2sizes, Pdf2SizesOptions } from './pdf2sizes.js';

// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker;

export const pdf2img = async (pdf: ArrayBuffer, options: Pdf2ImgOptions = {}) =>
  _pdf2img(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
    createCanvas: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    },
    canvasToArrayBuffer: (canvas, imageType) =>
      // @ts-ignore
      dataURLToArrayBuffer(canvas.toDataURL(`image/${imageType}`)),
  });

export const pdf2sizes = async (pdf: ArrayBuffer, options: Pdf2SizesOptions = {}) =>
  _pdf2sizes(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
  });
