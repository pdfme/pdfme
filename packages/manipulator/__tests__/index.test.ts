import { merge, split, remove, insert, extract, rotate } from '../src/index';
import { createTestPDF, getPDFPageCount } from './utils';

describe('merge', () => {
  test('merges multiple PDFs', async () => {
    const pdf1 = await createTestPDF(2);
    const pdf2 = await createTestPDF(3);
    const merged = await merge([pdf1, pdf2]);
    expect(await getPDFPageCount(merged)).toBe(5);
  });

  test('throws error when no PDFs provided', async () => {
    await expect(merge([])).rejects.toThrow('[@pdfme/manipulator] At least one PDF is required');
  });
});

describe('split', () => {
  test('splits PDF into ranges', async () => {
    const pdf = await createTestPDF(5);
    const splits = await split(pdf, [
      { start: 0, end: 1 },
      { start: 2, end: 4 },
    ]);
    expect(splits.length).toBe(2);
    expect(await getPDFPageCount(splits[0])).toBe(2);
    expect(await getPDFPageCount(splits[1])).toBe(3);
  });

  test('throws error for invalid ranges', async () => {
    const pdf = await createTestPDF(3);
    await expect(split(pdf, [{ start: 1, end: 0 }])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid range'
    );
  });
});

describe('remove', () => {
  test('removes specified pages from PDF', async () => {
    const pdf = await createTestPDF(5);
    const result = await remove(pdf, [1, 3]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('throws error when no pages provided', async () => {
    const pdf = await createTestPDF(3);
    await expect(remove(pdf, [])).rejects.toThrow(
      '[@pdfme/manipulator] At least one page number is required'
    );
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(remove(pdf, [3])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid page number'
    );
  });
});

describe('insert', () => {
  test('inserts PDF at specified position', async () => {
    const basePdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    const result = await insert(basePdf, insertPdf, 1);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('throws error for invalid position', async () => {
    const basePdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    await expect(insert(basePdf, insertPdf, 4)).rejects.toThrow(
      '[@pdfme/manipulator] Invalid position'
    );
  });
});

describe('extract', () => {
  test('extracts specified pages from PDF', async () => {
    const pdf = await createTestPDF(5);
    const results = await extract(pdf, [1, 3]);
    expect(results.length).toBe(2);
    for (const result of results) {
      expect(await getPDFPageCount(result)).toBe(1);
    }
  });

  test('throws error when no pages provided', async () => {
    const pdf = await createTestPDF(3);
    await expect(extract(pdf, [])).rejects.toThrow(
      '[@pdfme/manipulator] At least one page number is required'
    );
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(extract(pdf, [3])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid page number'
    );
  });
});

describe('rotate', () => {
  test('rotates PDF pages by specified degrees', async () => {
    const pdf = await createTestPDF(2);
    const result = await rotate(pdf, 90);
    expect(await getPDFPageCount(result)).toBe(2);
  });

  test('throws error for non-90-degree rotation', async () => {
    const pdf = await createTestPDF(2);
    await expect(rotate(pdf, 45)).rejects.toThrow(
      '[@pdfme/manipulator] Rotation degrees must be a multiple of 90'
    );
  });
});
