import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { ImageType } from './types.js';

interface Environment {
  getDocument: (pdf: ArrayBuffer | Uint8Array) => Promise<PDFDocumentProxy>;
  destroyDocument?: (pdfDoc: PDFDocumentProxy) => Promise<void>;
  createCanvas: (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas;
  canvasToArrayBuffer: (
    canvas: HTMLCanvasElement | OffscreenCanvas,
    imageType: ImageType,
  ) => ArrayBuffer;
}

export interface Pdf2ImgOptions {
  scale?: number;
  imageType?: ImageType;
  range?: {
    start?: number;
    end?: number;
  };
  /**
   * Upper bound for the rendered canvas area (width * height) per page.
   * When rendering at `scale` would exceed this limit, the scale is reduced
   * so the canvas stays within it. Useful to avoid exceeding browser canvas
   * size limits and memory crashes on mobile devices (e.g. iOS Safari caps
   * canvases around 16.7M pixels).
   */
  maxCanvasPixels?: number;
}

export async function pdf2img(
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
  env: Environment,
): Promise<ArrayBuffer[]> {
  try {
    const { scale = 1, imageType = 'jpeg', range = {}, maxCanvasPixels } = options;
    const { start = 0, end = Infinity } = range;

    const { getDocument, destroyDocument, createCanvas, canvasToArrayBuffer } = env;

    const pdfDoc = await getDocument(pdf);
    try {
      const numPages = pdfDoc.numPages;

      const startPage = Math.max(start + 1, 1);
      const endPage = Math.min(end + 1, numPages);

      const results: ArrayBuffer[] = [];

      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        let renderScale = scale;
        if (maxCanvasPixels && maxCanvasPixels > 0) {
          const baseViewport = page.getViewport({ scale: 1 });
          const baseArea = baseViewport.width * baseViewport.height;
          if (baseArea > 0) {
            renderScale = Math.min(scale, Math.sqrt(maxCanvasPixels / baseArea));
          }
        }
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = createCanvas(viewport.width, viewport.height);
        if (!canvas) {
          throw new Error('Failed to create canvas');
        }

        const context = canvas.getContext('2d') as CanvasRenderingContext2D;
        if (!context) {
          throw new Error('Failed to get canvas context');
        }

        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext: context,
          viewport,
        }).promise;
        const arrayBuffer = canvasToArrayBuffer(canvas, imageType);
        results.push(arrayBuffer);
      }

      return results;
    } finally {
      await destroyDocument?.(pdfDoc);
    }
  } catch (error) {
    throw new Error(`[@pdfme/converter] pdf2img failed: ${(error as Error).message}`);
  }
}
