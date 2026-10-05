import { Buffer } from 'buffer';
import { afterEach } from 'vitest';
import { getDefaultFont, getDynamicTemplate, type Schema, type Template } from '@pdfme/common';
import { PDFDocument } from '@pdfme/pdf-lib';
import { getDynamicLayoutForTable, table, text } from '@pdfme/schemas';
import { createBoxDimension } from '../../schemas/src/box.js';
import { getTableBodyRange } from '../../schemas/src/splitRange.js';
import { getBodyWithSchemaRange } from '../../schemas/src/tables/helper.js';
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

const truncatedPng = () => {
  const bytes = Buffer.from(WIDE_3_1_PNG.split(',')[1], 'base64').subarray(0, 33);
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
};

const layoutTemplate = async (template: Template, input: Record<string, string>) => {
  const dynamicTemplate = await getDynamicTemplate({
    template,
    input,
    options: { font: FONT },
    _cache: new Map(),
    getDynamicHeights: getDynamicLayoutForTable,
  });

  expect(dynamicTemplate.schemas.length).toBeGreaterThan(0);
  expect(dynamicTemplate.schemas.every((page) => page.length > 0)).toBe(true);

  for (const page of dynamicTemplate.schemas) {
    const sorted = [...page].sort((left, right) => left.position.y - right.position.y);
    for (let index = 0; index < sorted.length - 1; index++) {
      const bottom = sorted[index].position.y + sorted[index].height;
      expect(sorted[index + 1].position.y).toBeGreaterThanOrEqual(bottom - 0.05);
    }

    for (const schema of page) {
      if (schema.type !== 'table') continue;
      const range = getTableBodyRange(schema);
      expect(range === undefined || range.end > range.start).toBe(true);
      const body = getBodyWithSchemaRange(input[schema.name] || '[]', schema as TableSchema);
      const measured = await createSingleTable(body, {
        schema,
        basePdf: template.basePdf,
        options: { font: FONT },
        _cache: new Map(),
      });
      const measuredHeight = measured.settings.showHead
        ? measured.getHeight()
        : measured.getBodyHeight();
      expect(Math.abs(measuredHeight - schema.height)).toBeLessThan(0.2);
    }
  }

  return dynamicTemplate;
};

const generatePages = async (template: Template, input: Record<string, string>) => {
  const bytes = await generate({
    template,
    inputs: [input],
    plugins: { table, text },
    options: { font: FONT },
  });
  return PDFDocument.load(bytes);
};

describe('table image column page breaks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const tallBody = [
    ['One', TALL_1_3_PNG],
    ['Two', TALL_1_3_PNG],
  ];

  const cappedSchema = (repeatHead: boolean): TableSchema =>
    imageTableSchema({
      content: JSON.stringify(tallBody),
      position: { x: 15, y: 20 },
      width: 160,
      headWidthPercentages: [25, 75],
      repeatHead,
      columnStyles: {
        cellType: { 1: 'image' },
        imageHeightMode: { 1: 'auto' },
      },
    });

  const templateFor = (schema: Schema, followingY: number): Template => ({
    basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
    schemas: [
      [
        schema,
        {
          ...structuredClone(text.propPanel.defaultSchema),
          name: 'following',
          position: { x: 15, y: followingY },
          width: 80,
          height: 8,
          fontSize: 12,
          content: 'AFTER TABLE',
        },
      ],
    ],
  });

  test.each([false, true])(
    'keeps a capped auto row from overlapping the next field when repeatHead is %s',
    async (repeatHead) => {
      const input = { items: JSON.stringify(tallBody), following: 'AFTER TABLE' };
      const template = templateFor(cappedSchema(repeatHead), 70);
      const dynamicTemplate = await layoutTemplate(template, input);
      const pdf = await generatePages(template, input);

      expect(pdf.getPageCount()).toBe(dynamicTemplate.schemas.length);
      const followingPage = dynamicTemplate.schemas.find((page) =>
        page.some((schema) => schema.name === 'following'),
      );
      expect(followingPage).toBeDefined();
      const following = followingPage!.find((schema) => schema.name === 'following')!;
      const tableOnSamePage = followingPage!.find((schema) => schema.name === 'items');
      if (tableOnSamePage) {
        expect(following.position.y).toBeGreaterThanOrEqual(
          tableOnSamePage.position.y + tableOnSamePage.height - 0.05,
        );
      }
    },
  );

  test('does not emit a blank or header-only page when a capped row starts below the page top', async () => {
    const input = { items: JSON.stringify(tallBody) };
    const template: Template = {
      basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
      schemas: [[cappedSchema(true)]],
    };
    const dynamicTemplate = await layoutTemplate(template, input);
    const pdf = await generatePages(template, input);

    expect(pdf.getPageCount()).toBe(dynamicTemplate.schemas.length);
    expect(dynamicTemplate.schemas[0].find((schema) => schema.name === 'items')?.position.y).toBe(
      15,
    );
  });

  test('keeps a tall text row with its header instead of a blank page and a header-only page', async () => {
    const lines = Array.from({ length: 25 }, () => 'WORD').join('\n');
    const body = [[lines], ['NEXT']];
    const schema = imageTableSchema({
      name: 'notes',
      position: { x: 15, y: 40 },
      width: 80,
      height: 20,
      showHead: true,
      repeatHead: true,
      head: ['Title'],
      headWidthPercentages: [100],
      content: JSON.stringify(body),
      columnStyles: {},
      bodyStyles: bodyStyle({ fontSize: 14, padding: createBoxDimension(1) }),
      headStyles: {
        ...structuredClone(table.propPanel.defaultSchema.headStyles),
        fontName: undefined,
        fontSize: 12,
        padding: createBoxDimension(1),
        borderWidth: createBoxDimension(0),
      },
    });
    const template: Template = {
      basePdf: { width: 210, height: 160, padding: [10, 10, 10, 10] },
      schemas: [[schema]],
    };
    const input = { notes: JSON.stringify(body) };
    const dynamicTemplate = await layoutTemplate(template, input);
    const pdf = await generatePages(template, input);

    expect(pdf.getPageCount()).toBe(dynamicTemplate.schemas.length);
    expect(dynamicTemplate.schemas[0].find((item) => item.name === 'notes')?.position.y).toBe(10);
  });

  test('skips a truncated PNG without failing generate', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const body = [['Row', truncatedPng()]];
    const schema = imageTableSchema({
      content: JSON.stringify(body),
      position: { x: 15, y: 15 },
    });
    const template: Template = {
      basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
      schemas: [[schema]],
    };
    const pdf = await generatePages(template, { items: JSON.stringify(body) });

    expect(pdf.getPageCount()).toBe(1);
    const messages = warn.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes('unsupported image'));
    expect(messages).toEqual([
      '[@pdfme/schemas/table] unsupported image in column 1; only PNG/JPEG data URL is supported',
    ]);
  });
});
