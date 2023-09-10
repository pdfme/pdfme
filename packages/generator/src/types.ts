import type { PDFImage } from '@pdfme/pdf-lib';
import type { GeneratorOptions, Schema, } from '@pdfme/common';
import type { PDFPage, PDFDocument, } from '@pdfme/pdf-lib';

export interface InputImageCache {
    [key: string]: PDFImage | undefined;
}

export type EmbedPdfBox = {
    mediaBox: { x: number; y: number; width: number; height: number };
    bleedBox: { x: number; y: number; width: number; height: number };
    trimBox: { x: number; y: number; width: number; height: number };
};

export interface RenderProps {
    input: string;
    templateSchema: Schema;
    pdfDoc: PDFDocument;
    page: PDFPage;
    options: GeneratorOptions;
}