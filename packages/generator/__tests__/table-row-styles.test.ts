import { getDefaultFont, getDynamicTemplate, Template } from '@pdfme/common';
import { getDynamicLayoutForTable, table } from '@pdfme/schemas';
import { getTableBodyRange } from '../../schemas/src/splitRange.js';
import { createSingleTable } from '../../schemas/src/tables/tableHelper.js';
import type { TableSchema } from '../../schemas/src/tables/types.js';
import generate from '../src/generate.js';
import { pdfToImages } from './utils.js';

const FONT = getDefaultFont();
const RED = '#d00000';
const ROWS = Array.from({ length: 40 }, (_, i) => [`Item ${i}`, String(i)]);
// One row on each page, so the test proves styles survive the split.
const STYLED = [3, 35];

const createTemplate = (): Template => ({
  basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
  schemas: [
    [
      {
        ...structuredClone(table.propPanel.defaultSchema),
        name: 'items',
        position: { x: 10, y: 10 },
        width: 190,
        height: 20,
        content: JSON.stringify(ROWS),
        head: ['Item', 'Qty'],
        headWidthPercentages: [70, 30],
        showHead: true,
        repeatHead: true,
        rowStyles: Object.fromEntries(STYLED.map((i) => [i, { fontColor: RED }])),
      } as TableSchema,
    ],
  ],
});

describe('table rowStyles across pages', () => {
  test('a long table keeps each row style and repeats its header on every page', async () => {
    const template = createTemplate();
    const input = { items: JSON.stringify(ROWS) };

    const bytes = await generate({
      template,
      inputs: [input],
      plugins: { table },
      options: { font: FONT },
    });
    expect((await pdfToImages(bytes)).length).toBeGreaterThan(1);

    const dynamic = await getDynamicTemplate({
      template,
      input,
      options: { font: FONT },
      _cache: new Map(),
      getDynamicHeights: getDynamicLayoutForTable,
    });
    const segments = dynamic.schemas.flatMap((page) =>
      page.filter((schema) => schema.name === 'items'),
    ) as TableSchema[];
    expect(segments.length).toBeGreaterThan(1);

    const styledSeen: number[] = [];
    for (const segment of segments) {
      const range = getTableBodyRange(segment) ?? { start: 0 };
      const body = ROWS.slice(range.start, range.end);
      const part = await createSingleTable(body, {
        schema: segment,
        basePdf: template.basePdf,
        options: { font: FONT },
        _cache: new Map(),
      });

      expect(part.settings.showHead).toBe(true);
      part.body.forEach((row, i) => {
        const index = range.start + i;
        const colour = row.cells[0].styles.textColor;
        if (STYLED.includes(index)) {
          expect(colour).toBe(RED);
          styledSeen.push(index);
        } else {
          expect(colour).not.toBe(RED);
        }
      });
    }
    expect(styledSeen).toEqual(STYLED);
  });
});
