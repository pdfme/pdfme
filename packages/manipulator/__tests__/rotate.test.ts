import { PDFDocument } from '@pdfme/pdf-lib';
import { rotate } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('rotate', () => {
  test('rotates PDF pages by specified degrees', async () => {
    const pdf = await createTestPDF(2);
    const result = await rotate(pdf, 90);
    expect(await getPDFPageCount(result)).toBe(2);
  });

  test('adds to the rotation a page already has', async () => {
    const pdf = await createTestPDF(1);
    const result = await rotate(await rotate(pdf, 90), 90);
    const doc = await PDFDocument.load(result);
    expect(doc.getPage(0).getRotation().angle).toBe(180);
  });

  test('throws error for non-90-degree rotation', async () => {
    const pdf = await createTestPDF(2);
    // @ts-expect-error
    await expect(rotate(pdf, 45)).rejects.toThrow(
      '[@pdfme/manipulator] Rotation degrees must be a multiple of 90'
    );
  });
});