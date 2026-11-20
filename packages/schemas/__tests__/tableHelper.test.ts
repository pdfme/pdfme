import { getDefaultFont } from '@pdfme/common';
import type { Schema } from '@pdfme/common';
import { describe, expect, test } from 'vitest';
import { remapColumnStylesOnRemove, remapRowStylesOnRemove } from '../src/tables/helper.js';
import { createSingleTable } from '../src/tables/tableHelper.js';
import { createTableBodySplitRange } from '../src/splitRange.js';
import type { TableSchema } from '../src/tables/types.js';

const basePdf = {
  width: 210,
  height: 297,
  padding: [10, 10, 10, 10] as [number, number, number, number],
};

const spacingSide = (value: unknown, side: 'top' | 'right' | 'bottom' | 'left'): unknown => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    return (value as Record<string, unknown>)[side];
  }
  return value;
};

const expectUniformSpacing = (value: unknown, expected: number) => {
  expect(value).not.toBeUndefined();
  expect(value).not.toBeNull();
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    expect(spacingSide(value, side)).toBe(expected);
  }
};

const expectFiniteGeometry = (table: Awaited<ReturnType<typeof createSingleTable>>) => {
  expect(Number.isFinite(table.getHeight())).toBe(true);
  expect(Number.isFinite(table.getWidth())).toBe(true);
  for (const row of table.allRows()) {
    expect(Number.isFinite(row.height)).toBe(true);
    for (const column of table.columns) {
      const cell = row.cells[column.index];
      if (!cell) continue;
      expect(Number.isFinite(cell.width)).toBe(true);
      expect(Number.isFinite(cell.height)).toBe(true);
      expect(Number.isFinite(cell.padding('top'))).toBe(true);
      expect(Number.isFinite(cell.padding('right'))).toBe(true);
      expect(Number.isFinite(cell.padding('bottom'))).toBe(true);
      expect(Number.isFinite(cell.padding('left'))).toBe(true);
    }
  }
};

const getPartialTableSchema = (): TableSchema =>
  ({
    name: 'items',
    type: 'table',
    position: { x: 10, y: 10 },
    width: 150,
    height: 20,
    content: '[]',
    showHead: true,
    head: ['Name', 'Qty'],
    headWidthPercentages: [70, 30],
    tableStyles: {
      borderColor: '#000000',
      borderWidth: 0.3,
    },
    // Programmatic / migrated schemas often omit optional style fields.
    // Designer always fills padding / borderWidth; this path does not.
    headStyles: {
      fontSize: 10,
      alignment: 'center',
      backgroundColor: '#2980ba',
      fontColor: '#ffffff',
    },
    bodyStyles: {
      fontSize: 10,
      alignment: 'left',
      backgroundColor: '',
      fontColor: '#000000',
      alternateBackgroundColor: '#f5f5f5',
    },
    columnStyles: {},
  }) as TableSchema;

const createTable = (schema: TableSchema, body: string[][] = [['Alice', '1']]) =>
  createSingleTable(body, {
    schema: schema as Schema,
    basePdf,
    options: { font: getDefaultFont() },
    _cache: new Map(),
  });

describe('createSingleTable style merge', () => {
  test('omitted head/body padding and borderWidth fall through to defaults', async () => {
    const table = await createTable(getPartialTableSchema());

    const headCell = table.head[0].cells[0];
    const bodyCell = table.body[0].cells[0];

    expect(headCell).toBeDefined();
    expect(bodyCell).toBeDefined();

    expectUniformSpacing(headCell.styles.cellPadding, 5);
    expectUniformSpacing(bodyCell.styles.cellPadding, 5);
    expectUniformSpacing(headCell.styles.lineWidth, 0);
    expectUniformSpacing(bodyCell.styles.lineWidth, 0);

    expect(headCell.styles.fontSize).toBe(10);
    expect(headCell.styles.alignment).toBe('center');
    expect(headCell.styles.backgroundColor).toBe('#2980ba');
    expect(headCell.styles.textColor).toBe('#ffffff');
    expect(bodyCell.styles.alignment).toBe('left');
    expect(bodyCell.styles.textColor).toBe('#000000');

    expectFiniteGeometry(table);
  });

  test('provided padding and borderWidth are still applied', async () => {
    const schema = getPartialTableSchema();
    schema.headStyles.padding = { top: 1, right: 2, bottom: 3, left: 4 };
    schema.headStyles.borderWidth = { top: 0.2, right: 0.3, bottom: 0.4, left: 0.5 };
    schema.bodyStyles.padding = { top: 6, right: 7, bottom: 8, left: 9 };
    schema.bodyStyles.borderWidth = { top: 0.6, right: 0.7, bottom: 0.8, left: 0.9 };

    const table = await createTable(schema);
    const headCell = table.head[0].cells[0];
    const bodyCell = table.body[0].cells[0];

    expect(headCell.styles.cellPadding).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(headCell.styles.lineWidth).toEqual({ top: 0.2, right: 0.3, bottom: 0.4, left: 0.5 });
    expect(bodyCell.styles.cellPadding).toEqual({ top: 6, right: 7, bottom: 8, left: 9 });
    expect(bodyCell.styles.lineWidth).toEqual({ top: 0.6, right: 0.7, bottom: 0.8, left: 0.9 });

    expectFiniteGeometry(table);
  });

  test('column verticalAlignment overrides head and body, and an unset column stays unchanged', async () => {
    const without = getPartialTableSchema();
    without.headStyles.verticalAlignment = 'bottom';
    without.bodyStyles.verticalAlignment = 'middle';

    const withColumn = getPartialTableSchema();
    withColumn.headStyles.verticalAlignment = 'bottom';
    withColumn.bodyStyles.verticalAlignment = 'middle';
    withColumn.columnStyles = { verticalAlignment: { 0: 'top' } };

    const base = await createTable(without);
    const styled = await createTable(withColumn);

    expect(base.head[0].cells[0].styles.verticalAlignment).toBe('bottom');
    expect(base.body[0].cells[0].styles.verticalAlignment).toBe('middle');
    expect(base.head[0].cells[1].styles.verticalAlignment).toBe('bottom');
    expect(base.body[0].cells[1].styles.verticalAlignment).toBe('middle');

    expect(styled.head[0].cells[0].styles.verticalAlignment).toBe('top');
    expect(styled.body[0].cells[0].styles.verticalAlignment).toBe('top');
    expect(styled.head[0].cells[1].styles.verticalAlignment).toBe(
      base.head[0].cells[1].styles.verticalAlignment,
    );
    expect(styled.body[0].cells[1].styles.verticalAlignment).toBe(
      base.body[0].cells[1].styles.verticalAlignment,
    );
  });
});

describe('createSingleTable rowStyles', () => {
  const body = [
    ['Alice', '1'],
    ['Bob', '2'],
    ['Carol', '3'],
    ['Dave', '4'],
  ];

  test('styles only the rows it names, over body, alternate and column styles', async () => {
    const schema = getPartialTableSchema();
    schema.bodyStyles.fontName = 'Body';
    schema.columnStyles = { alignment: { 1: 'right' } };
    schema.rowStyles = {
      0: { backgroundColor: '#ffeeee' },
      2: { fontColor: '#d00000', fontName: 'Bold', alignment: 'center' },
    };

    const table = await createTable(schema, body);
    const [row0, row1, row2, row3] = table.body;

    // Row 0 is an alternate row, but its own background wins.
    expect(row0.cells[0].styles.backgroundColor).toBe('#ffeeee');
    // Row 2's colour, font and alignment apply to every cell, over the column's alignment.
    for (const cell of Object.values(row2.cells)) {
      expect(cell.styles.textColor).toBe('#d00000');
      expect(cell.styles.fontName).toBe('Bold');
      expect(cell.styles.alignment).toBe('center');
    }
    // Rows without an entry are untouched.
    for (const row of [row1, row3]) {
      expect(row.cells[0].styles.textColor).toBe('#000000');
      expect(row.cells[0].styles.fontName).toBe('Body');
      expect(row.cells[1].styles.alignment).toBe('right');
    }
    expect(table.head[0].cells[0].styles.textColor).toBe('#ffffff');
    expectFiniteGeometry(table);
  });

  test('keeps each style on its row when the table is split across pages', async () => {
    const schema = getPartialTableSchema();
    schema.rowStyles = { 1: { fontColor: '#0000ff' }, 3: { fontColor: '#d00000' } };
    // The second page of a split table: rows 2 and 3 of the whole table.
    const segment = { ...schema, __splitRange: createTableBodySplitRange(2, 4) } as TableSchema;

    const table = await createTable(segment, body.slice(2, 4));

    expect(table.body[0].cells[0].styles.textColor).toBe('#000000');
    expect(table.body[1].cells[0].styles.textColor).toBe('#d00000');
  });

  test('a larger font in a row style makes that row taller', async () => {
    const schema = getPartialTableSchema();
    const plain = await createTable(schema, body);
    schema.rowStyles = { 1: { fontSize: 20 } };
    const styled = await createTable(schema, body);

    expect(styled.body[1].height).toBeGreaterThan(plain.body[1].height);
    expect(styled.body[0].height).toBe(plain.body[0].height);
  });
});

type ColumnStylesWithExtras = TableSchema['columnStyles'] & Record<string, unknown>;

const asColumnStyles = (value: Record<string, unknown>): ColumnStylesWithExtras =>
  value as ColumnStylesWithExtras;

describe('remapColumnStylesOnRemove', () => {
  test('moves alignment from column 2 to column 1 when the first column is removed', () => {
    const columnStyles = asColumnStyles({
      alignment: { 0: 'left', 1: 'center', 2: 'right' },
    });

    expect(remapColumnStylesOnRemove(columnStyles, 0)).toEqual({
      alignment: { 0: 'center', 1: 'right' },
    });
  });

  test('keeps a trailing alignment on the same column after the first column is removed', () => {
    const columnStyles = asColumnStyles({ alignment: { 2: 'right' } });

    expect(remapColumnStylesOnRemove(columnStyles, 0)).toEqual({
      alignment: { 1: 'right' },
    });
  });

  test('closes the gap when a middle column is removed', () => {
    const columnStyles = asColumnStyles({
      alignment: { 0: 'left', 1: 'center', 2: 'right' },
    });

    expect(remapColumnStylesOnRemove(columnStyles, 1)).toEqual({
      alignment: { 0: 'left', 1: 'right' },
    });
  });

  test('drops the last column style and leaves earlier indexes in place', () => {
    const columnStyles = asColumnStyles({
      alignment: { 0: 'left', 1: 'center', 2: 'right' },
    });

    expect(remapColumnStylesOnRemove(columnStyles, 2)).toEqual({
      alignment: { 0: 'left', 1: 'center' },
    });
  });

  test('shifts sparse maps across a missing index', () => {
    const columnStyles = asColumnStyles({
      alignment: { 0: 'left', 3: 'right' },
    });

    expect(remapColumnStylesOnRemove(columnStyles, 1)).toEqual({
      alignment: { 0: 'left', 2: 'right' },
    });
    expect(remapColumnStylesOnRemove(columnStyles, 0)).toEqual({
      alignment: { 2: 'right' },
    });
    expect(remapColumnStylesOnRemove(columnStyles, 3)).toEqual({
      alignment: { 0: 'left' },
    });
    expect(remapColumnStylesOnRemove(columnStyles, 5)).toEqual({
      alignment: { 0: 'left', 3: 'right' },
    });
  });

  test('remaps unknown column style keys with the same index rule', () => {
    const columnStyles = asColumnStyles({
      alignment: { 2: 'right' },
      verticalAlignment: { 0: 'top', 2: 'bottom' },
      fontName: { 0: 'Roboto', 2: 'Noto Sans' },
      cellType: { 1: 'image', 2: 'text' },
      imageHeightMode: { 1: 'fixed' },
      imageHeight: { 1: 12, 2: 0 },
    });

    expect(remapColumnStylesOnRemove(columnStyles, 0)).toEqual({
      alignment: { 1: 'right' },
      verticalAlignment: { 1: 'bottom' },
      fontName: { 1: 'Noto Sans' },
      cellType: { 0: 'image', 1: 'text' },
      imageHeightMode: { 0: 'fixed' },
      imageHeight: { 0: 12, 1: 0 },
    });
  });

  test('preserves non-map values and does not mutate the input', () => {
    const meta = { label: 'not-a-column-map' };
    const tags = ['keep'];
    const mixed = { 0: 'left', label: 'stay' };
    const columnStyles = asColumnStyles({
      alignment: { 0: 'left', 2: 'right' },
      legacyFlag: true,
      note: 'keep',
      count: 3,
      empty: null,
      tags,
      meta,
      mixed,
    });
    Object.freeze(columnStyles.alignment);
    Object.freeze(columnStyles);

    const result = asColumnStyles(remapColumnStylesOnRemove(columnStyles, 0));

    expect(result).toEqual({
      alignment: { 1: 'right' },
      legacyFlag: true,
      note: 'keep',
      count: 3,
      empty: null,
      tags,
      meta,
      mixed,
    });
    expect(result).not.toBe(columnStyles);
    expect(result.alignment).not.toBe(columnStyles.alignment);
    expect(result.meta).toBe(meta);
    expect(result.tags).toBe(tags);
    expect(result.mixed).toBe(mixed);
    expect(columnStyles).toEqual({
      alignment: { 0: 'left', 2: 'right' },
      legacyFlag: true,
      note: 'keep',
      count: 3,
      empty: null,
      tags,
      meta,
      mixed,
    });
  });

  test('treats missing columnStyles as an empty object', () => {
    expect(remapColumnStylesOnRemove(undefined, 0)).toEqual({});
    expect(remapColumnStylesOnRemove(null, 1)).toEqual({});
  });
});

describe('remapRowStylesOnRemove', () => {
  const red = { fontColor: '#d00000' };
  const blue = { fontColor: '#0000ff' };
  const bold = { fontName: 'Bold' };

  test("drops the removed row's style and moves later styles up by one", () => {
    expect(remapRowStylesOnRemove({ 0: red, 2: blue, 5: bold }, 2)).toEqual({ 0: red, 4: bold });
  });

  test('moves every later style when a row without a style is removed', () => {
    // Rows A, B, C with B red: removing A keeps the red on B, now row 0.
    expect(remapRowStylesOnRemove({ 1: red }, 0)).toEqual({ 0: red });
  });

  test('leaves styles before the removed row where they are', () => {
    expect(remapRowStylesOnRemove({ 0: red, 1: blue }, 3)).toEqual({ 0: red, 1: blue });
  });

  test('does not change the input', () => {
    const rowStyles = { 1: red, 2: blue };
    remapRowStylesOnRemove(rowStyles, 1);
    expect(rowStyles).toEqual({ 1: red, 2: blue });
  });

  test('treats missing rowStyles as an empty object', () => {
    expect(remapRowStylesOnRemove(undefined, 0)).toEqual({});
    expect(remapRowStylesOnRemove(null, 1)).toEqual({});
  });
});
