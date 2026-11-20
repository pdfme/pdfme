import { PDFDocument } from '@pdfme/pdf-lib';
import { move } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('move', () => {
  test('moves page from one position to another', async () => {
    const pdf = await createTestPDF(3);
    const result = await move(pdf, { from: 0, to: 2 });
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('puts the page at the requested position', async () => {
    // pages 100, 200, 300, 400 and 500 points wide
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 5; i++) doc.addPage([i * 100, 100]);
    const pdf = await doc.save();

    const widths = async (bytes: Uint8Array) =>
      (await PDFDocument.load(bytes)).getPages().map((page) => page.getWidth());

    expect(await widths(await move(pdf, { from: 0, to: 2 }))).toEqual([200, 300, 100, 400, 500]);
    expect(await widths(await move(pdf, { from: 0, to: 4 }))).toEqual([200, 300, 400, 500, 100]);
    expect(await widths(await move(pdf, { from: 4, to: 0 }))).toEqual([500, 100, 200, 300, 400]);
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(move(pdf, { from: 3, to: 0 })).rejects.toThrow(
      '[@pdfme/manipulator] Invalid page number: from=3, to=0, total pages=3'
    );
  });
});