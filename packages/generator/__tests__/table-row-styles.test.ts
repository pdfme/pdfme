import { getDefaultFont, getDynamicTemplate, Template } from '@pdfme/common';
import { getDynamicLayoutForTable, table } from '@pdfme/schemas';
import { getTableBodyRange } from '../../schemas/src/splitRange.js';
import { createSingleTable } from '../../schemas/src/tables/tableHelper.js';
import type { CellStyle, TableSchema } from '../../schemas/src/tables/types.js';
import generate from '../src/generate.js';
import { pdfToImages } from './utils.js';

const FONT = getDefaultFont();
const RED = '#d00000';
const PAGE = {
  width: 210,
  height: 297,
  padding: [10, 10, 10, 10] as [number, number, number, number],
};
const ROWS = Array.from({ length: 40 }, (_, i) => [`Item ${i}`, String(i)]);
const INPUT = { items: JSON.stringify(ROWS) };

const createTemplate = (rowStyles: Record<number, Partial<CellStyle>>): Template => ({
  basePdf: PAGE,
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
        rowStyles,
      } as TableSchema,
    ],
  ],
});

// The table as laid out across pages: each page's part, the rows it holds and the table drawn there.
const layout = async (template: Template) => {
  const dynamic = await getDynamicTemplate({
    template,
    input: INPUT,
    options: { font: FONT },
    _cache: new Map(),
    getDynamicHeights: getDynamicLayoutForTable,
  });
  const parts = [];
  for (const page of dynamic.schemas) {
    for (const schema of page.filter((s) => s.name === 'items') as TableSchema[]) {
      const range = getTableBodyRange(schema) ?? { start: 0, end: ROWS.length };
      const drawn = await createSingleTable(ROWS.slice(range.start, range.end), {
        schema,
        basePdf: PAGE,
        options: { font: FONT },
        _cache: new Map(),
      });
      parts.push({ schema, start: range.start, end: range.end ?? ROWS.length, drawn });
    }
  }
  return parts;
};

describe('table rowStyles across pages', () => {
  test('a long table keeps each row style and repeats its header on every page', async () => {
    // One styled row on each page, so the test proves styles survive the split.
    const styled = [3, 35];
    const template = createTemplate(Object.fromEntries(styled.map((i) => [i, { fontColor: RED }])));

    const bytes = await generate({
      template,
      inputs: [INPUT],
      plugins: { table },
      options: { font: FONT },
    });
    expect((await pdfToImages(bytes)).length).toBeGreaterThan(1);

    const parts = await layout(template);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.map((part) => part.drawn.settings.showHead)).toEqual(parts.map(() => true));
    // Every row, in table order across the pages, with the colour it's drawn in: only the styled
    // rows are red.
    const red = parts.flatMap((part) =>
      part.drawn.body.flatMap((row, i) =>
        row.cells[0].styles.textColor === RED ? [part.start + i] : [],
      ),
    );
    expect(red).toEqual(styled);
  });

  test('a row style that makes the last row on a page taller moves it to the next page', async () => {
    const plain = await layout(createTemplate({}));
    const lastOnFirstPage = plain[1].start - 1;
    const lastRow = plain[0].drawn.body.at(-1)!;
    const bottom = PAGE.height - PAGE.padding[2];
    const spaceLeft = bottom - (plain[0].schema.position.y + plain[0].drawn.getHeight());

    // Extra padding above and below of more than the space left at the bottom of the first page, a
    // thicker border and a bigger font, so the row can no longer fit there.
    const pad = (side: 'top' | 'right' | 'bottom' | 'left') => lastRow.cells[0].padding(side);
    const template = createTemplate({
      [lastOnFirstPage]: {
        fontColor: RED,
        fontSize: 16,
        padding: {
          top: pad('top') + spaceLeft,
          right: pad('right'),
          bottom: pad('bottom') + spaceLeft,
          left: pad('left'),
        },
        borderWidth: { top: 1.5, right: 0.5, bottom: 1.5, left: 0.5 },
      },
    });
    const parts = await layout(template);

    // The styled row starts the second page, styled and under a repeated header.
    expect(parts[0].end).toBe(lastOnFirstPage);
    expect(parts[1].start).toBe(lastOnFirstPage);
    const moved = parts[1].drawn.body[0];
    expect(moved.cells[0].styles.textColor).toBe(RED);
    expect(moved.height).toBeGreaterThan(lastRow.height + spaceLeft);
    expect(parts[1].drawn.settings.showHead).toBe(true);

    // No page's part runs past the bottom margin, and every row is on exactly one page.
    for (const part of parts) {
      expect(part.schema.position.y + part.drawn.getHeight()).toBeLessThanOrEqual(bottom + 0.01);
    }
    expect(parts.map((p) => [p.start, p.end])).toEqual(
      parts.map((_, i) => [i === 0 ? 0 : parts[i - 1].end, parts[i].end]),
    );
    expect(parts.at(-1)!.end).toBe(ROWS.length);

    const bytes = await generate({
      template,
      inputs: [INPUT],
      plugins: { table },
      options: { font: FONT },
    });
    expect((await pdfToImages(bytes)).length).toBe(parts.length);
  });
});
