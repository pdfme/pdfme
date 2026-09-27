import * as fontkit from 'fontkit';
import { getDefaultFont } from '@pdfme/common';
import { PDFDocument } from '@pdfme/pdf-lib';
import { embedAndGetFont } from '../src/pdfFont.js';

const createPdfDoc = async () => {
  const pdfDoc = await PDFDocument.create();
  // @ts-expect-error registerFontkit method is not in type definitions but exists at runtime
  pdfDoc.registerFontkit(fontkit);
  return pdfDoc;
};

describe('embedAndGetFont', () => {
  test.each([
    ['invalid font data', 'BrokenFont', 'Unknown font format'],
    ['a missing font name', 'NoSuchFont', 'Font "NoSuchFont" is not found'],
  ])(
    'does not leak an unhandled rejection when the promise for %s is never awaited',
    async (_label, fontName, expectedMessage) => {
      const pdfDoc = await createPdfDoc();
      const font = { ...getDefaultFont(), BrokenFont: { fallback: false, data: 'not-a-font' } };
      const _cache = new Map<string | number, unknown>();

      const originalListeners = process.listeners('unhandledRejection');
      process.removeAllListeners('unhandledRejection');
      const unhandled: unknown[] = [];
      const capture = (reason: unknown) => {
        unhandled.push(reason);
      };
      process.on('unhandledRejection', capture);

      try {
        // Deliberately drop the returned promise without awaiting it, as pdfRender
        // does when an intermediate await throws before the embed promise is awaited.
        const orphaned = embedAndGetFont({ pdfDoc, font, fontName, _cache });

        // Node only reports unhandled rejections after the microtask queue drains,
        // so cross macrotask boundaries before asserting nothing leaked.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(unhandled).toEqual([]);
        // Callers that do await the promise still receive the error.
        await expect(orphaned).rejects.toThrow(expectedMessage);
      } finally {
        process.removeListener('unhandledRejection', capture);
        for (const listener of originalListeners) {
          process.on('unhandledRejection', listener);
        }
      }
    },
  );
});
