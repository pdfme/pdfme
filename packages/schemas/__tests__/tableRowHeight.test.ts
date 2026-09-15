import { DEFAULT_FONT_NAME, getDefaultFont, mm2pt, pt2mm, type Schema } from '@pdfme/common';
import { describe, expect, test } from 'vitest';
import { createBoxDimension, getBoxContentArea, getBoxVerticalInset } from '../src/box.js';
import { Cell } from '../src/tables/classes.js';
import { createSingleTable } from '../src/tables/tableHelper.js';
import type { CellStyle, Styles, TableSchema } from '../src/tables/types.js';
import { getFontKitFont, splitTextToSize } from '../src/text/helper.js';

const FONT = getDefaultFont();
const FONT_NAME = DEFAULT_FONT_NAME;
const FONT_SIZE = 20;
const LINE_HEIGHT = 1;
const TABLE_WIDTH = 50;
const ISSUE_BODY = [['ABCDEFGHIJKLMNO'], ['SECOND ROW']];
const BASE_PDF = {
  width: 210,
  height: 297,
  padding: [10, 10, 10, 10] as [number, number, number, number],
};
const HEIGHT_EPSILON_MM = 0.05;

const createCellStyle = (overrides: Partial<CellStyle> = {}): CellStyle => ({
  fontName: FONT_NAME,
  alignment: 'left',
  verticalAlignment: 'top',
  fontSize: FONT_SIZE,
  lineHeight: LINE_HEIGHT,
  characterSpacing: 0,
  fontColor: '#000000',
  backgroundColor: '#ffffff',
  borderColor: '#000000',
  borderWidth: createBoxDimension(0),
  padding: createBoxDimension(0),
  ...overrides,
});

const createIssueTableSchema = (
  overrides: Partial<TableSchema> = {},
  bodyStyles: Partial<CellStyle> = {},
): TableSchema =>
  ({
    name: 'items',
    type: 'table',
    position: { x: 10, y: 10 },
    width: TABLE_WIDTH,
    height: 20,
    content: JSON.stringify(ISSUE_BODY),
    showHead: false,
    head: [''],
    headWidthPercentages: [100],
    tableStyles: { borderColor: '#000000', borderWidth: 0 },
    headStyles: createCellStyle(),
    bodyStyles: {
      ...createCellStyle({
        padding: { top: 0, right: 10, bottom: 0, left: 10 },
        backgroundColor: '#ff6666',
        alternateBackgroundColor: '#eeeeee',
        ...bodyStyles,
      }),
    },
    columnStyles: {},
    ...overrides,
  }) as TableSchema;

const createTable = (schema: TableSchema, body: string[][] = ISSUE_BODY) =>
  createSingleTable(body, {
    schema: schema as Schema,
    basePdf: BASE_PDF,
    options: { font: FONT },
    _cache: new Map(),
  });

const measureRendererLayout = async (cell: Cell) => {
  const contentArea = getBoxContentArea({
    position: { x: 0, y: 0 },
    width: cell.width,
    height: cell.height,
    padding: cell.styles.cellPadding,
    borderWidth: cell.styles.lineWidth,
  });
  const fontKitFont = await getFontKitFont(cell.styles.fontName, FONT, new Map());
  const lines = splitTextToSize({
    value: cell.raw,
    characterSpacing: cell.styles.characterSpacing,
    boxWidthInPt: mm2pt(contentArea.width),
    fontSize: cell.styles.fontSize,
    fontKitFont,
  });
  const lineHeightMm = pt2mm(cell.styles.fontSize) * cell.styles.lineHeight;
  const requiredHeight =
    lines.length * lineHeightMm +
    getBoxVerticalInset({
      padding: cell.styles.cellPadding,
      borderWidth: cell.styles.lineWidth,
    });
  return { contentArea, lines, lineHeightMm, requiredHeight };
};

const expectRowHeightsFitRenderer = async (
  table: Awaited<ReturnType<typeof createTable>>,
  options: { allowZeroContentWidth?: boolean } = {},
) => {
  expect(Number.isFinite(table.getHeight())).toBe(true);
  for (const row of table.allRows()) {
    expect(Number.isFinite(row.height)).toBe(true);
    for (const column of table.columns) {
      const cell = row.cells[column.index];
      if (!cell) continue;
      const { contentArea, lines, requiredHeight } = await measureRendererLayout(cell);
      if (!options.allowZeroContentWidth) {
        expect(contentArea.width).toBeGreaterThan(0);
      } else {
        expect(contentArea.width).toBeGreaterThanOrEqual(0);
      }
      expect(lines.length).toBeGreaterThan(0);
      expect(cell.height + HEIGHT_EPSILON_MM).toBeGreaterThanOrEqual(requiredHeight);
      expect(row.height + HEIGHT_EPSILON_MM).toBeGreaterThanOrEqual(requiredHeight);
    }
  }
};

describe('table row height vs renderer wrap (#1579)', () => {
  test.each([
    {
      name: 'padding only',
      borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    {
      name: 'padding plus 3mm horizontal borders',
      borderWidth: { top: 0, right: 3, bottom: 0, left: 3 },
    },
  ])('keeps $name content inside the allocated row', async ({ borderWidth }) => {
    const table = await createTable(createIssueTableSchema({}, { borderWidth }));
    const firstCell = table.body[0].cells[0];
    const { lines, requiredHeight } = await measureRendererLayout(firstCell);

    expect(firstCell.raw).toBe('ABCDEFGHIJKLMNO');
    expect(lines.length).toBeGreaterThan(1);
    expect(firstCell.height).toBeGreaterThan(table.body[1].height);
    expect(firstCell.height + HEIGHT_EPSILON_MM).toBeGreaterThanOrEqual(requiredHeight);
    await expectRowHeightsFitRenderer(table);
  });

  test('keeps rows tall enough when only vertical borders are set', async () => {
    const table = await createTable(
      createIssueTableSchema(
        {},
        {
          padding: createBoxDimension(0),
          borderWidth: { top: 5, right: 0, bottom: 5, left: 0 },
        },
      ),
      [['OK'], ['SECOND ROW']],
    );
    const firstCell = table.body[0].cells[0];
    const { lines, requiredHeight } = await measureRendererLayout(firstCell);

    expect(lines).toHaveLength(1);
    expect(requiredHeight).toBeGreaterThan(pt2mm(FONT_SIZE));
    expect(firstCell.height + HEIGHT_EPSILON_MM).toBeGreaterThanOrEqual(requiredHeight);
    await expectRowHeightsFitRenderer(table);
  });

  test.each([
    {
      name: 'asymmetric padding and borders',
      padding: { top: 1, right: 8, bottom: 4, left: 2 },
      borderWidth: { top: 2, right: 1, bottom: 3, left: 4 },
    },
    {
      name: 'borders only',
      padding: createBoxDimension(0),
      borderWidth: { top: 1, right: 3, bottom: 1, left: 3 },
    },
    {
      name: 'both zero',
      padding: createBoxDimension(0),
      borderWidth: createBoxDimension(0),
    },
    {
      name: 'explicit newlines',
      padding: { top: 1, right: 10, bottom: 1, left: 10 },
      borderWidth: { top: 1, right: 2, bottom: 1, left: 2 },
      body: [['ABC\nDEFGHIJKLMNO'], ['SECOND ROW']],
    },
    {
      name: 'multiple columns',
      padding: { top: 0, right: 4, bottom: 0, left: 4 },
      borderWidth: { top: 1, right: 1, bottom: 1, left: 1 },
      schema: {
        width: 100,
        head: ['A', 'B'],
        headWidthPercentages: [50, 50],
        showHead: true,
      },
      body: [
        ['ABCDEFGHIJKLMNO', 'SECOND COL WRAP'],
        ['SECOND ROW', 'OK'],
      ],
    },
    {
      name: 'Japanese wrapping',
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
      borderWidth: { top: 0, right: 2, bottom: 0, left: 2 },
      body: [['あいうえおかきくけこさしすせそ'], ['次の行']],
    },
  ])('fits renderer wrap for $name', async ({ padding, borderWidth, schema, body }) => {
    const table = await createTable(
      createIssueTableSchema(schema, { padding, borderWidth }),
      body ?? ISSUE_BODY,
    );
    await expectRowHeightsFitRenderer(table);
  });

  test('does not loop or throw when padding and borders consume the cell width', async () => {
    const table = await createTable(
      createIssueTableSchema(
        {},
        {
          padding: { top: 0, right: 20, bottom: 0, left: 20 },
          borderWidth: { top: 0, right: 10, bottom: 0, left: 10 },
        },
      ),
    );
    const firstCell = table.body[0].cells[0];
    const { contentArea, lines } = await measureRendererLayout(firstCell);

    expect(contentArea.width).toBe(0);
    expect(lines.length).toBeGreaterThan(0);
    expect(Number.isFinite(firstCell.height)).toBe(true);
    await expectRowHeightsFitRenderer(table, { allowZeroContentWidth: true });
  });

  test('keeps minCellHeight as the outer minimum after adding insets', () => {
    const styles = {
      fontName: FONT_NAME,
      backgroundColor: '',
      textColor: '#000000',
      lineHeight: 1,
      characterSpacing: 0,
      alignment: 'left',
      verticalAlignment: 'top',
      fontSize: FONT_SIZE,
      cellPadding: createBoxDimension(0),
      lineColor: '#000000',
      lineWidth: { top: 5, right: 0, bottom: 5, left: 0 },
      cellWidth: 50,
      minCellHeight: 30,
      minCellWidth: 0,
    } as Styles;
    const shortCell = new Cell('A', styles, 'body');
    const tallCell = new Cell('A', { ...styles, minCellHeight: 10 }, 'body');

    expect(shortCell.getContentHeight()).toBe(30);
    expect(tallCell.getContentHeight()).toBeGreaterThan(10);
    expect(tallCell.getContentHeight()).toBeCloseTo(
      pt2mm(FONT_SIZE) +
        getBoxVerticalInset({
          padding: tallCell.styles.cellPadding,
          borderWidth: tallCell.styles.lineWidth,
        }),
    );
  });
});
