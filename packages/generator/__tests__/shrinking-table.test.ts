import { PDFDocument } from '@pdfme/pdf-lib';
import { Template } from '@pdfme/common';
import { table, text } from '@pdfme/schemas';
import generate from '../src/generate.js';
import { getFont } from './utils.js';

describe('generate a shrinking table with an overlapping caption (#1598)', () => {
  test.each([1, 2])(
    'generates %s input(s) without changing the template or inputs',
    async (count) => {
      const tableSchema = structuredClone(table.propPanel.defaultSchema);
      for (const styles of [tableSchema.headStyles, tableSchema.bodyStyles]) {
        styles.fontSize = 13;
        styles.lineHeight = 1;
        styles.padding = { top: 5, right: 5, bottom: 5, left: 5 };
      }
      const template: Template = {
        basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
        schemas: [
          [
            {
              ...tableSchema,
              name: 'tbl',
              position: { x: 15, y: 19.91 },
              width: 150,
              height: 52.932,
              showHead: true,
              head: ['A', 'B', 'C'],
              headWidthPercentages: [30, 30, 40],
              content: JSON.stringify([['1', '2', '3']]),
            },
            {
              ...text.propPanel.defaultSchema,
              name: 'caption',
              position: { x: 15, y: 20 },
              width: 70,
              height: 9,
              content: 'CAPTION',
            },
          ],
        ],
      };
      const inputs = Array.from({ length: count }, (_, i) => ({
        tbl: JSON.stringify([['1', '2', '3']]),
        caption: `CAPTION ${i}`,
      }));
      const original = structuredClone({ template, inputs });
      const bytes = await generate({
        template,
        inputs,
        plugins: { table, text },
        options: { font: getFont() },
      });
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(count);
      expect({ template, inputs }).toEqual(original);
    },
  );
});
