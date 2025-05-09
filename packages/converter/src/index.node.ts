import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from 'canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';

const CMAP_URL = "../../node_modules/pdfjs-dist/cmaps/";
// Where the standard fonts are located.
const STANDARD_FONT_DATA_URL =
  "../../node_modules/pdfjs-dist/standard_fonts/";

const CMAP_PACKED = true;

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    getDocument: (pdfData) => pdfjsLib.getDocument({
      data: pdfData,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
    }).promise,
    createCanvas: (width, height) => {
      console.log('🧊🧊🧊🧊')
      try {
        const canvas = createCanvas(width, height);
        if (!canvas) {
          throw new Error('Failed to create canvas');
        }
        return canvas as unknown as HTMLCanvasElement;
      } catch (error) {
        console.error('Error creating canvas:', error);
        throw error;
      }
    },
    canvasToArrayBuffer: (canvas, imageType) => {
      // Using a more specific type for the canvas from the 'canvas' package
      const nodeCanvas = canvas as unknown as import('canvas').Canvas;

      // Default to 'image/png' if no imageType is provided
      const type = imageType || 'image/png';

      // Extract the format from the MIME type (e.g., 'image/png' -> 'png')
      const format = type.split('/')[1];

      // Get buffer from the canvas using the specified format
      let buffer: Buffer;
      if (format === 'jpeg' || format === 'jpg') {
        buffer = nodeCanvas.toBuffer('image/jpeg', { quality: 0.9 });
      } else if (format === 'png') {
        buffer = nodeCanvas.toBuffer('image/png');
      } else {
        // Default to PNG for any other format
        buffer = nodeCanvas.toBuffer();
      }

      // Convert to ArrayBuffer
      return new Uint8Array(buffer).buffer;
    },
  });

export const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) =>
  _pdf2size(pdf, options, {
    getDocument: (pdfData) => pdfjsLib.getDocument(pdfData).promise,
  });

export { img2pdf } from './img2pdf.js';
