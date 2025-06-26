import { PDFDocument } from '../src';

describe('pdf-lib basic functionality', () => {
  test('should create a new PDF document', async () => {
    const pdfDoc = await PDFDocument.create();
    expect(pdfDoc).toBeDefined();
  });

  test('should export main classes', () => {
    expect(PDFDocument).toBeDefined();
  });
});
