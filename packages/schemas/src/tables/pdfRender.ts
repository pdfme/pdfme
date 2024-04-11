import type { TableSchema } from './types';
import type { PDFRenderProps } from '@pdfme/common';
import { Cell, Table, Row, Column } from './classes';
import { rectangle } from '../shapes/rectAndEllipse';
import cell from './cell';
import { getBodyWithRange } from './helper';
import { createSingleTable } from './tableHelper';

type Pos = { x: number; y: number };

const rectanglePdfRender = rectangle.pdf;
const cellPdfRender = cell.pdf;

async function drawCell(arg: PDFRenderProps<TableSchema>, cell: Cell) {
  await cellPdfRender({
    ...arg,
    value: cell.raw,
    schema: {
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
  columns: Column[]
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
  cursor: Pos
) {
  const lineWidth = table.settings.tableLineWidth;
  const lineColor = table.settings.tableLineColor;
  if (!lineWidth || !lineColor) return;
  await rectanglePdfRender({
    ...arg,
    schema: {
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
  const { value, schema } = arg;
  const body = getBodyWithRange(value, schema.__bodyRange);
  const table = await createSingleTable(body, arg);
  await drawTable(arg, table);
};
