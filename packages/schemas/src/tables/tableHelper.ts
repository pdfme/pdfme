import type { Font as FontKitFont } from 'fontkit';
import { rectangle } from '../shapes/rectAndEllipse';
import { splitTextToSize, getFontKitFont, widthOfTextAtSize } from '../text/helper';
import {
  Schema,
  CommonOptions,
  PDFRenderProps,
  getDefaultFont,
  mm2pt,
  getFallbackFontName,
  pt2mm,
} from '@pdfme/common';
import type { TableSchema, CellStyle } from './types';
import cell from './cell';

const rectanglePdfRender = rectangle.pdf;
const cellPdfRender = cell.pdf;

export const parseSpacing = (value: MarginPaddingInput | undefined): MarginPadding => {
  const defaultValue = 0;
  value = value || defaultValue;
  if (Array.isArray(value)) {
    if (value.length >= 4) {
      return {
        top: value[0],
        right: value[1],
        bottom: value[2],
        left: value[3],
      };
    } else if (value.length === 3) {
      return {
        top: value[0],
        right: value[1],
        bottom: value[2],
        left: value[1],
      };
    } else if (value.length === 2) {
      return {
        top: value[0],
        right: value[1],
        bottom: value[0],
        left: value[1],
      };
    } else if (value.length === 1) {
      value = value[0];
    } else {
      value = defaultValue;
    }
  }

  if (typeof value === 'object') {
    if (typeof value.vertical === 'number') {
      value.top = value.vertical;
      value.bottom = value.vertical;
    }
    if (typeof value.horizontal === 'number') {
      value.right = value.horizontal;
      value.left = value.horizontal;
    }
    return {
      left: value.left ?? defaultValue,
      top: value.top ?? defaultValue,
      right: value.right ?? defaultValue,
      bottom: value.bottom ?? defaultValue,
    };
  }

  if (typeof value !== 'number') {
    value = defaultValue;
  }

  return { top: value, right: value, bottom: value, left: value };
};

const drawCell = async (arg: PDFRenderProps<Schema>, cell: Cell) => {
  // TODO テーブルのボーダーを考慮できていない気がする
  // 本当はテーブルのボーダーの分を引いた位置に描画したい
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
      fontColor: cell.styles.textColor,
      backgroundColor: cell.styles.backgroundColor,
      borderColor: cell.styles.lineColor,
      borderWidth: {
        top:
          // TODO  Partial<LineWidths> top,bottom,left,rightに統一する
          // また、template.basePdfのpaddingも同様に統一する
          typeof cell.styles.lineWidth === 'number'
            ? cell.styles.lineWidth
            : cell.styles.lineWidth.top ?? 0,
        bottom:
          typeof cell.styles.lineWidth === 'number'
            ? cell.styles.lineWidth
            : cell.styles.lineWidth.bottom ?? 0,
        left:
          typeof cell.styles.lineWidth === 'number'
            ? cell.styles.lineWidth
            : cell.styles.lineWidth.left ?? 0,
        right:
          typeof cell.styles.lineWidth === 'number'
            ? cell.styles.lineWidth
            : cell.styles.lineWidth.right ?? 0,
      },
      padding: {
        top: cell.padding('top'),
        bottom: cell.padding('bottom'),
        left: cell.padding('left'),
        right: cell.padding('right'),
      },
    },
  });
};

const addTableBorder = async (
  arg: PDFRenderProps<TableSchema>,
  table: Table,
  startPos: Pos,
  cursor: Pos
) => {
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
};

type StyleProp = 'styles' | 'headStyles' | 'bodyStyles' | 'alternateRowStyles' | 'columnStyles';

type MarginPaddingInput =
  | number
  | number[]
  | {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
      horizontal?: number;
      vertical?: number;
    };
type PageBreakType = 'auto' | 'avoid' | 'always';

type RowPageBreakType = 'auto' | 'avoid';

type ShowHeadType = 'everyPage' | 'firstPage' | 'never' | boolean;
type Color = string;

type RowInput = { [key: string]: string } | string[];

type MarginPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type CellWidthType = 'auto' | 'wrap' | number;
type CellHook = (data: CellHookData) => void | boolean;

type ContentSettings = {
  body: Row[];
  head: Row[];
  columns: Column[];
};
type PageHook = (data: HookData) => void | boolean;
type Section = 'head' | 'body';
type Pos = { x: number; y: number };

type ColumnInput =
  | string
  | number
  | {
      header?: string;
      dataKey?: string | number;
    };

interface StylesProps {
  styles: Partial<Styles>;
  headStyles: Partial<Styles>;
  bodyStyles: Partial<Styles>;
  alternateRowStyles: Partial<Styles>;
  columnStyles: { [key: string]: Partial<Styles> };
}

export interface Styles {
  fontName: string | undefined;
  backgroundColor: Color;
  textColor: Color;
  lineHeight: number;
  characterSpacing: number;
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'middle' | 'bottom';
  fontSize: number;
  cellPadding: MarginPaddingInput;
  lineColor: Color;
  lineWidth: number | Partial<LineWidths>;
  cellWidth: CellWidthType;
  minCellHeight: number;
  minCellWidth: number;
}
interface LineWidths {
  bottom: number;
  top: number;
  left: number;
  right: number;
}

interface Settings {
  startY: number;
  margin: MarginPadding;
  pageBreak: 'auto' | 'avoid' | 'always';
  rowPageBreak: 'auto' | 'avoid';
  tableWidth: number;
  showHead: 'everyPage' | 'firstPage' | 'never';
  tableLineWidth: number;
  tableLineColor: Color;
}

interface StylesProps {
  styles: Partial<Styles>;
  headStyles: Partial<Styles>;
  bodyStyles: Partial<Styles>;
  alternateRowStyles: Partial<Styles>;
  columnStyles: { [key: string]: Partial<Styles> };
}

interface HookProps {
  didParseCell: CellHook[];
  willDrawCell: CellHook[];
  didDrawCell: CellHook[];
  willDrawPage: PageHook[];
  didDrawPage: PageHook[];
}

interface ContentInput {
  body: RowInput[];
  head: RowInput[];
  columns: ColumnInput[];
}

interface TableInput {
  settings: Settings;
  styles: StylesProps;
  hooks: HookProps;
  content: ContentInput;
}

interface UserOptions {
  startY: number;
  tableWidth: number;
  margin: MarginPaddingInput;
  pageBreak?: PageBreakType;
  rowPageBreak?: RowPageBreakType;
  showHead?: ShowHeadType;
  tableLineWidth?: number;
  tableLineColor?: Color;
  head?: RowInput[];
  body?: RowInput[];
  columns?: ColumnInput[];

  styles?: Partial<Styles>;
  bodyStyles?: Partial<Styles>;
  headStyles?: Partial<Styles>;
  alternateRowStyles?: Partial<Styles>;
  columnStyles?: {
    [key: string]: Partial<Styles>;
  };

  /** Called when the plugin finished parsing cell content. Can be used to override content or styles for a specific cell. */
  didParseCell?: CellHook;
  /** Called before a cell or row is drawn. Can be used to call native jspdf styling functions such as `doc.setTextColor` or change position of text etc before it is drawn. */
  willDrawCell?: CellHook;
  /** Called after a cell has been added to the page. Can be used to draw additional cell content such as images with `doc.addImage`, additional text with `doc.addText` or other jspdf shapes. */
  didDrawCell?: CellHook;
  /** Called before starting to draw on a page. Can be used to add headers or any other content that you want on each page there is an autotable. */
  willDrawPage?: PageHook;
  /** Called after the plugin has finished drawing everything on a page. Can be used to add footers with page numbers or any other content that you want on each page there is an autotable. */
  didDrawPage?: PageHook;
}

class Cell {
  raw: string;
  text: string[];
  styles: Styles;
  section: Section;
  contentHeight = 0;
  contentWidth = 0;
  wrappedWidth = 0;
  minReadableWidth = 0;
  minWidth = 0;

  width = 0;
  height = 0;
  x = 0;
  y = 0;

  constructor(raw: string, styles: Styles, section: Section) {
    this.styles = styles;
    this.section = section;
    this.raw = raw;
    const splitRegex = /\r\n|\r|\n/g;
    this.text = raw.split(splitRegex);
  }

  getContentHeight() {
    const lineCount = Array.isArray(this.text) ? this.text.length : 1;
    const lineHeight = pt2mm(this.styles.fontSize) * this.styles.lineHeight;
    const height = lineCount * lineHeight + this.padding('vertical');
    return Math.max(height, this.styles.minCellHeight);
  }

  padding(name: 'vertical' | 'horizontal' | 'top' | 'bottom' | 'left' | 'right') {
    const padding = parseSpacing(this.styles.cellPadding);
    if (name === 'vertical') {
      return padding.top + padding.bottom;
    } else if (name === 'horizontal') {
      return padding.left + padding.right;
    } else {
      return padding[name];
    }
  }
}

class Column {
  raw: ColumnInput | null;
  dataKey: number;
  index: number;

  wrappedWidth = 0;
  minReadableWidth = 0;
  minWidth = 0;
  width = 0;

  constructor(dataKey: number, raw: ColumnInput | null, index: number) {
    this.dataKey = dataKey;
    this.raw = raw;
    this.index = index;
  }

  getMaxCustomCellWidth(table: Table) {
    let max = 0;
    for (const row of table.allRows()) {
      const cell: Cell = row.cells[this.index];
      if (cell && typeof cell.styles.cellWidth === 'number') {
        max = Math.max(max, cell.styles.cellWidth);
      }
    }
    return max;
  }
}

export type RowType = InstanceType<typeof Row>;

class Row {
  readonly raw: RowInput;
  readonly index: number;
  readonly section: Section;
  readonly cells: { [key: string]: Cell };

  height = 0;

  constructor(raw: RowInput, index: number, section: Section, cells: { [key: string]: Cell }) {
    this.raw = raw;
    this.index = index;
    this.section = section;
    this.cells = cells;
  }

  getMaxCellHeight(columns: Column[]) {
    return columns.reduce((acc, column) => Math.max(acc, this.cells[column.index]?.height || 0), 0);
  }

  canEntireRowFit(height: number, columns: Column[]) {
    return this.getMaxCellHeight(columns) <= height;
  }

  getMinimumRowHeight(columns: Column[]) {
    return columns.reduce((acc: number, column: Column) => {
      const cell = this.cells[column.index];
      if (!cell) return 0;
      const vPadding = cell.padding('vertical');
      const oneRowHeight = vPadding + cell.styles.lineHeight;
      return oneRowHeight > acc ? oneRowHeight : acc;
    }, 0);
  }
}

export class Table {
  readonly settings: Settings;
  readonly styles: StylesProps;
  readonly hooks: HookProps;

  readonly columns: Column[];
  readonly head: Row[];
  readonly body: Row[];

  pageNumber = 1;

  constructor(input: TableInput, content: ContentSettings) {
    this.settings = input.settings;
    this.styles = input.styles;
    this.hooks = input.hooks;

    this.columns = content.columns;
    this.head = content.head;
    this.body = content.body;
  }

  getHeadHeight() {
    return this.head.reduce((acc, row) => acc + row.getMaxCellHeight(this.columns), 0);
  }

  getBodyHeight() {
    return this.body.reduce((acc, row) => acc + row.getMaxCellHeight(this.columns), 0);
  }

  allRows() {
    return this.head.concat(this.body);
  }

  callCellHooks(
    handlers: CellHook[],
    cell: Cell,
    row: Row,
    column: Column,
    cursor: { x: number; y: number } | null
  ): boolean {
    for (const handler of handlers) {
      const data = new CellHookData(this, cell, row, column, cursor);
      const result = handler(data) === false;
      // Make sure text is always string[] since user can assign string
      cell.text = Array.isArray(cell.text) ? cell.text : [cell.text];
      if (result) {
        return false;
      }
    }
    return true;
  }

  callEndPageHooks(cursor: { x: number; y: number }) {
    for (const handler of this.hooks.didDrawPage) {
      handler(new HookData(this, cursor));
    }
  }
  callWillDrawPageHooks(cursor: { x: number; y: number }) {
    for (const handler of this.hooks.willDrawPage) {
      handler(new HookData(this, cursor));
    }
  }

  getWidth() {
    return this.settings.tableWidth;
  }

  getHeight() {
    return this.getHeadHeight() + this.getBodyHeight();
  }
}

class HookData {
  table: Table;
  pageNumber: number;
  settings: Settings;
  cursor: Pos | null;

  constructor(table: Table, cursor: Pos | null) {
    this.table = table;
    this.pageNumber = table.pageNumber;
    this.settings = table.settings;
    this.cursor = cursor;
  }
}

class CellHookData extends HookData {
  cell: Cell;
  row: Row;
  column: Column;
  section: 'head' | 'body';

  constructor(table: Table, cell: Cell, row: Row, column: Column, cursor: Pos | null) {
    super(table, cursor);

    this.cell = cell;
    this.row = row;
    this.column = column;
    this.section = row.section;
  }
}

async function drawTable(arg: PDFRenderProps<TableSchema>, table: Table): Promise<void> {
  const pageSize = arg.page.getSize();

  const settings = table.settings;
  const startY = settings.startY;
  const margin = settings.margin;
  const cursor = {
    x: margin.left,
    y: startY,
  };
  const sectionsHeight = table.getHeadHeight();
  let minTableBottomPos = startY + margin.bottom + sectionsHeight;

  if (settings.pageBreak === 'avoid') {
    const rows = table.body;
    const tableHeight = rows.reduce((acc, row) => acc + row.height, 0);

    minTableBottomPos += tableHeight;
  }

  if (
    settings.pageBreak === 'always' ||
    (settings.startY != null && minTableBottomPos > pageSize.height)
  ) {
    nextPage();
    cursor.y = margin.top;
  }
  table.callWillDrawPageHooks(cursor);

  const startPos = Object.assign({}, cursor);

  // normal flow
  if (settings.showHead === 'firstPage' || settings.showHead === 'everyPage') {
    for (const row of table.head) {
      await printRow(arg, table, row, cursor, table.columns);
    }
  }

  for (const row of table.body) {
    const isLastRow = row.index === table.body.length - 1;
    await printFullRow(arg, table, row, isLastRow, startPos, cursor, table.columns, pageSize);
  }

  await addTableBorder(arg, table, startPos, cursor);
  table.callEndPageHooks(cursor);
}

async function printRow(
  arg: PDFRenderProps<Schema>,
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

    const result = table.callCellHooks(table.hooks.willDrawCell, cell, row, column, cursor);
    if (result === false) {
      cursor.x += column.width;
      continue;
    }

    await drawCell(arg, cell);

    table.callCellHooks(table.hooks.didDrawCell, cell, row, column, cursor);

    cursor.x += column.width;
  }

  cursor.y += row.height;
}
async function printFullRow(
  arg: PDFRenderProps<TableSchema>,
  table: Table,
  row: Row,
  isLastRow: boolean,
  startPos: Pos,
  cursor: Pos,
  columns: Column[],
  pageSize: { width: number; height: number }
) {
  const pageHeight = pageSize.height;
  const remainingSpace = pageHeight - cursor.y;
  if (row.canEntireRowFit(remainingSpace, columns)) {
    await printRow(arg, table, row, cursor, columns);
  } else {
    if (shouldPrintOnCurrentPage(row, remainingSpace, table, pageHeight)) {
      const remainderRow = modifyRowToFit(row, remainingSpace, table);
      await printRow(arg, table, row, cursor, columns);
      await addPage(arg, table, startPos, cursor, columns);
      await printFullRow(arg, table, remainderRow, isLastRow, startPos, cursor, columns, pageSize);
    } else {
      await addPage(arg, table, startPos, cursor, columns);
      await printFullRow(arg, table, row, isLastRow, startPos, cursor, columns, pageSize);
    }
  }
}

async function addPage(
  arg: PDFRenderProps<TableSchema>,
  table: Table,
  startPos: Pos,
  cursor: Pos,
  columns: Column[] = []
) {
  // Add user content just before adding new page ensure it will
  // be drawn above other things on the page
  table.callEndPageHooks(cursor);

  const margin = table.settings.margin;
  await addTableBorder(arg, table, startPos, cursor);

  nextPage();
  table.pageNumber++;
  cursor.x = margin.left;
  cursor.y = margin.top;
  startPos.y = margin.top;

  // call didAddPage hooks before any content is added to the page
  table.callWillDrawPageHooks(cursor);

  if (table.settings.showHead === 'everyPage') {
    // table.head.forEach((row: Row) => printRow(table, row, cursor, columns));
    for (const row of table.head) {
      await printRow(arg, table, row, cursor, columns);
    }
  }
}

// TODO 改ページの実装
function nextPage() {
  // const current = doc.pageNumber();
  // doc.setPage(current + 1);
  // const newCurrent = doc.pageNumber();
  // if (newCurrent === current) {
  //   doc.addPage();
  //   return true;
  // }
  // return false;
}

function shouldPrintOnCurrentPage(
  row: Row,
  remainingPageSpace: number,
  table: Table,
  pageHeight: number
) {
  const margin = table.settings.margin;
  const marginHeight = margin.top + margin.bottom;
  let maxRowHeight = pageHeight - marginHeight;
  if (row.section === 'body') {
    // Should also take into account that head is not
    // on every page with some settings
    maxRowHeight -= table.getHeadHeight();
  }

  const minRowHeight = row.getMinimumRowHeight(table.columns);
  const minRowFits = minRowHeight < remainingPageSpace;
  if (minRowHeight > maxRowHeight) {
    console.error(
      `Will not be able to print row ${row.index} correctly since it's minimum height is larger than page height`
    );
    return true;
  }

  if (!minRowFits) {
    return false;
  }

  const rowHigherThanPage = row.getMaxCellHeight(table.columns) > maxRowHeight;
  if (rowHigherThanPage) {
    return true;
  }

  if (table.settings.rowPageBreak === 'avoid') {
    return false;
  }

  // In all other cases print the row on current page
  return true;
}

function modifyRowToFit(row: Row, remainingPageSpace: number, table: Table) {
  const cells: { [key: string]: Cell } = {};
  row.height = 0;

  let rowHeight = 0;

  for (const column of table.columns) {
    const cell: Cell = row.cells[column.index];
    if (!cell) continue;

    if (!Array.isArray(cell.text)) {
      cell.text = [cell.text];
    }

    let remainderCell = new Cell(cell.raw, cell.styles, cell.section);
    remainderCell = Object.assign(remainderCell, cell);
    remainderCell.text = [];

    const remainingLineCount = getRemainingLineCount(cell, remainingPageSpace);
    if (cell.text.length > remainingLineCount) {
      remainderCell.text = cell.text.splice(remainingLineCount, cell.text.length);
    }

    cell.contentHeight = cell.getContentHeight();

    if (cell.contentHeight >= remainingPageSpace) {
      cell.contentHeight = remainingPageSpace;
      remainderCell.styles.minCellHeight -= remainingPageSpace;
    }
    if (cell.contentHeight > row.height) {
      row.height = cell.contentHeight;
    }

    remainderCell.contentHeight = remainderCell.getContentHeight();
    if (remainderCell.contentHeight > rowHeight) {
      rowHeight = remainderCell.contentHeight;
    }

    cells[column.index] = remainderCell;
  }
  const remainderRow = new Row(row.raw, -1, row.section, cells);
  remainderRow.height = rowHeight;

  for (const column of table.columns) {
    const remainderCell = remainderRow.cells[column.index];
    if (remainderCell) {
      remainderCell.height = remainderRow.height;
    }
    const cell = row.cells[column.index];
    if (cell) {
      cell.height = row.height;
    }
  }

  return remainderRow;
}

function getRemainingLineCount(cell: Cell, remainingPageSpace: number) {
  const vPadding = cell.padding('vertical');
  return Math.floor((remainingPageSpace - vPadding) / cell.styles.lineHeight);
}

async function calculateWidths(
  table: Table,
  pageWidth: number,
  getFontKitFontByFontName: (fontName: string | undefined) => Promise<FontKitFont>
) {
  await calculate(table, pageWidth, getFontKitFontByFontName);

  const resizableColumns: Column[] = [];
  let initialTableWidth = 0;

  table.columns.forEach((column) => {
    const customWidth = column.getMaxCustomCellWidth(table);
    if (customWidth) {
      // final column width
      column.width = customWidth;
    } else {
      // initial column width (will be resized)
      column.width = column.wrappedWidth;
      resizableColumns.push(column);
    }
    initialTableWidth += column.width;
  });

  // width difference that needs to be distributed
  let resizeWidth = table.getWidth() - initialTableWidth;

  // first resize attempt: with respect to minReadableWidth and minWidth
  if (resizeWidth) {
    resizeWidth = resizeColumns(resizableColumns, resizeWidth, (column) =>
      Math.max(column.minReadableWidth, column.minWidth)
    );
  }

  // second resize attempt: ignore minReadableWidth but respect minWidth
  if (resizeWidth) {
    resizeWidth = resizeColumns(resizableColumns, resizeWidth, (column) => column.minWidth);
  }

  resizeWidth = Math.abs(resizeWidth);

  applyColSpans(table);
  await fitContent(table, getFontKitFontByFontName);
  applyRowSpans(table);
}

function applyRowSpans(table: Table) {
  const rowSpanCells: {
    [key: string]: { cell: Cell; left: number; row: Row };
  } = {};
  let colRowSpansLeft = 1;
  const all = table.allRows();
  for (let rowIndex = 0; rowIndex < all.length; rowIndex++) {
    const row = all[rowIndex];
    for (const column of table.columns) {
      const data = rowSpanCells[column.index];
      if (colRowSpansLeft > 1) {
        colRowSpansLeft--;
        delete row.cells[column.index];
      } else if (data) {
        data.cell.height += row.height;
        colRowSpansLeft = 1;
        delete row.cells[column.index];
        data.left--;
        if (data.left <= 1) {
          delete rowSpanCells[column.index];
        }
      } else {
        const cell = row.cells[column.index];
        if (!cell) {
          continue;
        }
        cell.height = row.height;
      }
    }
  }
}

function applyColSpans(table: Table) {
  const all = table.allRows();
  for (let rowIndex = 0; rowIndex < all.length; rowIndex++) {
    const row = all[rowIndex];

    let colSpanCell = null;
    let combinedColSpanWidth = 0;
    let colSpansLeft = 0;
    for (let columnIndex = 0; columnIndex < table.columns.length; columnIndex++) {
      const column = table.columns[columnIndex];

      // Width and colspan
      colSpansLeft -= 1;
      if (colSpansLeft > 1 && table.columns[columnIndex + 1]) {
        combinedColSpanWidth += column.width;
        delete row.cells[column.index];
      } else if (colSpanCell) {
        const cell: Cell = colSpanCell;
        delete row.cells[column.index];
        colSpanCell = null;
        cell.width = column.width + combinedColSpanWidth;
      } else {
        const cell = row.cells[column.index];
        if (!cell) continue;
        colSpansLeft = 1;
        combinedColSpanWidth = 0;
        cell.width = column.width + combinedColSpanWidth;
      }
    }
  }
}

async function fitContent(
  table: Table,
  getFontKitFontByFontName: (fontName: string | undefined) => Promise<FontKitFont>
) {
  const rowSpanHeight = { count: 0, height: 0 };
  for (const row of table.allRows()) {
    for (const column of table.columns) {
      const cell: Cell = row.cells[column.index];
      if (!cell) continue;

      const fontKitFont = await getFontKitFontByFontName(cell.styles.fontName);
      cell.text = splitTextToSize({
        value: cell.raw,
        characterSpacing: cell.styles.characterSpacing,
        boxWidthInPt: mm2pt(cell.width),
        fontSize: cell.styles.fontSize,
        fontKitFont,
      });

      cell.contentHeight = cell.getContentHeight();

      let realContentHeight = cell.contentHeight;
      if (rowSpanHeight && rowSpanHeight.count > 0) {
        if (rowSpanHeight.height > realContentHeight) {
          realContentHeight = rowSpanHeight.height;
        }
      }
      if (realContentHeight > row.height) {
        row.height = realContentHeight;
      }
    }
    rowSpanHeight.count--;
  }
}

function resizeColumns(
  columns: Column[],
  resizeWidth: number,
  getMinWidth: (column: Column) => number
) {
  const initialResizeWidth = resizeWidth;
  const sumWrappedWidth = columns.reduce((acc, column) => acc + column.wrappedWidth, 0);

  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];

    const ratio = column.wrappedWidth / sumWrappedWidth;
    const suggestedChange = initialResizeWidth * ratio;
    const suggestedWidth = column.width + suggestedChange;

    const minWidth = getMinWidth(column);
    const newWidth = suggestedWidth < minWidth ? minWidth : suggestedWidth;

    resizeWidth -= newWidth - column.width;
    column.width = newWidth;
  }

  resizeWidth = Math.round(resizeWidth * 1e10) / 1e10;

  // Run the resizer again if there's remaining width needs
  // to be distributed and there're columns that can be resized
  if (resizeWidth) {
    const resizableColumns = columns.filter((column) => {
      return resizeWidth < 0
        ? column.width > getMinWidth(column) // check if column can shrink
        : true; // check if column can grow
    });

    if (resizableColumns.length) {
      resizeWidth = resizeColumns(resizableColumns, resizeWidth, getMinWidth);
    }
  }

  return resizeWidth;
}

async function calculate(
  table: Table,
  pageWidth: number,
  getFontKitFontByFontName: (fontName: string | undefined) => Promise<FontKitFont>
) {
  const availablePageWidth = getPageAvailableWidth(table, pageWidth);
  for (const row of table.allRows()) {
    for (const column of table.columns) {
      const cell = row.cells[column.index];
      if (!cell) continue;
      const hooks = table.hooks.didParseCell;
      table.callCellHooks(hooks, cell, row, column, null);

      const padding = cell.padding('horizontal');
      const fontKitFont = await getFontKitFontByFontName(cell.styles.fontName);

      cell.contentWidth = getStringWidth(cell, fontKitFont) + padding;

      const longestWordWidth = getStringWidth(
        Object.assign(cell, { text: cell.text.join(' ').split(/\s+/) }),
        fontKitFont
      );
      cell.minReadableWidth = longestWordWidth + cell.padding('horizontal');

      if (typeof cell.styles.cellWidth === 'number') {
        cell.minWidth = cell.styles.cellWidth;
        cell.wrappedWidth = cell.styles.cellWidth;
      } else if (cell.styles.cellWidth === 'wrap') {
        // cell width should not be more than available page width
        if (cell.contentWidth > availablePageWidth) {
          cell.minWidth = availablePageWidth;
          cell.wrappedWidth = availablePageWidth;
        } else {
          cell.minWidth = cell.contentWidth;
          cell.wrappedWidth = cell.contentWidth;
        }
      } else {
        // auto
        const defaultMinWidth = 10;
        cell.minWidth = cell.styles.minCellWidth || defaultMinWidth;
        cell.wrappedWidth = cell.contentWidth;
        if (cell.minWidth > cell.wrappedWidth) {
          cell.wrappedWidth = cell.minWidth;
        }
      }
    }
  }

  for (const row of table.allRows()) {
    for (const column of table.columns) {
      const cell = row.cells[column.index];

      // For now we ignore the minWidth and wrappedWidth of colspan cells when calculating colspan widths.
      // Could probably be improved upon however.
      if (cell) {
        column.wrappedWidth = Math.max(column.wrappedWidth, cell.wrappedWidth);
        column.minWidth = Math.max(column.minWidth, cell.minWidth);
        column.minReadableWidth = Math.max(column.minReadableWidth, cell.minReadableWidth);
      } else {
        // Respect cellWidth set in columnStyles even if there is no cells for this column
        // or if the column only have colspan cells. Since the width of colspan cells
        // does not affect the width of columns, setting columnStyles cellWidth enables the
        // user to at least do it manually.

        // Note that this is not perfect for now since for example row and table styles are
        // not accounted for
        const columnStyles = table.styles.columnStyles[column.dataKey] || {};
        const cellWidth = columnStyles.cellWidth || columnStyles.minCellWidth;
        if (cellWidth && typeof cellWidth === 'number') {
          column.minWidth = cellWidth;
          column.wrappedWidth = cellWidth;
        }
      }
    }
  }
}

function getStringWidth(cell: Cell, fontKitFont: FontKitFont) {
  const text = cell.text;
  const textArr: string[] = Array.isArray(text) ? text : [text];
  const fontSize = cell.styles.fontSize;
  const characterSpacing = cell.styles.characterSpacing;
  const widestLineWidth = textArr
    .map((text) => widthOfTextAtSize(text, fontKitFont, fontSize, characterSpacing))
    .reduce((a, b) => Math.max(a, b), 0);

  return widestLineWidth;
}

function getPageAvailableWidth(table: Table, pageWidth: number) {
  const margins = parseSpacing(table.settings.margin);
  return pageWidth - (margins.left + margins.right);
}

function parseContent4Table(input: TableInput, fallbackFontName: string) {
  const content = input.content;
  const columns = createColumns(content.columns);

  // If no head is set, try generating it with content from columns
  if (content.head.length === 0) {
    const sectionRow = generateSectionRow(columns, 'head');
    if (sectionRow) content.head.push(sectionRow);
  }

  const styles = input.styles;
  return {
    columns,
    head: parseSection('head', content.head, columns, styles, fallbackFontName),
    body: parseSection('body', content.body, columns, styles, fallbackFontName),
  };
}

function generateSectionRow(columns: Column[], section: Section): RowInput | null {
  const sectionRow: { [key: string]: string } = {};
  columns.forEach((col) => {
    if (col.raw != null) {
      const title = getSectionTitle(section, col.raw);
      if (title != null) sectionRow[col.dataKey] = String(title);
    }
  });
  return Object.keys(sectionRow).length > 0 ? sectionRow : null;
}
function getSectionTitle(section: Section, column: ColumnInput) {
  if (section === 'head') {
    if (typeof column === 'object') {
      return column.header || null;
    } else if (typeof column === 'string' || typeof column === 'number') {
      return column;
    }
  }
  return null;
}
function createColumns(columns: ColumnInput[]) {
  return columns.map((input, index) => {
    const key = index;
    return new Column(key, input, index);
  });
}

function parseSection(
  sectionName: Section,
  sectionRows: RowInput[],
  columns: Column[],
  styleProps: StylesProps,
  fallbackFontName: string
): Row[] {
  const rowSpansLeftForColumn: { [key: string]: { left: number; times: number } } = {};
  const result = sectionRows.map((rawRow, rowIndex) => {
    let skippedRowForRowSpans = 0;
    const cells: { [key: string]: Cell } = {};

    let colSpansAdded = 0;
    let columnSpansLeft = 0;
    for (const column of columns) {
      if (
        rowSpansLeftForColumn[column.index] == null ||
        rowSpansLeftForColumn[column.index].left === 0
      ) {
        if (columnSpansLeft === 0) {
          let rawCell;
          if (Array.isArray(rawRow)) {
            rawCell = rawRow[column.index - colSpansAdded - skippedRowForRowSpans];
          } else {
            rawCell = rawRow[column.dataKey];
          }
          const styles = cellStyles(sectionName, column, rowIndex, styleProps, fallbackFontName);
          const cell = new Cell(rawCell, styles, sectionName);
          cells[column.index] = cell;

          columnSpansLeft = 0;
          rowSpansLeftForColumn[column.index] = {
            left: 0,
            times: columnSpansLeft,
          };
        } else {
          columnSpansLeft--;
          colSpansAdded++;
        }
      } else {
        rowSpansLeftForColumn[column.index].left--;
        columnSpansLeft = rowSpansLeftForColumn[column.index].times;
        skippedRowForRowSpans++;
      }
    }
    return new Row(rawRow, rowIndex, sectionName, cells);
  });
  return result;
}

function cellStyles(
  sectionName: Section,
  column: Column,
  rowIndex: number,
  styles: StylesProps,
  fallbackFontName: string
) {
  let sectionStyles;
  if (sectionName === 'head') {
    sectionStyles = styles.headStyles;
  } else if (sectionName === 'body') {
    sectionStyles = styles.bodyStyles;
  }
  const otherStyles = Object.assign({}, styles.styles, sectionStyles);

  const colStyles = styles.columnStyles[column.dataKey] || styles.columnStyles[column.index] || {};

  const rowStyles =
    sectionName === 'body' && rowIndex % 2 === 0
      ? Object.assign({}, styles.alternateRowStyles)
      : {};

  const defaultStyle = {
    fontName: fallbackFontName,
    backgroundColor: '',
    textColor: '#000000',
    lineHeight: 1,
    characterSpacing: 0,
    alignment: 'left',
    verticalAlignment: 'middle',
    fontSize: 10,
    cellPadding: 5,
    lineColor: '#000000',
    lineWidth: 0,
    cellWidth: 'auto',
    minCellHeight: 0,
    minCellWidth: 0,
  };
  return Object.assign(defaultStyle, otherStyles, rowStyles, colStyles) as Styles;
}

function parseStyles(cInput: UserOptions) {
  const styleOptions: StylesProps = {
    styles: {},
    headStyles: {},
    bodyStyles: {},
    alternateRowStyles: {},
    columnStyles: {},
  };
  for (const prop of Object.keys(styleOptions) as StyleProp[]) {
    if (prop === 'columnStyles') {
      const current = cInput[prop];
      styleOptions.columnStyles = Object.assign({}, current);
    } else {
      const allOptions = [cInput];
      const styles = allOptions.map((opts) => opts[prop] || {});
      styleOptions[prop] = Object.assign({}, styles[0], styles[1], styles[2]);
    }
  }
  return styleOptions;
}

function parseHooks(current: UserOptions) {
  const allOptions = [current];
  const result = {
    didParseCell: [] as CellHook[],
    willDrawCell: [] as CellHook[],
    didDrawCell: [] as CellHook[],
    willDrawPage: [] as PageHook[],
    didDrawPage: [] as PageHook[],
  };
  for (const options of allOptions) {
    if (options.didParseCell) result.didParseCell.push(options.didParseCell);
    if (options.willDrawCell) result.willDrawCell.push(options.willDrawCell);
    if (options.didDrawCell) result.didDrawCell.push(options.didDrawCell);
    if (options.willDrawPage) result.willDrawPage.push(options.willDrawPage);
    if (options.didDrawPage) result.didDrawPage.push(options.didDrawPage);
  }

  return result;
}

function parseSettings(options: UserOptions): Settings {
  let showHead: 'everyPage' | 'firstPage' | 'never';
  if (options.showHead === true) {
    showHead = 'everyPage';
  } else if (options.showHead === false) {
    showHead = 'never';
  } else {
    showHead = options.showHead ?? 'everyPage';
  }

  return {
    startY: options.startY,
    margin: parseSpacing(options.margin),
    pageBreak: options.pageBreak ?? 'auto',
    rowPageBreak: options.rowPageBreak ?? 'auto',
    tableWidth: options.tableWidth,
    showHead,
    tableLineWidth: options.tableLineWidth ?? 0,
    tableLineColor: options.tableLineColor ?? '',
  };
}

function parseContent4Input(options: UserOptions) {
  const head = options.head || [];
  const body = options.body || [];

  const columns = options.columns || parseColumns(head, body);
  return { columns, head, body };
}

function parseColumns(head: RowInput[], body: RowInput[]) {
  const firstRow: RowInput = head[0] || body[0] || [];
  const result: ColumnInput[] = [];
  Object.keys(firstRow).forEach((key) => {
    let colSpan = 1;
    let input: string;
    if (Array.isArray(firstRow)) {
      input = firstRow[parseInt(key)];
    } else {
      input = firstRow[key];
    }
    if (typeof input === 'object' && !Array.isArray(input)) {
      colSpan = 1;
    }
    for (let i = 0; i < colSpan; i++) {
      let id;
      if (Array.isArray(firstRow)) {
        id = result.length;
      } else {
        id = key + (i > 0 ? `_${i}` : '');
      }
      const rowResult: ColumnInput = { dataKey: id };
      result.push(rowResult);
    }
  });
  return result;
}

const mapCellStyle = (style: CellStyle): Partial<Styles> => ({
  fontName: style.fontName,
  alignment: style.alignment,
  verticalAlignment: style.verticalAlignment,
  fontSize: style.fontSize,
  lineHeight: style.lineHeight,
  characterSpacing: style.characterSpacing,
  backgroundColor: style.backgroundColor,
  // ---
  textColor: style.fontColor,
  lineColor: style.borderColor,
  lineWidth: style.borderWidth,
  cellPadding: style.padding,
});

const getTableOptions = (schema: TableSchema, body: string[][]): UserOptions => {
  const columnStylesWidth = schema.headWidthPercentages.reduce(
    (acc, cur, i) => ({ ...acc, [i]: { cellWidth: schema.width * (cur / 100) } }),
    {} as Record<number, Partial<Styles>>
  );

  const columnStylesAlignment = Object.entries(schema.columnStyles.alignment || {}).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: { alignment: value } }),
    {} as Record<number, Partial<Styles>>
  );

  const allKeys = new Set([
    ...Object.keys(columnStylesWidth).map(Number),
    ...Object.keys(columnStylesAlignment).map(Number),
  ]);
  const columnStyles = Array.from(allKeys).reduce((acc, key) => {
    const widthStyle = columnStylesWidth[key] || {};
    const alignmentStyle = columnStylesAlignment[key] || {};
    return { ...acc, [key]: { ...widthStyle, ...alignmentStyle } };
  }, {} as Record<number, Partial<Styles>>);

  return {
    head: [schema.head],
    body,
    startY: schema.position.y,
    tableWidth: schema.width,
    tableLineColor: schema.tableStyles.borderColor,
    tableLineWidth: schema.tableStyles.borderWidth,
    headStyles: mapCellStyle(schema.headStyles),
    bodyStyles: mapCellStyle(schema.bodyStyles),
    alternateRowStyles: { backgroundColor: schema.bodyStyles.alternateBackgroundColor },
    columnStyles,
    margin: { top: 0, right: 0, left: schema.position.x, bottom: 0 },
  };
};

type CreateTableArgs = {
  schema: Schema;
  options: CommonOptions;
  _cache: Map<any, any>;
};

async function createTable(input: TableInput, args: CreateTableArgs, pageWidth: number) {
  const { options, _cache } = args;
  const font = options.font || getDefaultFont();

  const getFontKitFontByFontName = (fontName: string | undefined) =>
    getFontKitFont(fontName, font, _cache);
  const fallbackFontName = getFallbackFontName(font);

  const content = parseContent4Table(input, fallbackFontName);
  const table = new Table(input, content);
  await calculateWidths(table, pageWidth, getFontKitFontByFontName);
  return table;
}

function parseInput(schema: TableSchema, body: string[][]): TableInput {
  const options = getTableOptions(schema, body);
  const styles = parseStyles(options);
  const hooks = parseHooks(options);
  const settings = parseSettings(options);
  const content = parseContent4Input(options);

  return { content, hooks, styles, settings };
}

export async function autoTable(
  body: string[][],
  args: PDFRenderProps<TableSchema> | CreateTableArgs,
  pageWidth: number
) {
  const input = parseInput(args.schema as TableSchema, body);
  const table = await createTable(input, args, pageWidth);

  if ('pdfLib' in args) {
    await drawTable(args, table);
  }

  return table;
}
