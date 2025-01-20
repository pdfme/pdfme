import { createCanvas } from 'canvas';
import { pdf2imgCore } from './pdf2imgCore';
import type { Pdf2ImgOptions, Environment } from './pdf2imgCore';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
// @ts-expect-error
import PDFJSWorker from 'pdfjs-dist/build/pdf.worker';

pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker;

export async function pdf2img(pdf: ArrayBuffer, options: Pdf2ImgOptions = {}) {
  const env: Environment = {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as HTMLCanvasElement,
    canvasToArrayBuffer: (canvas, imageType) => {
      // @ts-ignore
      const buffer = canvas.toBuffer(`image/${imageType}`);
      // @ts-ignore
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  };

  return pdf2imgCore(pdf, env, options);
}
