import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
// @ts-expect-error - PDFJSWorker import is not properly typed but required for functionality
import PDFJSWorker from 'pdfjs-dist/legacy/build/pdf.worker.js';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { createCanvas } from 'canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';

// Type definitions for pdfjs-dist
interface PDFJSStatic {
  GlobalWorkerOptions?: {
    workerSrc: string;
  };
  getDocument: (src: ArrayBuffer | Uint8Array | { data: ArrayBuffer | Uint8Array }) => {
    promise: Promise<PDFDocumentProxy>;
  };
}

interface PDFJSModule {
  default?: PDFJSStatic;
  GlobalWorkerOptions?: {
    workerSrc: string;
  };
  getDocument?: (src: ArrayBuffer | Uint8Array | { data: ArrayBuffer | Uint8Array }) => {
    promise: Promise<PDFDocumentProxy>;
  };
}

const pdfjsModule = pdfjsLib as PDFJSModule;

// Check if GlobalWorkerOptions exists before setting workerSrc
if (pdfjsModule.GlobalWorkerOptions) {
  pdfjsModule.GlobalWorkerOptions.workerSrc = PDFJSWorker as unknown as string;
} else if (pdfjsModule.default?.GlobalWorkerOptions) {
  // Handle default export case
  pdfjsModule.default.GlobalWorkerOptions.workerSrc = PDFJSWorker as unknown as string;
}

// Get the actual pdf.js library object
const pdfjs: PDFJSStatic = pdfjsModule.default || (pdfjsModule as PDFJSStatic);

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    getDocument: (pdf) => pdfjs.getDocument(pdf).promise,
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
    getDocument: (pdf) => pdfjs.getDocument(pdf).promise,
  });

export { img2pdf } from './img2pdf.js';
