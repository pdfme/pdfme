import { merge, split, remove, insert, extract, rotate, organize } from '../src/index.js';
import { createTestPDF, getPDFPageCount } from './utils.js';

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
    // @ts-expect-error
    await expect(rotate(pdf, 45)).rejects.toThrow(
      '[@pdfme/manipulator] Rotation degrees must be a multiple of 90'
    );
  });
});

describe('organize', () => {
  test('performs single remove operation', async () => {
    const pdf = await createTestPDF(5);
    const result = await organize(pdf, [
      { type: 'remove', data: { pages: [1, 3] } }
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs single insert operation', async () => {
    const pdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    const result = await organize(pdf, [
      { type: 'insert', data: { pdfs: [insertPdf], position: 1 } }
    ]);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('performs single replace operation', async () => {
    const pdf = await createTestPDF(3);
    const replacePdf = await createTestPDF(1);
    const result = await organize(pdf, [
      { type: 'replace', data: { targetPage: 1, pdf: replacePdf } }
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs single rotate operation', async () => {
    const pdf = await createTestPDF(3);
    const result = await organize(pdf, [
      { type: 'rotate', data: { pages: [0, 2], degrees: 90 } }
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs multiple operations in sequence', async () => {
    const pdf = await createTestPDF(5);
    const insertPdf = await createTestPDF(2);
    const replacePdf = await createTestPDF(1);
    const result = await organize(pdf, [
      { type: 'remove', data: { pages: [1, 3] } },      // 5 -> 3 pages
      { type: 'insert', data: { pdfs: [insertPdf], position: 1 } }, // 3 -> 5 pages
      { type: 'replace', data: { targetPage: 2, pdf: replacePdf } }, // Still 5 pages
      { type: 'rotate', data: { pages: [0, 3], degrees: 90 } }      // Still 5 pages
    ]);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(organize(pdf, [
      { type: 'remove', data: { pages: [3] } }
    ])).rejects.toThrow('[@pdfme/manipulator] Invalid page number');
  });

  test('throws error for invalid position', async () => {
    const pdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(1);
    await expect(organize(pdf, [
      { type: 'insert', data: { pdfs: [insertPdf], position: 4 } }
    ])).rejects.toThrow('[@pdfme/manipulator] Invalid position');
  });

  test('throws error for invalid rotation degrees', async () => {
    const pdf = await createTestPDF(3);
    await expect(organize(pdf, [
      // @ts-expect-error
      { type: 'rotate', data: { pages: [0], degrees: 45 } }
    ])).rejects.toThrow('[@pdfme/manipulator] Rotation degrees must be a multiple of 90');
  });

  test('throws error for empty actions array', async () => {
    const pdf = await createTestPDF(3);
    await expect(organize(pdf, [])).rejects.toThrow(
      '[@pdfme/manipulator] At least one action is required'
    );
  });

  test('throws error for unknown action type', async () => {
    const pdf = await createTestPDF(3);
    await expect(organize(pdf, [
      { type: 'invalid' as any, data: { pages: [] } }
    ])).rejects.toThrow('[@pdfme/manipulator] Unknown action type: invalid');
  });
});
