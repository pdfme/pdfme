import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error
import PDFJSWorker from 'pdfjs-dist/legacy/build/pdf.worker.js';
import { pdf2imgCore } from './pdf2imgCore';
import type { Pdf2ImgOptions, Environment } from './pdf2imgCore';

// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker;

const env: Environment = {
  getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
  createCanvas: (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
  canvasToArrayBuffer: (canvas, imageType) => {
    // @ts-ignore
    const dataUrl = canvas.toDataURL(`image/${imageType}`);
    // @ts-ignore
    return dataURLToArrayBuffer(dataUrl);
  },
};

export async function pdf2img(pdf: ArrayBuffer, options: Pdf2ImgOptions = {}) {
  return pdf2imgCore(pdf, env, options);
}
