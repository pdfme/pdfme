import type { PDFImage, PDFFont } from 'pdf-lib';

export interface TextSchemaSetting {
  fontObj: {
    [key: string]: PDFFont;
  };
  fallbackFontName: string;
  splitThreshold: number;
}

export interface InputImageCache {
  [key: string]: PDFImage | undefined;
}

export type EmbedPdfBox = {
  mediaBox: { x: number; y: number; width: number; height: number };
  bleedBox: { x: number; y: number; width: number; height: number };
  trimBox: { x: number; y: number; width: number; height: number };
};
