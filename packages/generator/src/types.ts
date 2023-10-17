import { PDFRenderProps } from '@pdfme/common';

export type EmbedPdfBox = {
  mediaBox: { x: number; y: number; width: number; height: number };
  bleedBox: { x: number; y: number; width: number; height: number };
  trimBox: { x: number; y: number; width: number; height: number };
};
export interface Renderer { // FIXME anyをなくす
  [key: string]: { render: (arg: PDFRenderProps<any>) => Promise<void> } | undefined;
}