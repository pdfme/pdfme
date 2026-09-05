import { getDefaultFont } from '@pdfme/common';
import type { Schema } from '@pdfme/common';
import { describe, expect, test } from 'vitest';
import { createSingleTable } from '../src/tables/tableHelper.js';
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
});
