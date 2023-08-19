import type { PDFFont, PDFImage } from '@pdfme/pdf-lib';
import type { Font } from '@pdfme/common';
export interface InputImageCache {
    [key: string]: PDFImage | undefined;
}

export type EmbedPdfBox = {
    mediaBox: { x: number; y: number; width: number; height: number };
    bleedBox: { x: number; y: number; width: number; height: number };
    trimBox: { x: number; y: number; width: number; height: number };
};

export interface FontSetting {
    font: Font;
    pdfFontObj: {
        [key: string]: PDFFont;
    };
    fallbackFontName: string;
}