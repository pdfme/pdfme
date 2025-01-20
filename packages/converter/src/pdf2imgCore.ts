import type { PDFDocumentProxy } from 'pdfjs-dist';

type ImageType = 'jpeg' | 'png';

export interface Environment {
  getDocument: (pdf: ArrayBuffer) => Promise<PDFDocumentProxy>;
  createCanvas: (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas;
  canvasToArrayBuffer: (
    canvas: HTMLCanvasElement | OffscreenCanvas,
    imageType: ImageType
  ) => ArrayBuffer;
}

export interface Pdf2ImgOptions {
  scale?: number;
  imageType?: ImageType;
  range?: {
    start?: number;
    end?: number;
  };
}

export async function pdf2imgCore(
  pdf: ArrayBuffer,
  env: Environment,
  options: Pdf2ImgOptions = {}
): Promise<ArrayBuffer[]> {
  const { scale = 1, imageType = 'jpeg', range = {} } = options;
  const { start = 0, end = Infinity } = range;

  const pdfDoc = await env.getDocument(pdf);
  const numPages = pdfDoc.numPages;

  const startPage = Math.max(start + 1, 1);
  const endPage = Math.min(end + 1, numPages);

  const results: ArrayBuffer[] = [];

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = env.createCanvas(viewport.width, viewport.height);
    if (!canvas) {
      throw new Error('Failed to create canvas');
    }

    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    await page.render({ canvasContext: context, viewport }).promise;
    const arrayBuffer = env.canvasToArrayBuffer(canvas, imageType);
    results.push(arrayBuffer);
  }

  return results;
}
