import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { createCanvas } from 'canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';
import { img2pdf } from './img2pdf.js';

const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    getDocument: (pdf) =>
      pdfjsLib.getDocument({
        data: pdf,
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
        verbosity: 0,
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

const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) =>
  _pdf2size(pdf, options, {
    getDocument: (pdf) =>
      pdfjsLib.getDocument({
        data: pdf,
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
        verbosity: 0,
      }).promise,
  });

export { img2pdf, pdf2img, pdf2size };
