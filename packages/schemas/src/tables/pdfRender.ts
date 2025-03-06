import type { TableSchema } from './types.js';
import type { PDFRenderProps, Schema, BasePdf, CommonOptions } from '@pdfme/common';
import { Cell, Table, Row, Column } from './classes.js';
import { rectangle } from '../shapes/rectAndEllipse.js';
import cell from './cell.js';
import { getBodyWithRange } from './helper.js';
import { createSingleTable } from './tableHelper.js';

// Define the CreateTableArgs interface locally since it's not exported from tableHelper.js
interface CreateTableArgs {
  schema: Schema;
  basePdf: BasePdf;
  options: CommonOptions;
  _cache: Map<string | number, unknown>;
}

type Pos = { x: number; y: number };

const rectanglePdfRender = rectangle.pdf;
const cellPdfRender = cell.pdf;

async function drawCell(arg: PDFRenderProps<TableSchema>, cell: Cell) {
  await cellPdfRender({
    ...arg,
    value: cell.raw,
    schema: {
      name: '',
      type: 'cell',
      position: { x: cell.x, y: cell.y },
      width: cell.width,
      height: cell.height,
      fontName: cell.styles.fontName,
      alignment: cell.styles.alignment,
      verticalAlignment: cell.styles.verticalAlignment,
      fontSize: cell.styles.fontSize,
      lineHeight: cell.styles.lineHeight,
      characterSpacing: cell.styles.characterSpacing,
      backgroundColor: cell.styles.backgroundColor,
      fontColor: cell.styles.textColor,
      borderColor: cell.styles.lineColor,
      borderWidth: cell.styles.lineWidth,
      padding: cell.styles.cellPadding,
    },
  });
}

async function drawRow(
  arg: PDFRenderProps<TableSchema>,
  table: Table,
  row: Row,
  cursor: Pos,
  columns: Column[],
) {
  cursor.x = table.settings.margin.left;
  for (const column of columns) {
    const cell = row.cells[column.index];
    if (!cell) {
      cursor.x += column.width;
      continue;
    }

    cell.x = cursor.x;
    cell.y = cursor.y;

    await drawCell(arg, cell);

    cursor.x += column.width;
  }
  cursor.y += row.height;
}

async function drawTableBorder(
  arg: PDFRenderProps<TableSchema>,
  table: Table,
  startPos: Pos,
  cursor: Pos,
) {
  const lineWidth = table.settings.tableLineWidth;
  const lineColor = table.settings.tableLineColor;
  if (!lineWidth || !lineColor) return;
  await rectanglePdfRender({
    ...arg,
    schema: {
      name: '',
      type: 'rectangle',
      borderWidth: lineWidth,
      borderColor: lineColor,
      color: '',
      position: { x: startPos.x, y: startPos.y },
      width: table.getWidth(),
      height: cursor.y - startPos.y,
      readOnly: true,
    },
  });
}

async function drawTable(arg: PDFRenderProps<TableSchema>, table: Table): Promise<void> {
  const settings = table.settings;
  const startY = settings.startY;
  const margin = settings.margin;
  const cursor = { x: margin.left, y: startY };

  const startPos = Object.assign({}, cursor);

  if (settings.showHead) {
    for (const row of table.head) {
      await drawRow(arg, table, row, cursor, table.columns);
    }
  }

  for (const row of table.body) {
    await drawRow(arg, table, row, cursor, table.columns);
  }

  await drawTableBorder(arg, table, startPos, cursor);
}

export const pdfRender = async (arg: PDFRenderProps<TableSchema>) => {
  const { value, schema, basePdf, options, _cache } = arg;

  const body = getBodyWithRange(
    typeof value !== 'string' ? JSON.stringify(value || '[]') : value,
    schema.__bodyRange,
  );

  // Create a properly typed CreateTableArgs object
  const createTableArgs: CreateTableArgs = {
    schema,
    basePdf,
    options,
    _cache,
  };

  // Ensure body is properly typed before passing to createSingleTable
  // Ensure body is properly typed as string[][] before passing to createSingleTable
  const typedBody: string[][] = Array.isArray(body)
    ? body.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell)) : []))
    : [];
  const table = await createSingleTable(typedBody, createTableArgs);

  // Use the original arg directly since drawTable expects PDFRenderProps<TableSchema>
  // which is the same type as our arg parameter
  await drawTable(arg, table);
};
