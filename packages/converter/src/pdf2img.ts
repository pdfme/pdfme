interface Environment {
  openDocument: (pdf: ArrayBuffer | Uint8Array) => Promise<PdfDocument>;
}

interface PdfDocument {
  readonly pageCount: number;
  page: (pageNumber: number) => PdfPage;
  destroy?: () => Promise<void> | void;
}

interface PdfPage {
  png: (options?: { scale?: number; forms?: boolean }) => Promise<Uint8Array>;
}

export interface Pdf2ImgOptions {
  scale?: number;
  range?: {
    start?: number;
    end?: number;
  };
}

const uint8ArrayToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

export async function pdf2img(
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
  env: Environment,
): Promise<ArrayBuffer[]> {
  try {
    const { scale = 1, range = {} } = options;
    const { start = 0, end = Infinity } = range;

    const { openDocument } = env;

    const pdfDoc = await openDocument(pdf);
    try {
      const numPages = pdfDoc.pageCount;

      const startPage = Math.max(start + 1, 1);
      const endPage = Math.min(end + 1, numPages);

      const results: ArrayBuffer[] = [];

      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        const png = await pdfDoc.page(pageNum).png({ scale, forms: true });
        results.push(uint8ArrayToArrayBuffer(png));
      }

      return results;
    } finally {
      await pdfDoc.destroy?.();
    }
  } catch (error) {
    throw new Error(`[@pdfme/converter] pdf2img failed: ${(error as Error).message}`);
  }
}
