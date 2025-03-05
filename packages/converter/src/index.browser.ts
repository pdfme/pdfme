import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error - PDFJSWorker import is not properly typed but required for functionality
import PDFJSWorker from 'pdfjs-dist/legacy/build/pdf.worker.js';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';

// @ts-expect-error - Setting workerSrc is required but type definitions are incomplete
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker as unknown;

function dataURLToArrayBuffer(dataURL: string): ArrayBuffer {
  // Split out the actual base64 string from the data URL scheme
  const base64String = dataURL.split(',')[1];

  // Decode the Base64 string to get the binary data
  const byteString = atob(base64String);

  // Create a typed array from the binary string
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uintArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uintArray[i] = byteString.charCodeAt(i);
  }

  return arrayBuffer;
}

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
    createCanvas: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    },
    canvasToArrayBuffer: (canvas, imageType) => {
      try {
        // Using type assertion to handle the canvas method
        const dataUrl = (canvas as HTMLCanvasElement).toDataURL(`image/${imageType}`);
        return dataURLToArrayBuffer(dataUrl);
      } catch (error) {
        console.error('Error converting canvas to array buffer:', error);
        return new ArrayBuffer(0);
      }
    },
  });

export const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) =>
  _pdf2size(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
  });

export { img2pdf } from './img2pdf.js';
