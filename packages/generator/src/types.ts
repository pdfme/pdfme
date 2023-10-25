import type { Schema, PDFRenderProps } from '@pdfme/common';

export type PDFRender = (arg: PDFRenderProps<Schema>) => Promise<void>;

export interface PDFRenderer {
  [key: string]: PDFRender | undefined;
}

export type EmbedPdfBox = {
  mediaBox: { x: number; y: number; width: number; height: number };
  bleedBox: { x: number; y: number; width: number; height: number };
  trimBox: { x: number; y: number; width: number; height: number };
};
