import { merge, split, remove, insert, rotate, move, organize } from '../src/index.js';
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
    await expect(remove(pdf, [3])).rejects.toThrow('[@pdfme/manipulator] Invalid page number');
  });
});

describe('insert', () => {
  test('inserts PDF at specified position', async () => {
    const basePdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    const result = await insert(basePdf, [{ pdf: insertPdf, position: 1 }]);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('throws error for invalid position', async () => {
    const basePdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    await expect(insert(basePdf, [{ pdf: insertPdf, position: 4 }])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid position'
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

describe('move', () => {
  test('moves page from one position to another', async () => {
    const pdf = await createTestPDF(3);
    const result = await move(pdf, [{ from: 0, to: 2 }]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(move(pdf, [{ from: 3, to: 0 }])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid page number: from=3, to=0, total pages=3'
    );
  });
});

describe('organize', () => {
  test('performs single remove operation', async () => {
    const pdf = await createTestPDF(5);
    const result = await organize(pdf, [
      { type: 'remove', data: { position: 1 } },
      { type: 'remove', data: { position: 3 } },
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs single insert operation', async () => {
    const pdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(2);
    const result = await organize(pdf, [{ type: 'insert', data: { pdf: insertPdf, position: 1 } }]);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('performs single replace operation', async () => {
    const pdf = await createTestPDF(3);
    const replacePdf = await createTestPDF(1);
    const result = await organize(pdf, [
      { type: 'replace', data: { position: 1, pdf: replacePdf } },
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs single rotate operation', async () => {
    const pdf = await createTestPDF(3);
    const result = await organize(pdf, [
      { type: 'rotate', data: { position: 0, degrees: 90 } },
      { type: 'rotate', data: { position: 2, degrees: 90 } },
    ]);
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('performs multiple operations in sequence', async () => {
    const pdf = await createTestPDF(5);
    const insertPdf = await createTestPDF(2);
    const replacePdf = await createTestPDF(1);
    const result = await organize(pdf, [
      { type: 'remove', data: { position: 1 } },
      { type: 'remove', data: { position: 3 } }, // 5 -> 3 pages

      { type: 'insert', data: { pdf: insertPdf, position: 1 } }, // 3 -> 5 pages
      { type: 'replace', data: { position: 2, pdf: replacePdf } }, // Still 5 pages
      { type: 'rotate', data: { position: 0, degrees: 90 } },
      { type: 'rotate', data: { position: 3, degrees: 90 } }, // Still 5 pages
    ]);
    expect(await getPDFPageCount(result)).toBe(5);
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(organize(pdf, [{ type: 'remove', data: { position: 3 } }])).rejects.toThrow(
      '[@pdfme/manipulator] Invalid page number'
    );
  });

  test('throws error for invalid position', async () => {
    const pdf = await createTestPDF(3);
    const insertPdf = await createTestPDF(1);
    await expect(
      organize(pdf, [{ type: 'insert', data: { pdf: insertPdf, position: 4 } }])
    ).rejects.toThrow('[@pdfme/manipulator] Invalid position');
  });

  test('throws error for invalid rotation degrees', async () => {
    const pdf = await createTestPDF(3);
    await expect(
      organize(pdf, [
        // @ts-expect-error
        { type: 'rotate', data: { pages: [0], degrees: 45 } },
      ])
    ).rejects.toThrow('[@pdfme/manipulator] Rotation degrees must be a multiple of 90');
  });

  test('throws error for empty actions array', async () => {
    const pdf = await createTestPDF(3);
    await expect(organize(pdf, [])).rejects.toThrow(
      '[@pdfme/manipulator] At least one action is required'
    );
  });

  test('throws error for unknown action type', async () => {
    const pdf = await createTestPDF(3);
    // @ts-expect-error
    await expect(organize(pdf, [{ type: 'invalid' as any, data: { pages: [] } }])).rejects.toThrow(
      '[@pdfme/manipulator] Unknown action type: invalid'
    );
  });
});


// TODO ここからちゃんとしたテストを書く