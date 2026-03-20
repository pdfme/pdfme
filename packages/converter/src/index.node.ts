import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';

class CanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }

  reset(entry: { canvas: import('canvas').Canvas }, width: number, height: number) {
    entry.canvas.width = width;
    entry.canvas.height = height;
  }

  destroy(entry: { canvas: import('canvas').Canvas }) {
    entry.canvas.width = 0;
    entry.canvas.height = 0;
  }
}

const clonePdfData = (pdf: ArrayBuffer | Uint8Array) =>
  pdf instanceof Uint8Array ? new Uint8Array(pdf) : new Uint8Array(pdf);

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    getDocument: (pdf) =>
      pdfjsLib.getDocument({
        data: clonePdfData(pdf),
        isEvalSupported: false,
        CanvasFactory,
      }).promise,
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
    getDocument: (pdf) =>
      pdfjsLib.getDocument({
        data: clonePdfData(pdf),
        isEvalSupported: false,
        CanvasFactory,
      }).promise,
  });

export { img2pdf } from './img2pdf.js';
