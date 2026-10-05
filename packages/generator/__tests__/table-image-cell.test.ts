import { getDefaultFont, getDynamicTemplate, type Template } from '@pdfme/common';
import { getDynamicLayoutForTable, table, text } from '@pdfme/schemas';
import { createBoxDimension } from '../../schemas/src/box.js';
import { createSingleTable } from '../../schemas/src/tables/tableHelper.js';
import type { CellStyle, TableSchema } from '../../schemas/src/tables/types.js';
import {
  SQUARE_PNG,
  TALL_1_3_PNG,
  WIDE_2_1_PNG,
  WIDE_3_1_PNG,
} from '../../schemas/__tests__/assets/tableImages.js';
import generate from '../src/generate.js';
import { getImageSnapshotOptions, pdfToImages } from './utils.js';

const FONT = getDefaultFont();
const IMAGES = [WIDE_3_1_PNG, TALL_1_3_PNG, SQUARE_PNG, WIDE_2_1_PNG];

const bodyStyle = (overrides: Partial<CellStyle> = {}): CellStyle => ({
  ...structuredClone(table.propPanel.defaultSchema.bodyStyles),
  fontName: undefined,
  fontSize: 10,
  lineHeight: 1,
  padding: createBoxDimension(2),
  borderWidth: createBoxDimension(0.2),
  ...overrides,
});

const imageTableSchema = (overrides: Partial<TableSchema> = {}): TableSchema =>
  ({
    ...structuredClone(table.propPanel.defaultSchema),
    name: 'items',
    position: { x: 15, y: 18 },
    width: 180,
    height: 40,
    showHead: true,
    repeatHead: true,
    head: ['Item', 'Photo'],
    headWidthPercentages: [35, 65],
    headStyles: {
      ...structuredClone(table.propPanel.defaultSchema.headStyles),
      fontName: undefined,
      fontSize: 11,
      padding: createBoxDimension(2),
      borderWidth: createBoxDimension(0),
      backgroundColor: '#1d4e89',
      fontColor: '#ffffff',
    },
    bodyStyles: bodyStyle({ alternateBackgroundColor: '#f3f4f6' }),
    columnStyles: {
      alignment: { 1: 'center' },
      cellType: { 1: 'image' },
    },
    ...overrides,
  }) as TableSchema;

describe('table image columns', () => {
  test('repeats the head when fixed 20mm rows cross a page', async () => {
    const body = Array.from({ length: 20 }, (_, index) => [
      `Row ${index + 1}`,
      WIDE_3_1_PNG,
    ]);
    const schema = imageTableSchema({
      content: JSON.stringify(body),
      columnStyles: { alignment: { 1: 'center' }, cellType: { 1: 'image' } },
    });
    const template: Template = {
      basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
      schemas: [[schema]],
    };
    const inputs = [{ items: JSON.stringify(body) }];
    const bytes = await generate({
      template,
      inputs,
      plugins: { table, text },
      options: { font: FONT },
    });
    const images = await pdfToImages(bytes);

    expect(images.length).toBeGreaterThan(1);
    for (let i = 0; i < images.length; i++) {
      await expect(images[i]).toMatchImage(
        getImageSnapshotOptions(`table-image-fixed-repeat-head-${i + 1}`),
      );
    }
  });

  test('auto row heights follow mixed ratios and empty cells stay with the text', async () => {
    const body = Array.from({ length: 8 }, (_, index) => [
      `Note ${index + 1}`,
      (index + 1) % 5 === 0 ? '' : IMAGES[index % IMAGES.length],
    ]);
    const schema = imageTableSchema({
      content: JSON.stringify(body),
      width: 90,
      headWidthPercentages: [70, 30],
      columnStyles: {
        alignment: { 1: 'center' },
        cellType: { 1: 'image' },
        imageHeightMode: { 1: 'auto' },
        imageHeight: { 1: 20 },
      },
    });
    const template: Template = {
      basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
      schemas: [[schema]],
    };
    const inputs = [{ items: JSON.stringify(body) }];
    const measured = await createSingleTable(body, {
      schema,
      basePdf: template.basePdf,
      options: { font: FONT },
      _cache: new Map(),
    });
    const rows = measured.body.map((row) => row.height);
    const emptyRow = rows[4];
    expect(rows[1]).toBeGreaterThan(rows[0]);
    expect(rows[2]).toBeGreaterThan(rows[3]);
    expect(emptyRow).toBeLessThan(rows[0]);
    expect(emptyRow).toBeLessThan(rows[1]);
    expect(measured.body[4].cells[1].imageContentHeight).toBe(0);
    expect(measured.body[0].cells[1].imageContentHeight).toBeGreaterThan(0);

    const bytes = await generate({
      template,
      inputs,
      plugins: { table, text },
      options: { font: FONT },
    });
    const images = await pdfToImages(bytes);
    expect(images.length).toBeGreaterThan(0);
    for (let i = 0; i < images.length; i++) {
      await expect(images[i]).toMatchImage(
        getImageSnapshotOptions(`table-image-auto-mixed-${i + 1}`),
      );
    }
  });

  test('pushes a following text field below an image table', async () => {
    const body = [
      ['Alpha', WIDE_3_1_PNG],
      ['Beta', TALL_1_3_PNG],
      ['Gamma', SQUARE_PNG],
    ];
    const schema = imageTableSchema({
      content: JSON.stringify(body),
      columnStyles: {
        cellType: { 1: 'image' },
        imageHeightMode: { 1: 'fixed' },
        imageHeight: { 1: 18 },
      },
    });
    const template: Template = {
      basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
      schemas: [
        [
          schema,
          {
            ...structuredClone(text.propPanel.defaultSchema),
            name: 'following',
            position: { x: 15, y: 62 },
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
    const dynamicTemplate = await getDynamicTemplate({
      template,
      input: inputs[0],
      options: { font: FONT },
      _cache: new Map(),
      getDynamicHeights: getDynamicLayoutForTable,
    });
    const items = dynamicTemplate.schemas[0].find((item) => item.name === 'items');
    const following = dynamicTemplate.schemas[0].find((item) => item.name === 'following');

    expect(images).toHaveLength(1);
    expect(items).toBeDefined();
    expect(following).toBeDefined();
    expect(following!.position.y).toBeGreaterThan(items!.position.y + items!.height);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('table-image-pushes-text'));
  });
});
