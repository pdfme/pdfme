import { DEFAULT_FONT_NAME, getDefaultFont, type BasePdf, type Schema } from '@pdfme/common';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBoxDimension } from '../src/box.js';
import * as imageHelper from '../src/graphics/imagehelper.js';
import { TABLE_IMAGE_AUTO_SAFETY_MARGIN } from '../src/tables/constants.js';
import { isTableImageDataUrl, resolveImageDimension } from '../src/tables/imageCell.js';
import { createSingleTable } from '../src/tables/tableHelper.js';
import type { CellStyle, TableSchema } from '../src/tables/types.js';
import {
  JPEG_EXIF_6,
  JPEG_EXIF_6_STORED_HEIGHT,
  JPEG_EXIF_6_STORED_WIDTH,
  TALL_1_3_PNG,
  WIDE_3_1_PNG,
} from './assets/tableImages.js';

const FONT = getDefaultFont();
const A4 = {
  width: 210,
  height: 297,
  padding: [15, 15, 15, 15] as [number, number, number, number],
};

const createCellStyle = (overrides: Partial<CellStyle> = {}): CellStyle => ({
  fontName: DEFAULT_FONT_NAME,
  alignment: 'left',
  verticalAlignment: 'top',
  fontSize: 10,
  lineHeight: 1,
  characterSpacing: 0,
  fontColor: '#000000',
  backgroundColor: '#ffffff',
  borderColor: '#000000',
  borderWidth: createBoxDimension(0),
  padding: createBoxDimension(0),
  ...overrides,
});

const createSchema = (
  overrides: Partial<TableSchema> = {},
  bodyStyles: Partial<CellStyle> = {},
): TableSchema =>
  ({
    name: 'items',
    type: 'table',
    position: { x: 15, y: 20 },
    width: 100,
    height: 20,
    content: '[]',
    showHead: false,
    head: [''],
    headWidthPercentages: [100],
    tableStyles: { borderColor: '#000000', borderWidth: 0 },
    headStyles: createCellStyle(),
    bodyStyles: { ...createCellStyle(), ...bodyStyles },
    columnStyles: {},
    ...overrides,
  }) as TableSchema;

const createTable = (schema: TableSchema, body: string[][], basePdf: BasePdf = A4) =>
  createSingleTable(body, {
    schema: schema as Schema,
    basePdf,
    options: { font: FONT },
    _cache: new Map(),
  });

const verticalInset = (style: CellStyle) =>
  (style.padding?.top ?? 0) +
  (style.padding?.bottom ?? 0) +
  (style.borderWidth?.top ?? 0) +
  (style.borderWidth?.bottom ?? 0);

const horizontalInset = (style: CellStyle) =>
  (style.padding?.left ?? 0) +
  (style.padding?.right ?? 0) +
  (style.borderWidth?.left ?? 0) +
  (style.borderWidth?.right ?? 0);

const contentWidth = (schema: TableSchema, style: CellStyle, columnIndex = 0) => {
  const columnWidth = schema.width * ((schema.headWidthPercentages[columnIndex] ?? 0) / 100);
  return columnWidth - horizontalInset(style);
};

describe('table image cells', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('uses 20mm when fixed imageHeight is omitted', async () => {
    const bodyStyles = createCellStyle({
      padding: { top: 2, right: 3, bottom: 4, left: 5 },
      borderWidth: { top: 0.2, right: 0.2, bottom: 0.3, left: 0.4 },
    });
    const schema = createSchema(
      { columnStyles: { cellType: { 0: 'image' } }, head: ['Photo'] },
      bodyStyles,
    );
    const withValue = await createTable(schema, [[WIDE_3_1_PNG]]);
    const withoutValue = await createTable(schema, [['']]);
    const expected = 20 + verticalInset(bodyStyles);

    expect(withValue.body[0].height).toBeCloseTo(expected, 5);
    expect(withoutValue.body[0].height).toBeCloseTo(expected, 5);
    expect(withValue.body[0].cells[0].imageContentHeight).toBe(20);
  });

  test('keeps a fixed imageHeight for empty and invalid cells', async () => {
    const bodyStyles = createCellStyle({
      padding: createBoxDimension(1.5),
      borderWidth: { top: 0.4, right: 0.1, bottom: 0.6, left: 0.1 },
    });
    const schema = createSchema(
      {
        columnStyles: { cellType: { 0: 'image' }, imageHeight: { 0: 12 } },
      },
      bodyStyles,
    );
    const table = await createTable(schema, [[WIDE_3_1_PNG], [''], ['not-an-image']]);
    const expected = 12 + verticalInset(bodyStyles);

    for (const row of table.body) {
      expect(row.height).toBeCloseTo(expected, 5);
      expect(row.cells[0].imageContentHeight).toBe(12);
    }
  });

  test('sizes auto images from their ratio and caps tall ones to the page', async () => {
    const bodyStyles = createCellStyle({
      padding: createBoxDimension(4),
      borderWidth: createBoxDimension(1),
    });
    const headStyles = createCellStyle({
      fontSize: 16,
      padding: createBoxDimension(2),
      borderWidth: createBoxDimension(0),
    });
    const schema = createSchema(
      {
        showHead: true,
        head: ['Photo'],
        headStyles,
        columnStyles: {
          cellType: { 0: 'image' },
          imageHeightMode: { 0: 'auto' },
        },
      },
      bodyStyles,
    );
    const table = await createTable(schema, [[WIDE_3_1_PNG], [TALL_1_3_PNG]]);
    const innerWidth = contentWidth(schema, bodyStyles);
    const inset = verticalInset(bodyStyles);
    const pageContentHeight = A4.height - A4.padding[0] - A4.padding[2];
    const tallLimit =
      pageContentHeight - table.getHeadHeight() - inset - TABLE_IMAGE_AUTO_SAFETY_MARGIN;

    expect(table.body[0].cells[0].imageContentHeight).toBeCloseTo(innerWidth / 3, 5);
    expect(table.body[0].height).toBeCloseTo(innerWidth / 3 + inset, 5);
    expect(innerWidth * 3).toBeGreaterThan(tallLimit);
    expect(table.body[1].cells[0].imageContentHeight).toBeCloseTo(tallLimit, 5);
    expect(table.body[1].height).toBeCloseTo(tallLimit + inset, 5);

    const withoutHead = await createTable(
      { ...schema, showHead: false },
      [[TALL_1_3_PNG]],
    );
    const limitWithoutHead = pageContentHeight - inset - TABLE_IMAGE_AUTO_SAFETY_MARGIN;
    expect(withoutHead.body[0].cells[0].imageContentHeight).toBeCloseTo(limitWithoutHead, 5);
    expect(limitWithoutHead).toBeGreaterThan(tallLimit);

    const customPdf = await createTable(schema, [[TALL_1_3_PNG]], 'data:application/pdf;base64,QQ==');
    expect(customPdf.body[0].cells[0].imageContentHeight).toBeCloseTo(innerWidth * 3, 5);
  });

  test('lets text decide the row height when an auto image is empty or invalid', async () => {
    const bodyStyles = createCellStyle({
      fontSize: 20,
      padding: createBoxDimension(1),
      borderWidth: createBoxDimension(0),
    });
    const schema = createSchema(
      {
        width: 120,
        head: ['Label', 'Photo'],
        headWidthPercentages: [50, 50],
        columnStyles: {
          cellType: { 1: 'image' },
          imageHeightMode: { 1: 'auto' },
        },
      },
      bodyStyles,
    );
    const table = await createTable(schema, [
      ['HELLO', ''],
      ['HELLO', 'https://example.com/a.png'],
    ]);

    for (const row of table.body) {
      expect(row.cells[1].isImage()).toBe(true);
      expect(row.cells[1].imageContentHeight).toBe(0);
      expect(row.cells[1].text).toEqual([]);
      expect(row.height).toBeCloseTo(row.cells[0].height, 5);
      expect(row.height).toBeGreaterThan(row.cells[1].getContentHeight());
    }
  });

  test('swaps width and height for a JPEG with EXIF orientation 6', async () => {
    const bodyStyles = createCellStyle({ padding: createBoxDimension(0) });
    const schema = createSchema(
      {
        width: 40,
        columnStyles: { cellType: { 0: 'image' }, imageHeightMode: { 0: 'auto' } },
      },
      bodyStyles,
    );
    const table = await createTable(schema, [[JPEG_EXIF_6]]);
    const innerWidth = contentWidth(schema, bodyStyles);
    const storedRatio = JPEG_EXIF_6_STORED_HEIGHT / JPEG_EXIF_6_STORED_WIDTH;
    const displayedRatio = JPEG_EXIF_6_STORED_WIDTH / JPEG_EXIF_6_STORED_HEIGHT;

    expect(table.body[0].cells[0].imageContentHeight).toBeCloseTo(innerWidth * displayedRatio, 5);
    expect(table.body[0].cells[0].imageContentHeight).not.toBeCloseTo(innerWidth * storedRatio, 1);
  });

  test('measures a head cell as text even when the column is an image', async () => {
    const bodyStyles = createCellStyle({
      fontSize: 18,
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
    });
    const head = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
    const imageSchema = createSchema(
      {
        showHead: true,
        width: 40,
        head,
        headStyles: bodyStyles,
        columnStyles: { cellType: { 0: 'image' }, imageHeight: { 0: 12 } },
      },
      bodyStyles,
    );
    const textSchema = createSchema(
      {
        showHead: true,
        width: 40,
        head,
        headStyles: bodyStyles,
        columnStyles: { cellType: { 0: 'text' } },
      },
      bodyStyles,
    );
    const imageTable = await createTable(imageSchema, [[WIDE_3_1_PNG]]);
    const textTable = await createTable(textSchema, [['x']]);
    const headCell = imageTable.head[0].cells[0];

    expect(headCell.isImage()).toBe(false);
    expect(imageTable.body[0].cells[0].isImage()).toBe(true);
    expect(headCell.text.length).toBeGreaterThan(1);
    expect(headCell.text).toEqual(textTable.head[0].cells[0].text);
    expect(imageTable.head[0].height).toBeCloseTo(textTable.head[0].height, 5);
    expect(imageTable.body[0].cells[0].text).toEqual([]);
  });

  test('does not let an image data URL increase minReadableWidth', async () => {
    const bodyStyles = createCellStyle({
      padding: { top: 1, right: 6, bottom: 1, left: 4 },
    });
    const imageSchema = createSchema(
      { columnStyles: { cellType: { 0: 'image' } }, head: [''] },
      bodyStyles,
    );
    const textSchema = createSchema({ head: [''] }, bodyStyles);
    const imageTable = await createTable(imageSchema, [[WIDE_3_1_PNG]]);
    const textTable = await createTable(textSchema, [[WIDE_3_1_PNG]]);
    const padding = bodyStyles.padding.left + bodyStyles.padding.right;

    expect(imageTable.columns[0].minReadableWidth).toBeCloseTo(padding, 5);
    expect(imageTable.body[0].cells[0].contentWidth).toBeCloseTo(padding, 5);
    expect(textTable.columns[0].minReadableWidth).toBeGreaterThan(padding + 10);
  });

  test('reads dimensions once when the same data URL is repeated', async () => {
    const spy = vi.spyOn(imageHelper, 'getImageDimension');
    const schema = createSchema({
      columnStyles: { cellType: { 0: 'image' }, imageHeightMode: { 0: 'auto' } },
    });
    const cache = new Map<string | number, unknown>();
    await createSingleTable(
      Array.from({ length: 10 }, () => [WIDE_3_1_PNG]),
      {
        schema: schema as Schema,
        basePdf: A4,
        options: { font: FONT },
        _cache: cache,
      },
    );

    expect(spy).toHaveBeenCalledTimes(1);

    await createSingleTable([[TALL_1_3_PNG]], {
      schema: schema as Schema,
      basePdf: A4,
      options: { font: FONT },
      _cache: cache,
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('caches a failed dimension read and does not decode it again', () => {
    const spy = vi.spyOn(imageHelper, 'getImageDimension');
    const cache = new Map<string | number, unknown>();
    const broken = 'data:image/png;base64,aaaa';

    expect(resolveImageDimension(broken, cache)).toBeUndefined();
    expect(resolveImageDimension(broken, cache)).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('warns once per invalid image value and stays quiet for empty values', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const schema = createSchema({
      width: 120,
      head: ['Label', 'Photo'],
      headWidthPercentages: [40, 60],
      columnStyles: { cellType: { 1: 'image' } },
    });
    const invalid = 'https://example.com/photo.png';
    await createTable(schema, [
      ['a', invalid],
      ['b', invalid],
      ['c', ''],
      ['d', 'data:image/gif;base64,aaaa'],
      ['e', 'data:image/gif;base64,aaaa'],
    ]);

    const messages = warn.mock.calls.map((call) => String(call[0]));
    const unsupported = messages.filter((message) => message.includes('unsupported image'));
    expect(unsupported).toEqual([
      '[@pdfme/schemas/table] unsupported image in column 1; only PNG/JPEG data URL is supported',
      '[@pdfme/schemas/table] unsupported image in column 1; only PNG/JPEG data URL is supported',
    ]);
  });

  test.each([
    ['data:image/png;base64,aaaa', true],
    ['data:image/jpeg;base64,aaaa', true],
    ['data:image/jpg;base64,aaaa', true],
    ['DATA:IMAGE/PNG;BASE64,AAAA', true],
    ['data:image/gif;base64,aaaa', false],
    ['data:image/webp;base64,aaaa', false],
    ['data:image/svg+xml;base64,aaaa', false],
    ['http://example.com/a.png', false],
    ['https://example.com/a.jpg', false],
  ])('isTableImageDataUrl(%s) is %s', (value, expected) => {
    expect(isTableImageDataUrl(value)).toBe(expected);
  });

  test('treats an unknown cell type as text and warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const schema = createSchema({
      width: 40,
      showHead: false,
      columnStyles: {
        cellType: { 0: 'qrcode', 1: 'qrcode' },
      } as TableSchema['columnStyles'],
      head: ['A', 'B'],
      headWidthPercentages: [50, 50],
    });
    const table = await createTable(schema, [['ABCDEFGHIJKLMNO', 'QR']]);

    expect(table.body[0].cells[0].isImage()).toBe(false);
    expect(table.body[0].cells[0].text.length).toBeGreaterThan(1);
    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(messages.filter((message) => message.includes('unsupported cell type'))).toEqual([
      '[@pdfme/schemas/table] unsupported cell type "qrcode" in column 0; treating as text',
    ]);
  });

  test('treats a null cell type as text and does not warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const schema = createSchema({
      showHead: false,
      columnStyles: { cellType: { 0: null } } as unknown as TableSchema['columnStyles'],
    });
    const table = await createTable(schema, [['City']]);

    expect(table.body[0].cells[0].isImage()).toBe(false);
    expect(table.body[0].cells[0].text.join('')).toContain('City');
    expect(warn.mock.calls.map((call) => String(call[0]))).toEqual([]);
  });
});
