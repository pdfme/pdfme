import { createCanvas } from 'canvas';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';
import { loadPdfJs, loadPdfJsWorker } from './utils/module-loader.js';
import { PatchedPNG } from './patches/pdf-lib-patch.js';

// Initialize variables to hold loaded modules
let pdfjsLib: any = null;
let PDFJSWorker: any = null;

// Function to initialize modules
async function initModules() {
  if (!pdfjsLib) {
    pdfjsLib = await loadPdfJs(true);
    PDFJSWorker = await loadPdfJsWorker(true);
    
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker.default || PDFJSWorker;
    }
    
    // Apply the patch before using pdf2img
    await PatchedPNG.patchPdfLib();
  }
  return { pdfjsLib, PDFJSWorker };
}

export const pdf2img = async (pdf: ArrayBuffer, options: Pdf2ImgOptions = {}) => {
  // Initialize modules if needed
  const { pdfjsLib } = await initModules();
  
  return _pdf2img(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
    createCanvas: (width, height) => createCanvas(width, height) as unknown as HTMLCanvasElement,
    canvasToArrayBuffer: (canvas, imageType) => {
      // @ts-ignore
      const buffer = canvas.toBuffer(`image/${imageType}`);
      // @ts-ignore
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  });
};

export const pdf2size = async (pdf: ArrayBuffer, options: Pdf2SizeOptions = {}) => {
  // Initialize modules if needed
  const { pdfjsLib } = await initModules();
  
  return _pdf2size(pdf, options, {
    getDocument: (pdf) => pdfjsLib.getDocument(pdf).promise,
  });
};

export { img2pdf } from './img2pdf.js';
