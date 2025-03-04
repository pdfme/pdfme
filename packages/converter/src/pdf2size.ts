import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Size, pt2mm } from '@pdfme/common';

interface Environment {
  getDocument: (pdf: ArrayBuffer | Uint8Array) => Promise<PDFDocumentProxy>;
}

export interface Pdf2SizeOptions {
  scale?: number;
}

export async function pdf2size(
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2SizeOptions = {},
  env: Environment,
): Promise<Size[]> {
  const { scale = 1 } = options;
  const { getDocument } = env;

  const pdfDoc = await getDocument(pdf);

  const promises = Promise.all(
    new Array(pdfDoc.numPages).fill('').map(async (_, i) => {
      return await pdfDoc.getPage(i + 1).then((page) => {
        const { height, width } = page.getViewport({ scale, rotation: 0 });

        return { height: pt2mm(height), width: pt2mm(width) };
      });
    }),
  );

  return promises;
}
