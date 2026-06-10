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
  /**
   * Upper bound for the summed canvas area (width * height) across all
   * rendered pages. When rendering at `scale` would exceed this limit, the
   * scale of every page is reduced uniformly so the total stays within it.
   * This bounds the total image memory regardless of page count, which
   * matters on memory-constrained mobile browsers.
   */
  maxTotalCanvasPixels?: number;
}

export async function pdf2img(
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
  env: Environment,
): Promise<ArrayBuffer[]> {
  try {
    const { scale = 1, imageType = 'jpeg', range = {}, maxCanvasPixels, maxTotalCanvasPixels } =
      options;
    const { start = 0, end = Infinity } = range;

    const { getDocument, destroyDocument, createCanvas, canvasToArrayBuffer } = env;

    const pdfDoc = await getDocument(pdf);
    try {
      const numPages = pdfDoc.numPages;

      const startPage = Math.max(start + 1, 1);
      const endPage = Math.min(end + 1, numPages);

      const pages = [];
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        pages.push(await pdfDoc.getPage(pageNum));
      }

      const baseAreas = pages.map((page) => {
        const { width, height } = page.getViewport({ scale: 1 });
        return width * height;
      });
      const renderScales = baseAreas.map((baseArea) => {
        if (maxCanvasPixels && maxCanvasPixels > 0 && baseArea > 0) {
          return Math.min(scale, Math.sqrt(maxCanvasPixels / baseArea));
        }
        return scale;
      });
      if (maxTotalCanvasPixels && maxTotalCanvasPixels > 0) {
        const totalArea = renderScales.reduce(
          (acc, renderScale, i) => acc + baseAreas[i] * renderScale * renderScale,
          0,
        );
        if (totalArea > maxTotalCanvasPixels) {
          const shrink = Math.sqrt(maxTotalCanvasPixels / totalArea);
          for (let i = 0; i < renderScales.length; i++) {
            renderScales[i] *= shrink;
          }
        }
      }

      const results: ArrayBuffer[] = [];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const viewport = page.getViewport({ scale: renderScales[i] });

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
