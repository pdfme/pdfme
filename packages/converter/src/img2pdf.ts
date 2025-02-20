import { PDFDocument } from '@pdfme/pdf-lib';
import type { ImageType } from './types.js';

export interface Img2PdfOptions {
  scale?: number;
  imageType?: ImageType;
}

export async function img2pdf(
  imgs: ArrayBuffer[],
  options: Img2PdfOptions = {}
): Promise<ArrayBuffer> {
  try {
    const { scale = 1 } = options;

    if (!Array.isArray(imgs) || imgs.length === 0) {
      throw new Error('Input must be a non-empty array of image buffers');
    }

    const doc = await PDFDocument.create();
    for (const img of imgs) {
      try {
        const image = await doc.embedJpg(img).catch(async () => {
          return await doc.embedPng(img);
        });
        const page = doc.addPage();
        const { width, height } = image.scale(scale);
        page.setSize(width, height);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width,
          height,
        });
      } catch (error) {
        throw new Error(`Failed to process image: ${(error as Error).message}`);
      }
    }
    const pdfUint8Array = await doc.save();
    return pdfUint8Array.buffer.slice(
      pdfUint8Array.byteOffset,
      pdfUint8Array.byteOffset + pdfUint8Array.byteLength
    );
  } catch (error) {
    throw new Error(`[@pdfme/converter] img2pdf failed: ${(error as Error).message}`);
  }
}
