import { PDFDocument } from '@pdfme/pdf-lib';
import { mm2pt } from '@pdfme/common';
import type { ImageType } from './types.js';

interface Img2PdfOptions {
  scale?: number;
  imageType?: ImageType;
  size?: { height: number; width: number }; // in millimeters
  margin?: [number, number, number, number]; // in millimeters [top, right, bottom, left]
}

function detectImageType(buffer: ArrayBuffer): 'jpeg' | 'png' | 'unknown' {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'jpeg';
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  return 'unknown';
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
        let image;
        const type = detectImageType(img);

        if (type === 'jpeg') {
          image = await doc.embedJpg(img);
        } else if (type === 'png') {
          image = await doc.embedPng(img);
        } else {
          try {
            image = await doc.embedJpg(img);
          } catch {
            image = await doc.embedPng(img);
          }
        }

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
