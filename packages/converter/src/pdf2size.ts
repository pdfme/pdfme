import { Size, pt2mm } from '@pdfme/common';

interface Environment {
  openDocument: (pdf: ArrayBuffer | Uint8Array) => Promise<PdfDocument>;
}

interface PdfDocument {
  readonly pageCount: number;
  page: (pageNumber: number) => PdfPage;
  destroy?: () => Promise<void> | void;
}

interface PdfPage {
  readonly width: number;
  readonly height: number;
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
  const { openDocument } = env;
  const pdfDoc = await openDocument(pdf);

  try {
    return Array.from({ length: pdfDoc.pageCount }, (_, i) => {
      const page = pdfDoc.page(i + 1);
      return { height: pt2mm(page.height * scale), width: pt2mm(page.width * scale) };
    });
  } finally {
    await pdfDoc.destroy?.();
  }
}
