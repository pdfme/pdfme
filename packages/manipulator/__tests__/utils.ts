import { PDFDocument } from '@pdfme/pdf-lib';
import { pdf2img } from '@pdfme/converter';

export const createTestPDF = async (pageCount: number): Promise<ArrayBuffer> => {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([500, 500]);
    page.drawText(`Page ${i + 1}`, {
      x: 50,
      y: 450,
      size: 20,
    });
  }
  return pdfDoc.save();
};

export const pdfToImages = async (pdf: ArrayBuffer): Promise<ArrayBuffer[]> => {
  return pdf2img(pdf, { scale: 2, imageType: 'png' });
};
