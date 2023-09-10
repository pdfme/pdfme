import type { PDFImage } from '@pdfme/pdf-lib';
import type { GeneratorOptions, Schema, } from '@pdfme/common';
import type { PDFPage, PDFDocument, } from '@pdfme/pdf-lib';

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

    _cache: Map<string, PDFImage>;
}

export interface Renderer {
    [key: string]: { renderer: (arg: RenderProps) => Promise<void> } | undefined;
}