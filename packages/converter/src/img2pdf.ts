import { PDFDocument } from '@pdfme/pdf-lib';
import { mm2pt } from '@pdfme/common';
import type { ImageType } from './types.js';

interface Img2PdfOptions {
  scale?: number;
  imageType?: ImageType;
  size?: { height: number, width: number }; // in millimeters
  margin?: [number, number, number, number]; // in millimeters [top, right, bottom, left]
}

export async function img2pdf(
  imgs: ArrayBuffer[],
  options: Img2PdfOptions = {},
): Promise<ArrayBuffer> {
  try {
    const { scale = 1, size, margin = [0, 0, 0, 0] } = options;

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
        const { width: imgWidth, height: imgHeight } = image.scale(scale);
        
        // Set page size based on size option or image dimensions
        const pageWidth = size ? mm2pt(size.width) : imgWidth;
        const pageHeight = size ? mm2pt(size.height) : imgHeight;
        page.setSize(pageWidth, pageHeight);
        
        // Convert margins from mm to points
        const [topMargin, rightMargin, bottomMargin, leftMargin] = margin.map(mm2pt);
        
        // Calculate available space for the image after applying margins
        const availableWidth = pageWidth - leftMargin - rightMargin;
        const availableHeight = pageHeight - topMargin - bottomMargin;
        
        // Calculate scaling to fit image within available space while maintaining aspect ratio
        const widthRatio = availableWidth / imgWidth;
        const heightRatio = availableHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio, 1); // Don't upscale images
        
        // Calculate final image dimensions and position
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;
        const x = leftMargin + (availableWidth - finalWidth) / 2; // Center horizontally
        const y = bottomMargin + (availableHeight - finalHeight) / 2; // Center vertically
        
        page.drawImage(image, {
          x,
          y,
          width: finalWidth,
          height: finalHeight,
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
