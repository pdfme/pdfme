// 型宣言の抑制を外し、型定義ファイルで対応する
import { createCanvas } from 'canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';

let pdfjsLib: any;
let PDFJSWorker: any;

async function ensurePdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/build/pdf.js').then((m: any) => m.default ?? m);
    PDFJSWorker = await import('pdfjs-dist/build/pdf.worker.js').then((m: any) => m.default ?? m);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker;
  }
}

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> => {
  await ensurePdfjs();
  return _pdf2img(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as HTMLCanvasElement,
    canvasToArrayBuffer: (canvas) => {
      const nodeCanvas = canvas as unknown as import('canvas').Canvas;
      const buffer = nodeCanvas.toBuffer();
      return new Uint8Array(buffer).buffer;
    },
  });
};

export const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) => {
  await ensurePdfjs();
  return _pdf2size(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
  });
};

export { img2pdf } from './img2pdf.js';
