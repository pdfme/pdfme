import type { PDFPage } from '@pdfme/pdf-lib';

export type PdfBox = { x: number; y: number; width: number; height: number };

export type EmbedPdfBox = {
  mediaBox: PdfBox;
  bleedBox: PdfBox;
  trimBox: PdfBox;
  sourceBox?: PdfBox;
  sourcePage?: PDFPage;
};
