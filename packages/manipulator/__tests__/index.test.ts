import fs from 'fs';
import path from 'path';
import { PDFDocument } from '@pdfme/pdf-lib';
import { pdf2img } from '@pdfme/converter';
import { merge, split, remove, insert, rotate, move, organize } from '../src/index.js';
import 'jest-image-snapshot';

const createTestPDF = async (pageCount: number): Promise<ArrayBuffer> => {
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

const pdfToImages = async (pdf: ArrayBuffer): Promise<Buffer[]> => {
  const arrayBuffers = await pdf2img(pdf, { imageType: 'png' });
  return arrayBuffers.map((buf) => Buffer.from(new Uint8Array(buf)));
};

const getPDFPageCount = async (pdf: ArrayBuffer): Promise<number> => {
  const pdfDoc = await PDFDocument.load(pdf);
  return pdfDoc.getPageCount();
};

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
    const result = await move(pdf, { from: 0, to: 2 });
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('throws error for invalid page numbers', async () => {
    const pdf = await createTestPDF(3);
    await expect(move(pdf, { from: 3, to: 0 })).rejects.toThrow(
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
      // @ts-expect-error
      organize(pdf, [{ type: 'rotate', data: { pages: [0], degrees: 45 } }])
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
    await expect(organize(pdf, [{ type: 'invalid', data: { pages: [] } }])).rejects.toThrow(
      '[@pdfme/manipulator] Unknown action type: invalid'
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
      // @ts-expect-error
      organize(pdf, [{ type: 'rotate', data: { pages: [0], degrees: 45 } }])
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
    await expect(organize(pdf, [{ type: 'invalid', data: { pages: [] } }])).rejects.toThrow(
      '[@pdfme/manipulator] Unknown action type: invalid'
    );
  });
});

describe('PDF manipulator E2E Tests with real PDF files', () => {
  const assetPath = (fileName: string) => path.join(__dirname, 'assets/pdfs', fileName);

  function toArrayBuffer(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  const fiveP = toArrayBuffer(fs.readFileSync(assetPath('5p.pdf')));
  const aPdf = toArrayBuffer(fs.readFileSync(assetPath('a.pdf')));
  const bPdf = toArrayBuffer(fs.readFileSync(assetPath('b.pdf')));
  const cPdf = toArrayBuffer(fs.readFileSync(assetPath('c.pdf')));

  //
  // merge
  //
  test('merge: merge a.pdf, b.pdf, c.pdf in order', async () => {
    const mergedBuffer = await merge([aPdf, bPdf, cPdf]);

    const images = await pdfToImages(mergedBuffer);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `merge-abc-page${i + 1}`,
      });
    }
  });

  //
  // split
  //
  test('split: split 5p.pdf into pages 1-2 and 3-5', async () => {
    const [split12, split35] = await split(fiveP, [
      { start: 0, end: 1 }, // pages 1-2
      { start: 2, end: 4 }, // pages 3-5
    ]);

    const images12 = await pdfToImages(split12);
    const images35 = await pdfToImages(split35);

    for (let i = 0; i < images12.length; i++) {
      expect(images12[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `split-5p-1-2-page${i + 1}`,
      });
    }

    for (let i = 0; i < images35.length; i++) {
      expect(images35[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `split-5p-3-5-page${i + 1}`,
      });
    }
  });

  //
  // remove
  //
  test('remove: remove the 1st page of 5p.pdf', async () => {
    const removed = await remove(fiveP, [0]);

    const images = await pdfToImages(removed);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `remove-5p-page1-result-page${i + 1}`,
      });
    }
  });

  test('remove: remove the 1st and 3rd pages of 5p.pdf', async () => {
    // Note: This assumes removing all at once, not one by one with index shifting
    const removed = await remove(fiveP, [0, 2]);

    const images = await pdfToImages(removed);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `remove-5p-pages1-3-result-page${i + 1}`,
      });
    }
  });

  //
  // insert
  //
  test('insert: insert a.pdf at position 0 in 5p.pdf', async () => {
    const inserted = await insert(fiveP, [{ pdf: aPdf, position: 0 }]);

    const images = await pdfToImages(inserted);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `insert-5p-a-at-0-result-page${i + 1}`,
      });
    }
  });

  test('insert: insert a.pdf at position 0 and 2 in 5p.pdf', async () => {
    // Note: the second insert is done in the same buffer, so the offset changes after the first insert
    const inserted = await insert(fiveP, [
      { pdf: aPdf, position: 0 },
      { pdf: aPdf, position: 2 }, // The PDF is 6 pages after the first insert
    ]);

    const images = await pdfToImages(inserted);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `insert-5p-a-at-0-and-2-result-page${i + 1}`,
      });
    }
  });

  //
  // rotate
  //
  test('rotate: rotate all pages of 5p.pdf by 90 degrees', async () => {
    const rotated = await rotate(fiveP, 90);

    const images = await pdfToImages(rotated);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `rotate-5p-90deg-all-result-page${i + 1}`,
      });
    }
  });

  test('rotate: rotate only the 2nd page of 5p.pdf by 180 degrees', async () => {
    // pageNumbers=[1] -> only the 2nd page is rotated by 180 degrees
    const rotated = await rotate(fiveP, 180, [1]);

    const images = await pdfToImages(rotated);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `rotate-5p-180deg-page1-result-page${i + 1}`,
      });
    }
  });

  test('rotate: rotate pages 2 and 4 of 5p.pdf by 270 degrees', async () => {
    // Rotate the 2nd and 4th pages by 270 degrees
    const rotated = await rotate(fiveP, 270, [1, 3]);

    const images = await pdfToImages(rotated);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `rotate-5p-270deg-pages1-3-result-page${i + 1}`,
      });
    }
  });

  //
  // move
  //
  test('move: move the 1st page (index:0) of 5p.pdf to the 3rd position (index:2)', async () => {
    const moved = await move(fiveP, { from: 0, to: 2 });

    const images = await pdfToImages(moved);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `move-5p-page0-to-2-result-page${i + 1}`,
      });
    }
  });

  //
  // organize (single operation)
  //
  test('organize: single remove (remove the 2nd page)', async () => {
    const result = await organize(fiveP, [{ type: 'remove', data: { position: 1 } }]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-remove-only-result-page${i + 1}`,
      });
    }
  });

  test('organize: single insert (insert a.pdf at page 1)', async () => {
    const result = await organize(fiveP, [{ type: 'insert', data: { pdf: aPdf, position: 0 } }]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-insert-only-result-page${i + 1}`,
      });
    }
  });

  test('organize: single replace (replace 2nd page with a.pdf)', async () => {
    const result = await organize(fiveP, [{ type: 'replace', data: { pdf: aPdf, position: 1 } }]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-replace-only-result-page${i + 1}`,
      });
    }
  });

  test('organize: single rotate (rotate pages 1 and 3 by 90 degrees)', async () => {
    const result = await organize(fiveP, [
      { type: 'rotate', data: { position: 0, degrees: 90 } },
      { type: 'rotate', data: { position: 2, degrees: 90 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-rotate-only-result-page${i + 1}`,
      });
    }
  });

  test('organize: multiple operations (remove -> remove -> insert -> replace -> rotate -> rotate)', async () => {
    const insertPdf = aPdf;
    const replacePdf = bPdf;
    const result = await organize(fiveP, [
      { type: 'remove', data: { position: 1 } },
      { type: 'remove', data: { position: 3 } }, // 5 -> 3 pages
      { type: 'insert', data: { pdf: insertPdf, position: 1 } }, // 3 -> 4 pages
      { type: 'replace', data: { position: 2, pdf: replacePdf } }, // still 4 pages
      { type: 'rotate', data: { position: 0, degrees: 90 } },
      { type: 'rotate', data: { position: 3, degrees: 90 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-multiple-ops-result-page${i + 1}`,
      });
    }
  });

  //
  // organize - complex examples
  //
  test('organize: Remove -> Insert -> Move (check index changes)', async () => {
    // Remove the 2nd page (index:1) => 4 pages
    // Insert a.pdf at the 2nd page (index:1) => 5 pages
    // Move the newly inserted page (index:1) to the 1st page (index:0) => 5 pages

    const result = await organize(fiveP, [
      { type: 'remove', data: { position: 1 } },
      { type: 'insert', data: { pdf: aPdf, position: 1 } },
      { type: 'move', data: { from: 1, to: 0 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-1-result-page${i + 1}`,
      });
    }
  });

  test('organize: Replace -> Rotate -> Remove', async () => {
    // Replace the 3rd page with a.pdf => 5 pages
    // Rotate the 3rd page by 180 => 5 pages
    // Remove the 1st page => 4 pages

    const result = await organize(fiveP, [
      { type: 'replace', data: { pdf: aPdf, position: 2 } },
      { type: 'rotate', data: { position: 2, degrees: 180 } },
      { type: 'remove', data: { position: 0 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-2-result-page${i + 1}`,
      });
    }
  });

  test('organize: Insert -> Insert -> Move -> Move', async () => {
    // Insert a.pdf at the end (index:5) => 6 pages
    // Insert b.pdf at the start (index:0) => 7 pages
    // Move the 3rd page (index:2) to the 6th page (index:5) => 7 pages
    // Move the 4th page (index:3) to the 2nd page (index:1) => 7 pages

    const result = await organize(fiveP, [
      { type: 'insert', data: { pdf: aPdf, position: 5 } },
      { type: 'insert', data: { pdf: bPdf, position: 0 } },
      { type: 'move', data: { from: 2, to: 5 } },
      { type: 'move', data: { from: 3, to: 1 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-3-result-page${i + 1}`,
      });
    }
  });

  test('organize: Rotate -> Rotate -> Remove', async () => {
    // Rotate the 2nd and 4th pages by 90 => 5 pages
    // Rotate the 3rd page by 270 => 5 pages
    // Remove the 1st page => 4 pages

    const result = await organize(fiveP, [
      { type: 'rotate', data: { position: 1, degrees: 90 } },
      { type: 'rotate', data: { position: 3, degrees: 90 } },
      { type: 'rotate', data: { position: 2, degrees: 270 } },
      { type: 'remove', data: { position: 0 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-4-result-page${i + 1}`,
      });
    }
  });

  test('organize: Remove -> Insert -> Remove -> Insert (multiple times)', async () => {
    // Remove the 5th page (index:4) => 4 pages
    // Insert a.pdf at the 2nd page (index:1) => 5 pages
    // Remove the 1st page (index:0) => 4 pages
    // Insert b.pdf at the end (index:4) => 5 pages

    const result = await organize(fiveP, [
      { type: 'remove', data: { position: 4 } },
      { type: 'insert', data: { pdf: aPdf, position: 1 } },
      { type: 'remove', data: { position: 0 } },
      { type: 'insert', data: { pdf: bPdf, position: 4 } },
    ]);

    const images = await pdfToImages(result);
    for (let i = 0; i < images.length; i++) {
      expect(images[i]).toMatchImageSnapshot({
        customSnapshotIdentifier: `organize-composite-5-result-page${i + 1}`,
      });
    }
  });
});
