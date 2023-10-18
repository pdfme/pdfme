import { PDFRenderProps, Schema } from '@pdfme/common';

export type EmbedPdfBox = {
  mediaBox: { x: number; y: number; width: number; height: number };
  bleedBox: { x: number; y: number; width: number; height: number };
  trimBox: { x: number; y: number; width: number; height: number };
};

export type Render = (arg: PDFRenderProps<Schema>) => Promise<void>;

export interface Renderer {
  // FIXME render　っていらなくない？
  [key: string]: { render: Render } | undefined;
}