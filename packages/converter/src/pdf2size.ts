import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Size, pt2mm } from '@pdfme/common';

interface Environment {
  getDocument: (pdf: ArrayBuffer | Uint8Array) => Promise<PDFDocumentProxy>;
  destroyDocument?: (pdfDoc: PDFDocumentProxy) => Promise<void>;
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
  const { getDocument, destroyDocument } = env;
  const pdfDoc = await getDocument(pdf);

  try {
    return await Promise.all(
      Array.from({ length: pdfDoc.numPages }, async (_, i) => {
        return await pdfDoc.getPage(i + 1).then((page) => {
          const { height, width } = page.getViewport({ scale, rotation: 0 });

          return { height: pt2mm(height), width: pt2mm(width) };
        });
      }),
    );
  } finally {
    await destroyDocument?.(pdfDoc);
  }
}
