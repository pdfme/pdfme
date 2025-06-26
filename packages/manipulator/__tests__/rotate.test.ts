import { rotate } from '../src/index';
import { createTestPDF, getPDFPageCount } from './test-helpers';

describe('rotate', () => {
  test('rotates PDF pages by specified degrees', async () => {
    const pdf = await createTestPDF(2);
    const result = await rotate(pdf, 90);
    expect(await getPDFPageCount(result)).toBe(2);
  });

  test('throws error for non-90-degree rotation', async () => {
    const pdf = await createTestPDF(2);
    // @ts-expect-error
    await expect(rotate(pdf, 45)).rejects.toThrow(
      '[@pdfme/manipulator] Rotation degrees must be a multiple of 90'
    );
  });
});