import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { createCanvas } from 'canvas';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';

// 型定義を追加
interface PdfjsLib {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (data: ArrayBuffer | Uint8Array) => {
    promise: Promise<PDFDocumentProxy>;
  };
}

// 型アサーションを使用して安全にアクセス
(pdfjsLib as PdfjsLib).GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    getDocument: (pdfData) => (pdfjsLib as PdfjsLib).getDocument(pdfData).promise,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as HTMLCanvasElement,
    canvasToArrayBuffer: (canvas) => {
      // Using a more specific type for the canvas from the 'canvas' package
      const nodeCanvas = canvas as unknown as import('canvas').Canvas;
      // Get buffer from the canvas - using the synchronous version without parameters
      // This will use the default PNG format
      const buffer = nodeCanvas.toBuffer();
      // Convert to ArrayBuffer
      return new Uint8Array(buffer).buffer;
    },
  });

export const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) =>
  _pdf2size(pdf, options, {
    getDocument: (pdfData) => (pdfjsLib as PdfjsLib).getDocument(pdfData).promise,
  });

export { img2pdf } from './img2pdf.js';
