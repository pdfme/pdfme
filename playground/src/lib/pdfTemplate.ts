import { checkTemplate, type Template } from '@pdfme/common';
import { pdf2size } from '@pdfme/converter';

export type PdfTemplateDraft = {
  fileName: string;
  pageCount: number;
  template: Template;
  title: string;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });

const readFileAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read PDF file.'));
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsArrayBuffer(file);
  });

export const getPdfTemplateTitle = (file: File) =>
  file.name.replace(/\.pdf$/i, '').trim() || 'PDF Template';

export const createTemplateFromPdfFile = async (file: File): Promise<PdfTemplateDraft> => {
  const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) {
    throw new Error('Select a PDF file.');
  }

  const [basePdf, pdfBuffer] = await Promise.all([
    readFileAsDataUrl(file),
    readFileAsArrayBuffer(file),
  ]);
  const pageSizes = await pdf2size(pdfBuffer);
  const pageCount = Math.max(1, pageSizes.length);
  const template: Template = {
    basePdf,
    schemas: Array.from({ length: pageCount }, () => []),
  };

  checkTemplate(template);

  return {
    fileName: file.name,
    pageCount,
    template,
    title: getPdfTemplateTitle(file),
  };
};
