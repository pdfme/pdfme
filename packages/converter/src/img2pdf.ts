import { PDFDocument } from '@pdfme/pdf-lib';
import type { ImageType } from './types.js';

interface Img2PdfOptions {
  scale?: number;
  imageType?: ImageType;
}

export async function img2pdf(
  imgs: ArrayBuffer[],
  options: Img2PdfOptions = {},
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
    // Create a new ArrayBuffer from the Uint8Array to ensure we return only ArrayBuffer
    const buffer = new ArrayBuffer(pdfUint8Array.byteLength);
    const view = new Uint8Array(buffer);
    view.set(pdfUint8Array);
    return buffer;
  } catch (error) {
    throw new Error(`[@pdfme/converter] img2pdf failed: ${(error as Error).message}`);
  }
}
