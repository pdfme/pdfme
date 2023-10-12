import { PDFRenderProps } from '@pdfme/schemas';

export type EmbedPdfBox = {
    mediaBox: { x: number; y: number; width: number; height: number };
    bleedBox: { x: number; y: number; width: number; height: number };
    trimBox: { x: number; y: number; width: number; height: number };
};


export interface Renderer {
    [key: string]: { render: (arg: PDFRenderProps) => Promise<void> } | undefined;
}