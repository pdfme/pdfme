import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_FONT_NAME, getDefaultFont, getDynamicTemplate, Template } from '@pdfme/common';
import { getDynamicLayoutForTable, table, text } from '@pdfme/schemas';
import { createBoxDimension } from '../../schemas/src/box.js';
import type { CellStyle, TableSchema } from '../../schemas/src/tables/types.js';
import generate from '../src/generate.js';
import { getImageSnapshotOptions, pdfToImages } from './utils.js';

const FONT = getDefaultFont();
const ISSUE_BODY = [['ABCDEFGHIJKLMNO'], ['SECOND ROW']];

const createCellStyle = (overrides: Partial<CellStyle> = {}): CellStyle => ({
  fontName: DEFAULT_FONT_NAME,
  alignment: 'left',
  verticalAlignment: 'top',
  fontSize: 20,
  lineHeight: 1,
  characterSpacing: 0,
  fontColor: '#000000',
  backgroundColor: '#ffffff',
  borderColor: '#000000',
  borderWidth: createBoxDimension(0),
  padding: createBoxDimension(0),
  ...overrides,
});

const createIssueTableSchema = (borderWidth: CellStyle['borderWidth']): TableSchema =>
  ({
    ...structuredClone(table.propPanel.defaultSchema),
    name: 'items',
    position: { x: 15, y: 20 },
    width: 50,
    height: 20,
    content: JSON.stringify(ISSUE_BODY),
    showHead: false,
    repeatHead: false,
    head: [''],
    headWidthPercentages: [100],
    tableStyles: { borderColor: '#000000', borderWidth: 0 },
    headStyles: createCellStyle(),
    bodyStyles: {
      ...createCellStyle({
        padding: { top: 0, right: 10, bottom: 0, left: 10 },
        borderWidth,
        backgroundColor: '#ff6666',
        alternateBackgroundColor: '#eeeeee',
      }),
    },
    columnStyles: {},
  }) as TableSchema;

const createTemplate = (borderWidth: CellStyle['borderWidth']): Template => ({
  basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
  schemas: [
    [
      createIssueTableSchema(borderWidth),
      {
        ...structuredClone(text.propPanel.defaultSchema),
        name: 'following',
        position: { x: 15, y: 70 },
        width: 80,
        height: 10,
        fontSize: 13,
        content: 'FOLLOWING TEXT',
      },
    ],
  ],
});

const cases = [
  {
    name: 'padding-only',
    borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    name: 'padding-plus-3mm-borders',
    borderWidth: { top: 0, right: 3, bottom: 0, left: 3 },
  },
  {
    name: 'vertical-borders',
    borderWidth: { top: 5, right: 0, bottom: 5, left: 0 },
  },
] as const;

describe('table row overflow (#1579)', () => {
  test.each(cases)(
    'generates a PDF where $name wrapped text stays in its row',
    async ({ name, borderWidth }) => {
      const template = createTemplate(borderWidth);
      const inputs = [{ items: JSON.stringify(ISSUE_BODY), following: 'FOLLOWING TEXT' }];
      const bytes = await generate({
        template,
        inputs,
        plugins: { table, text },
        options: { font: FONT },
      });
      const images = await pdfToImages(bytes);
      expect(images).toHaveLength(1);

      const dumpDir = process.env.TABLE_OVERFLOW_DUMP_DIR;
      if (dumpDir) {
        writeFileSync(path.join(dumpDir, `issue-1579-${name}.png`), images[0]);
      }

      const dynamicTemplate = await getDynamicTemplate({
        template,
        input: inputs[0],
        options: { font: FONT },
        _cache: new Map(),
        getDynamicHeights: getDynamicLayoutForTable,
      });
      const items = dynamicTemplate.schemas[0].find((schema) => schema.name === 'items');
      const following = dynamicTemplate.schemas[0].find((schema) => schema.name === 'following');
      expect(items).toBeDefined();
      expect(following).toBeDefined();
      expect(following!.position.y).toBeGreaterThan(items!.position.y + items!.height);

      await expect(images[0]).toMatchImage(getImageSnapshotOptions(`issue-1579-${name}`));
    },
  );

  test('repeating header and a following field stay below a multi-page table', async () => {
    const body = Array.from({ length: 12 }, (_, index) => [
      index === 0 ? 'ABCDEFGHIJKLMNO' : `ROW ${index + 1}`,
    ]);
    const schema = createIssueTableSchema({ top: 2, right: 3, bottom: 2, left: 3 });
    schema.showHead = true;
    schema.repeatHead = true;
    schema.head = ['COL'];
    schema.headStyles = createCellStyle({
      backgroundColor: '#2980ba',
      fontColor: '#ffffff',
      padding: { top: 1, right: 4, bottom: 1, left: 4 },
      borderWidth: { top: 1, right: 1, bottom: 1, left: 1 },
    });
    const template: Template = {
      basePdf: { width: 210, height: 80, padding: [8, 8, 8, 8] },
      schemas: [
        [
          { ...schema, position: { x: 8, y: 10 }, content: JSON.stringify(body) },
          {
            ...structuredClone(text.propPanel.defaultSchema),
            name: 'following',
            position: { x: 8, y: 40 },
            width: 80,
            height: 8,
            fontSize: 12,
            content: 'AFTER TABLE',
          },
        ],
      ],
    };
    const inputs = [{ items: JSON.stringify(body), following: 'AFTER TABLE' }];
    const bytes = await generate({
      template,
      inputs,
      plugins: { table, text },
      options: { font: FONT },
    });
    const images = await pdfToImages(bytes);
    expect(images.length).toBeGreaterThan(1);

    const dumpDir = process.env.TABLE_OVERFLOW_DUMP_DIR;
    if (dumpDir) {
      images.forEach((image, index) => {
        writeFileSync(path.join(dumpDir, `issue-1579-multipage-${index + 1}.png`), image);
      });
    }

    const dynamicTemplate = await getDynamicTemplate({
      template,
      input: inputs[0],
      options: { font: FONT },
      _cache: new Map(),
      getDynamicHeights: getDynamicLayoutForTable,
    });
    const lastTablePageIndex = dynamicTemplate.schemas.findLastIndex((page) =>
      page.some((item) => item.name === 'items'),
    );
    const followingPageIndex = dynamicTemplate.schemas.findIndex((page) =>
      page.some((item) => item.name === 'following'),
    );
    const lastTable = dynamicTemplate.schemas[lastTablePageIndex]?.find(
      (item) => item.name === 'items',
    );
    const following = dynamicTemplate.schemas[followingPageIndex]?.find(
      (item) => item.name === 'following',
    );
    expect(lastTable).toBeDefined();
    expect(following).toBeDefined();
    expect(followingPageIndex).toBeGreaterThanOrEqual(lastTablePageIndex);
    if (followingPageIndex === lastTablePageIndex) {
      expect(following!.position.y).toBeGreaterThan(lastTable!.position.y + lastTable!.height);
    }

    for (let i = 0; i < images.length; i++) {
      await expect(images[i]).toMatchImage(
        getImageSnapshotOptions(`issue-1579-multipage-${i + 1}`),
      );
    }
  });
});
