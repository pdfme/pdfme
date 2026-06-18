import { createEngine, type PdfDocument, type PdfEngine } from 'clawpdf';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';

const clonePdfData = (pdf: ArrayBuffer | Uint8Array) =>
  new Uint8Array(pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf));

let enginePromise: Promise<PdfEngine> | undefined;

const getEngine = () => {
  enginePromise ??= createEngine();
  return enginePromise;
};

const openDocument = async (pdf: ArrayBuffer | Uint8Array): Promise<PdfDocument> =>
  (await getEngine()).open(clonePdfData(pdf));

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> => {
  return _pdf2img(pdf, options, {
    openDocument,
  });
};

export const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) => {
  return _pdf2size(pdf, options, {
    openDocument,
  });
};

export { img2pdf } from './img2pdf.js';
