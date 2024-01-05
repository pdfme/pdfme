import { rectangle } from '../shapes/rectAndEllipse';
import { pdfRender as textRender } from '../text/pdfRender';

const SCALE_FACTOR = 1;

// ### function
function parseSpacing(value: MarginPaddingInput | undefined, defaultValue: number): MarginPadding {
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
}

// ### type alias

type StyleProp =
  | 'styles'
  | 'headStyles'
  | 'bodyStyles'
  | 'footStyles'
  | 'alternateRowStyles'
  | 'columnStyles';

type ThemeType = 'striped' | 'grid' | 'plain' | null;
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

type TableWidthType = 'auto' | 'wrap' | number;

type ShowHeadType = 'everyPage' | 'firstPage' | 'never' | boolean;
type ShowFootType = 'everyPage' | 'lastPage' | 'never' | boolean;
type Color = [number, number, number] | number | string | false;

type RowInput = { [key: string]: CellInput } | CellInput[];
type CellInput = null | string | string[] | number | boolean | CellDef;

type StandardFontType = 'helvetica' | 'times' | 'courier';

type CustomFontType = string;
type FontType = StandardFontType | CustomFontType;
type FontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

type HAlignType = 'left' | 'center' | 'right' | 'justify';
type VAlignType = 'top' | 'middle' | 'bottom';
type OverflowType =
  | 'linebreak'
  | 'ellipsize'
  | 'visible'
  | 'hidden'
  | ((text: string | string[], width: number) => string | string[]);

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
  foot: Row[];
  columns: Column[];
};
type PageHook = (data: HookData) => void | boolean;
type Section = 'head' | 'body' | 'foot';
type Pos = { x: number; y: number };

type ColumnInput =
  | string
  | number
  | {
      header?: CellInput;
      title?: CellInput; // deprecated (same as header)
      footer?: CellInput;
      dataKey?: string | number;
      key?: string | number; // deprecated (same as dataKey)
    };

type ThemeName = 'striped' | 'grid' | 'plain';

// ### interface

interface StylesProps {
  styles: Partial<Styles>;
  headStyles: Partial<Styles>;
  bodyStyles: Partial<Styles>;
  footStyles: Partial<Styles>;
  alternateRowStyles: Partial<Styles>;
  columnStyles: { [key: string]: Partial<Styles> };
}

interface CellDef {
  rowSpan?: number;
  colSpan?: number;
  styles?: Partial<Styles>;
  content?: string | string[] | number;
  title?: string; // Deprecated, same as content
  _element?: HTMLTableCellElement;
}

interface Styles {
  font: FontType;
  fontStyle: FontStyle;
  overflow: OverflowType;
  fillColor: Color;
  textColor: Color;
  halign: HAlignType;
  valign: VAlignType;
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
  includeHiddenHtml: boolean;
  useCss: boolean;
  theme: 'striped' | 'grid' | 'plain';
  startY: number;
  margin: MarginPadding;
  pageBreak: 'auto' | 'avoid' | 'always';
  rowPageBreak: 'auto' | 'avoid';
  tableWidth: 'auto' | 'wrap' | number;
  showHead: 'everyPage' | 'firstPage' | 'never';
  showFoot: 'everyPage' | 'lastPage' | 'never';
  tableLineWidth: number;
  tableLineColor: Color;
  horizontalPageBreak?: boolean;
  horizontalPageBreakRepeat?: string | number | string[] | number[] | null;
}

interface StylesProps {
  styles: Partial<Styles>;
  headStyles: Partial<Styles>;
  bodyStyles: Partial<Styles>;
  footStyles: Partial<Styles>;
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
  foot: RowInput[];
  columns: ColumnInput[];
}

interface TableInput {
  id: string | number | undefined;
  settings: Settings;
  styles: StylesProps;
  hooks: HookProps;
  content: ContentInput;
}

interface UserOptions {
  includeHiddenHtml?: boolean;
  useCss?: boolean;
  theme?: ThemeType;
  startY?: number | false;
  margin?: MarginPaddingInput;
  pageBreak?: PageBreakType;
  rowPageBreak?: RowPageBreakType;
  tableWidth?: TableWidthType;
  showHead?: ShowHeadType;
  showFoot?: ShowFootType;
  tableLineWidth?: number;
  tableLineColor?: Color;
  tableId?: string | number;
  head?: RowInput[];
  body?: RowInput[];
  foot?: RowInput[];
  html?: string | HTMLTableElement;
  columns?: ColumnInput[];
  horizontalPageBreak?: boolean;
  // Column data key to repeat if horizontalPageBreak = true
  horizontalPageBreakRepeat?: string[] | number[] | string | number;

  // Styles
  styles?: Partial<Styles>;
  bodyStyles?: Partial<Styles>;
  headStyles?: Partial<Styles>;
  footStyles?: Partial<Styles>;
  alternateRowStyles?: Partial<Styles>;
  columnStyles?: {
    [key: string]: Partial<Styles>;
  };

  // Hooks
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

// ### class

class Cell {
  raw: HTMLTableCellElement | CellInput;
  styles: Styles;
  text: string[];
  section: Section;
  colSpan: number;
  rowSpan: number;

  contentHeight = 0;
  contentWidth = 0;
  wrappedWidth = 0;
  minReadableWidth = 0;
  minWidth = 0;

  width = 0;
  height = 0;
  x = 0;
  y = 0;

  constructor(raw: CellInput, styles: Styles, section: Section) {
    this.styles = styles;
    this.section = section;
    this.raw = raw;

    let content = raw;
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      this.rowSpan = raw.rowSpan || 1;
      this.colSpan = raw.colSpan || 1;
      content = raw.content ?? raw.title ?? raw;
      if (raw._element) {
        this.raw = raw._element;
      }
    } else {
      this.rowSpan = 1;
      this.colSpan = 1;
    }

    // Stringify 0 and false, but not undefined or null
    const text = content != null ? '' + String(content) : '';
    const splitRegex = /\r\n|\r|\n/g;
    this.text = text.split(splitRegex);
  }

  getTextPos(): Pos {
    let y;
    if (this.styles.valign === 'top') {
      y = this.y + this.padding('top');
    } else if (this.styles.valign === 'bottom') {
      y = this.y + this.height - this.padding('bottom');
    } else {
      const netHeight = this.height - this.padding('vertical');
      y = this.y + netHeight / 2 + this.padding('top');
    }

    let x;
    if (this.styles.halign === 'right') {
      x = this.x + this.width - this.padding('right');
    } else if (this.styles.halign === 'center') {
      const netWidth = this.width - this.padding('horizontal');
      x = this.x + netWidth / 2 + this.padding('left');
    } else {
      x = this.x + this.padding('left');
    }
    return { x, y };
  }

  // TODO (v4): replace parameters with only (lineHeight)
  getContentHeight(scaleFactor: number, lineHeightFactor = 1.15) {
    const lineCount = Array.isArray(this.text) ? this.text.length : 1;
    const lineHeight = (this.styles.fontSize / scaleFactor) * lineHeightFactor;
    const height = lineCount * lineHeight + this.padding('vertical');
    return Math.max(height, this.styles.minCellHeight);
  }

  padding(name: 'vertical' | 'horizontal' | 'top' | 'bottom' | 'left' | 'right') {
    const padding = parseSpacing(this.styles.cellPadding, 0);
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
  dataKey: string | number;
  index: number;

  wrappedWidth = 0;
  minReadableWidth = 0;
  minWidth = 0;
  width = 0;

  constructor(dataKey: string | number, raw: ColumnInput | null, index: number) {
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

class Row {
  readonly raw: HTMLTableRowElement | RowInput;
  readonly element?: HTMLTableRowElement;
  readonly index: number;
  readonly section: Section;
  readonly cells: { [key: string]: Cell };
  spansMultiplePages: boolean;

  height = 0;

  constructor(
    raw: RowInput | HTMLTableRowElement,
    index: number,
    section: Section,
    cells: { [key: string]: Cell },
    spansMultiplePages = false
  ) {
    this.raw = raw;
    this.index = index;
    this.section = section;
    this.cells = cells;
    this.spansMultiplePages = spansMultiplePages;
  }

  getMaxCellHeight(columns: Column[]) {
    return columns.reduce((acc, column) => Math.max(acc, this.cells[column.index]?.height || 0), 0);
  }

  hasRowSpan(columns: Column[]) {
    return (
      columns.filter((column: Column) => {
        const cell = this.cells[column.index];
        if (!cell) return false;
        return cell.rowSpan > 1;
      }).length > 0
    );
  }

  canEntireRowFit(height: number, columns: Column[]) {
    return this.getMaxCellHeight(columns) <= height;
  }

  getMinimumRowHeight(columns: Column[], lineHeight: number) {
    return columns.reduce((acc: number, column: Column) => {
      const cell = this.cells[column.index];
      if (!cell) return 0;
      const vPadding = cell.padding('vertical');
      const oneRowHeight = vPadding + lineHeight;
      return oneRowHeight > acc ? oneRowHeight : acc;
    }, 0);
  }
}

class Table {
  readonly id?: string | number;

  readonly settings: Settings;
  readonly styles: StylesProps;
  readonly hooks: HookProps;

  readonly columns: Column[];
  readonly head: Row[];
  readonly body: Row[];
  readonly foot: Row[];

  pageNumber = 1;
  finalY?: number;
  startPageNumber?: number;

  // Deprecated, use pageNumber instead
  // Not using getter since:
  // https://github.com/simonbengtsson/jsPDF-AutoTable/issues/596
  pageCount = 1;

  constructor(input: TableInput, content: ContentSettings) {
    this.id = input.id;
    this.settings = input.settings;
    this.styles = input.styles;
    this.hooks = input.hooks;

    this.columns = content.columns;
    this.head = content.head;
    this.body = content.body;
    this.foot = content.foot;
  }

  getHeadHeight(columns: Column[]) {
    return this.head.reduce((acc, row) => acc + row.getMaxCellHeight(columns), 0);
  }

  getFootHeight(columns: Column[]) {
    return this.foot.reduce((acc, row) => acc + row.getMaxCellHeight(columns), 0);
  }

  allRows() {
    return this.head.concat(this.body).concat(this.foot);
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

  getWidth(pageWidth: number) {
    if (typeof this.settings.tableWidth === 'number') {
      return this.settings.tableWidth;
    } else if (this.settings.tableWidth === 'wrap') {
      const wrappedWidth = this.columns.reduce((total, col) => total + col.wrappedWidth, 0);
      return wrappedWidth;
    } else {
      const margin = this.settings.margin;
      return pageWidth - margin.left - margin.right;
    }
  }
}

class HookData {
  table: Table;
  pageNumber: number;
  pageCount: number; // Deprecated, use pageNumber instead
  settings: Settings;
  cursor: Pos | null;

  constructor(table: Table, cursor: Pos | null) {
    this.table = table;
    this.pageNumber = table.pageNumber;
    this.pageCount = this.pageNumber;
    this.settings = table.settings;
    this.cursor = cursor;
  }
}

class CellHookData extends HookData {
  cell: Cell;
  row: Row;
  column: Column;
  section: 'head' | 'body' | 'foot';

  constructor(table: Table, cell: Cell, row: Row, column: Column, cursor: Pos | null) {
    super(table, cursor);

    this.cell = cell;
    this.row = row;
    this.column = column;
    this.section = row.section;
  }
}

// ------------------------------

export function autoTable(options: UserOptions) {
  const input = parseInput(options);
  const table = createTable(input);
  console.log(table);
  drawTable(table);
}

function drawTable(table: Table): void {
  // TODO
  const pageHeight = 297;

  const settings = table.settings;
  const startY = settings.startY;
  const margin = settings.margin;
  const cursor = {
    x: margin.left,
    y: startY,
  };
  const sectionsHeight = table.getHeadHeight(table.columns) + table.getFootHeight(table.columns);
  let minTableBottomPos = startY + margin.bottom + sectionsHeight;

  if (settings.pageBreak === 'avoid') {
    const rows = table.body;
    const tableHeight = rows.reduce((acc, row) => acc + row.height, 0);

    minTableBottomPos += tableHeight;
  }

  if (
    settings.pageBreak === 'always' ||
    (settings.startY != null && minTableBottomPos > pageHeight)
  ) {
    nextPage();
    cursor.y = margin.top;
  }
  table.callWillDrawPageHooks(cursor);

  const startPos = Object.assign({}, cursor);

  // TODO
  table.startPageNumber = 1;
  // table.startPageNumber = doc.pageNumber();

  // normal flow
  if (settings.showHead === 'firstPage' || settings.showHead === 'everyPage') {
    table.head.forEach((row) => printRow(table, row, cursor, table.columns));
  }

  table.body.forEach((row, index) => {
    const isLastRow = index === table.body.length - 1;
    printFullRow(table, row, isLastRow, startPos, cursor, table.columns);
  });

  if (settings.showFoot === 'lastPage' || settings.showFoot === 'everyPage') {
    table.foot.forEach((row) => printRow(table, row, cursor, table.columns));
  }

  addTableBorder(table, startPos, cursor);
  table.callEndPageHooks(cursor);
}

function printRow(table: Table, row: Row, cursor: Pos, columns: Column[]) {
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

    // TODO ここから
    console.log('cell', cell.x, cell.y, cell.width, cell.height, cell.raw);
    // rectangle.pdf();
    // drawCellRect(doc, cell, cursor);

    const textPos = cell.getTextPos();
    console.log('textPos', textPos);
    // textRender;
    // autoTableText(
    //   cell.text,
    //   textPos.x,
    //   textPos.y,
    //   {
    //     halign: cell.styles.halign,
    //     valign: cell.styles.valign,
    //     maxWidth: Math.ceil(cell.width - cell.padding('left') - cell.padding('right')),
    //   },
    //   doc.getDocument()
    // );

    table.callCellHooks(table.hooks.didDrawCell, cell, row, column, cursor);

    cursor.x += column.width;
  }

  cursor.y += row.height;
}

function printFullRow(
  table: Table,
  row: Row,
  isLastRow: boolean,
  startPos: Pos,
  cursor: Pos,
  columns: Column[]
) {
  // TODO
  const pageHeight = 297;
  const remainingSpace = getRemainingPageSpace(table, isLastRow, cursor, pageHeight);
  if (row.canEntireRowFit(remainingSpace, columns)) {
    printRow(table, row, cursor, columns);
  } else {
    if (shouldPrintOnCurrentPage(row, remainingSpace, table, pageHeight)) {
      const remainderRow = modifyRowToFit(row, remainingSpace, table);
      printRow(table, row, cursor, columns);
      addPage(table, startPos, cursor, columns);
      printFullRow(table, remainderRow, isLastRow, startPos, cursor, columns);
    } else {
      addPage(table, startPos, cursor, columns);
      printFullRow(table, row, isLastRow, startPos, cursor, columns);
    }
  }
}

function addPage(table: Table, startPos: Pos, cursor: Pos, columns: Column[] = []) {
  if (table.settings.showFoot === 'everyPage') {
    table.foot.forEach((row: Row) => printRow(table, row, cursor, columns));
  }

  // Add user content just before adding new page ensure it will
  // be drawn above other things on the page
  table.callEndPageHooks(cursor);

  const margin = table.settings.margin;
  addTableBorder(table, startPos, cursor);
  nextPage();
  table.pageNumber++;
  table.pageCount++;
  cursor.x = margin.left;
  cursor.y = margin.top;
  startPos.y = margin.top;

  // call didAddPage hooks before any content is added to the page
  table.callWillDrawPageHooks(cursor);

  if (table.settings.showHead === 'everyPage') {
    table.head.forEach((row: Row) => printRow(table, row, cursor, columns));
  }
}

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

function addTableBorder(table: Table, startPos: Pos, cursor: Pos) {
  const lineWidth = table.settings.tableLineWidth;
  const lineColor = table.settings.tableLineColor;

  const fillStyle = getFillStyle(lineWidth, false);
  if (fillStyle) {
    // TODO ここから
    // doc.rect(
    //   startPos.x,
    //   startPos.y,
    //   table.getWidth(doc.pageSize().width),
    //   cursor.y - startPos.y,
    //   fillStyle
    // );
  }
}

function getFillStyle(lineWidth: number, fillColor: Color) {
  const drawLine = lineWidth > 0;
  const drawBackground = fillColor || fillColor === 0;
  if (drawLine && drawBackground) {
    return 'DF'; // Fill then stroke
  } else if (drawLine) {
    return 'S'; // Only stroke (transparent background)
  } else if (drawBackground) {
    return 'F'; // Only fill, no stroke
  } else {
    return null;
  }
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
    // Should also take into account that head and foot is not
    // on every page with some settings
    maxRowHeight -= table.getHeadHeight(table.columns) + table.getFootHeight(table.columns);
  }

  // TODO
  const minRowHeight = row.getMinimumRowHeight(table.columns, 1.15);
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

  const rowHasRowSpanCell = row.hasRowSpan(table.columns);
  const rowHigherThanPage = row.getMaxCellHeight(table.columns) > maxRowHeight;
  if (rowHigherThanPage) {
    if (rowHasRowSpanCell) {
      console.error(
        `The content of row ${row.index} will not be drawn correctly since drawing rows with a height larger than the page height and has cells with rowspans is not supported.`
      );
    }
    return true;
  }

  if (rowHasRowSpanCell) {
    // Currently a new page is required whenever a rowspan row don't fit a page.
    return false;
  }

  if (table.settings.rowPageBreak === 'avoid') {
    return false;
  }

  // In all other cases print the row on current page
  return true;
}

function getRemainingPageSpace(table: Table, isLastRow: boolean, cursor: Pos, pageHeight: number) {
  let bottomContentHeight = table.settings.margin.bottom;
  const showFoot = table.settings.showFoot;
  if (showFoot === 'everyPage' || (showFoot === 'lastPage' && isLastRow)) {
    bottomContentHeight += table.getFootHeight(table.columns);
  }
  return pageHeight - cursor.y - bottomContentHeight;
}

function modifyRowToFit(row: Row, remainingPageSpace: number, table: Table) {
  const cells: { [key: string]: Cell } = {};
  row.spansMultiplePages = true;
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

    const scaleFactor = SCALE_FACTOR;
    // TODO
    const lineHeightFactor = 1.15;
    cell.contentHeight = cell.getContentHeight(scaleFactor, lineHeightFactor);

    if (cell.contentHeight >= remainingPageSpace) {
      cell.contentHeight = remainingPageSpace;
      remainderCell.styles.minCellHeight -= remainingPageSpace;
    }
    if (cell.contentHeight > row.height) {
      row.height = cell.contentHeight;
    }

    remainderCell.contentHeight = remainderCell.getContentHeight(scaleFactor, lineHeightFactor);
    if (remainderCell.contentHeight > rowHeight) {
      rowHeight = remainderCell.contentHeight;
    }

    cells[column.index] = remainderCell;
  }
  const remainderRow = new Row(row.raw, -1, row.section, cells, true);
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
  // TODO
  // const lineHeight = doc.getLineHeight(cell.styles.fontSize);
  const lineHeight = 1.15;
  const vPadding = cell.padding('vertical');
  const remainingLines = Math.floor((remainingPageSpace - vPadding) / lineHeight);
  return Math.max(0, remainingLines);
}

function createTable(input: TableInput) {
  const content = parseContent4Table(input, SCALE_FACTOR);
  const table = new Table(input, content);
  // TODO
  const pageWidth = 210;
  calculateWidths(table, pageWidth);

  return table;
}

function calculateWidths(table: Table, pageWidth: number) {
  calculate(table, pageWidth);

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
  let resizeWidth = table.getWidth(pageWidth) - initialTableWidth;

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
  if (!table.settings.horizontalPageBreak && resizeWidth > 0.1 / SCALE_FACTOR) {
    // Table can't get smaller due to custom-width or minWidth restrictions
    // We can't really do much here. Up to user to for example
    // reduce font size, increase page size or remove custom cell widths
    // to allow more columns to be reduced in size
    resizeWidth = resizeWidth < 1 ? resizeWidth : Math.round(resizeWidth);
    console.warn(`Of the table content, ${resizeWidth} units width could not fit page`);
  }

  applyColSpans(table);
  fitContent(table);
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
        colRowSpansLeft = data.cell.colSpan;
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
        if (cell.rowSpan > 1) {
          const remaining = all.length - rowIndex;
          const left = cell.rowSpan > remaining ? remaining : cell.rowSpan;
          rowSpanCells[column.index] = { cell, left, row };
        }
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
        colSpansLeft = cell.colSpan;
        combinedColSpanWidth = 0;
        if (cell.colSpan > 1) {
          colSpanCell = cell;
          combinedColSpanWidth += column.width;
          continue;
        }
        cell.width = column.width + combinedColSpanWidth;
      }
    }
  }
}

function fitContent(table: Table) {
  let rowSpanHeight = { count: 0, height: 0 };
  for (const row of table.allRows()) {
    for (const column of table.columns) {
      const cell: Cell = row.cells[column.index];
      if (!cell) continue;

      const textSpace = cell.width - cell.padding('horizontal');
      if (cell.styles.overflow === 'linebreak') {
        // Add one pt to textSpace to fix rounding error
        // TODO
        // cell.text = splitTextToSize(cell.text, textSpace + 1 / SCALE_FACTOR, {
        //   fontSize: cell.styles.fontSize,
        // });
        cell.text = cell.text.map((str) => str.split(/\r\n|\r|\n/g)).flat();
      } else if (cell.styles.overflow === 'ellipsize') {
        cell.text = ellipsize(cell.text, textSpace, '...');
      } else if (cell.styles.overflow === 'hidden') {
        cell.text = ellipsize(cell.text, textSpace, '');
      } else if (typeof cell.styles.overflow === 'function') {
        const result = cell.styles.overflow(cell.text, textSpace);
        if (typeof result === 'string') {
          cell.text = [result];
        } else {
          cell.text = result;
        }
      }

      // TODO
      cell.contentHeight = cell.getContentHeight(SCALE_FACTOR, 1.15);

      let realContentHeight = cell.contentHeight / cell.rowSpan;
      if (
        cell.rowSpan > 1 &&
        rowSpanHeight.count * rowSpanHeight.height < realContentHeight * cell.rowSpan
      ) {
        rowSpanHeight = { height: realContentHeight, count: cell.rowSpan };
      } else if (rowSpanHeight && rowSpanHeight.count > 0) {
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

function ellipsize(text: string[], width: number, overflow: string): string[] {
  return text.map((str) => ellipsizeStr(str, width, overflow));
}

function ellipsizeStr(text: string, width: number, overflow: string): string {
  const precision = 10000 * SCALE_FACTOR;
  width = Math.ceil(width * precision) / precision;

  if (width >= getStringWidth(text)) {
    return text;
  }
  while (width < getStringWidth(text + overflow)) {
    if (text.length <= 1) {
      break;
    }
    text = text.substring(0, text.length - 1);
  }
  return text.trim() + overflow;
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

function calculate(table: Table, pageWidth: number) {
  const sf = SCALE_FACTOR;
  const horizontalPageBreak = table.settings.horizontalPageBreak;
  const availablePageWidth = getPageAvailableWidth(table, pageWidth);
  table.allRows().forEach((row) => {
    for (const column of table.columns) {
      const cell = row.cells[column.index];
      if (!cell) continue;
      const hooks = table.hooks.didParseCell;
      table.callCellHooks(hooks, cell, row, column, null);

      const padding = cell.padding('horizontal');
      cell.contentWidth = getStringWidth(cell.text) + padding;

      const longestWordWidth = getStringWidth(cell.text.join(' ').split(/\s+/));
      cell.minReadableWidth = longestWordWidth + cell.padding('horizontal');

      if (typeof cell.styles.cellWidth === 'number') {
        cell.minWidth = cell.styles.cellWidth;
        cell.wrappedWidth = cell.styles.cellWidth;
      } else if (cell.styles.cellWidth === 'wrap' || horizontalPageBreak === true) {
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
        const defaultMinWidth = 10 / sf;
        cell.minWidth = cell.styles.minCellWidth || defaultMinWidth;
        cell.wrappedWidth = cell.contentWidth;
        if (cell.minWidth > cell.wrappedWidth) {
          cell.wrappedWidth = cell.minWidth;
        }
      }
    }
  });

  table.allRows().forEach((row) => {
    for (const column of table.columns) {
      const cell = row.cells[column.index];

      // For now we ignore the minWidth and wrappedWidth of colspan cells when calculating colspan widths.
      // Could probably be improved upon however.
      if (cell && cell.colSpan === 1) {
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
        const columnStyles =
          table.styles.columnStyles[column.dataKey] ||
          table.styles.columnStyles[column.index] ||
          {};
        const cellWidth = columnStyles.cellWidth || columnStyles.minCellWidth;
        if (cellWidth && typeof cellWidth === 'number') {
          column.minWidth = cellWidth;
          column.wrappedWidth = cellWidth;
        }
      }

      if (cell) {
        // Make sure all columns get at least min width even though width calculations are not based on them
        if (cell.colSpan > 1 && !column.minWidth) {
          column.minWidth = cell.minWidth;
        }
        if (cell.colSpan > 1 && !column.wrappedWidth) {
          column.wrappedWidth = cell.minWidth;
        }
      }
    }
  });
}

function getStringWidth(text: string | string[]) {
  const textArr: string[] = Array.isArray(text) ? text : [text];

  // TODO
  // const widestLineWidth = textArr
  //   .map((text) => getTextWidth(text))
  //   .reduce((a, b) => Math.max(a, b), 0);

  // return widestLineWidth;
  return 100;
}

function getPageAvailableWidth(table: Table, pageWidth: number) {
  const margins = parseSpacing(table.settings.margin, 0);
  return pageWidth - (margins.left + margins.right);
}

function parseContent4Table(input: TableInput, sf: number) {
  const content = input.content;
  const columns = createColumns(content.columns);

  // If no head or foot is set, try generating it with content from columns
  if (content.head.length === 0) {
    const sectionRow = generateSectionRow(columns, 'head');
    if (sectionRow) content.head.push(sectionRow);
  }
  if (content.foot.length === 0) {
    const sectionRow = generateSectionRow(columns, 'foot');
    if (sectionRow) content.foot.push(sectionRow);
  }

  const theme = input.settings.theme;
  const styles = input.styles;
  return {
    columns,
    head: parseSection('head', content.head, columns, styles, theme, sf),
    body: parseSection('body', content.body, columns, styles, theme, sf),
    foot: parseSection('foot', content.foot, columns, styles, theme, sf),
  };
}

function generateSectionRow(columns: Column[], section: Section): RowInput | null {
  const sectionRow: { [key: string]: CellInput } = {};
  columns.forEach((col) => {
    if (col.raw != null) {
      const title = getSectionTitle(section, col.raw);
      if (title != null) sectionRow[col.dataKey] = title;
    }
  });
  return Object.keys(sectionRow).length > 0 ? sectionRow : null;
}

function getSectionTitle(section: Section, column: ColumnInput) {
  if (section === 'head') {
    if (typeof column === 'object') {
      return column.header || column.title || null;
    } else if (typeof column === 'string' || typeof column === 'number') {
      return column;
    }
  } else if (section === 'foot' && typeof column === 'object') {
    return column.footer;
  }
  return null;
}

function createColumns(columns: ColumnInput[]) {
  return columns.map((input, index) => {
    let key;
    if (typeof input === 'object') {
      key = input.dataKey ?? input.key ?? index;
    } else {
      key = index;
    }
    return new Column(key, input, index);
  });
}

function parseSection(
  sectionName: Section,
  sectionRows: RowInput[],
  columns: Column[],
  styleProps: StylesProps,
  theme: ThemeName,
  scaleFactor: number
): Row[] {
  const rowSpansLeftForColumn: {
    [key: string]: { left: number; times: number };
  } = {};
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

          let cellInputStyles = {};
          if (typeof rawCell === 'object' && !Array.isArray(rawCell)) {
            cellInputStyles = rawCell?.styles || {};
          }
          const styles = cellStyles(
            sectionName,
            column,
            rowIndex,
            theme,
            styleProps,
            scaleFactor,
            cellInputStyles
          );
          const cell = new Cell(rawCell, styles, sectionName);
          // dataKey is not used internally no more but keep for
          // backwards compat in hooks
          cells[column.dataKey] = cell;
          cells[column.index] = cell;

          columnSpansLeft = cell.colSpan - 1;
          rowSpansLeftForColumn[column.index] = {
            left: cell.rowSpan - 1,
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
  themeName: ThemeName,
  styles: StylesProps,
  scaleFactor: number,
  cellInputStyles: Partial<Styles>
) {
  const theme = getTheme(themeName);
  let sectionStyles;
  if (sectionName === 'head') {
    sectionStyles = styles.headStyles;
  } else if (sectionName === 'body') {
    sectionStyles = styles.bodyStyles;
  } else if (sectionName === 'foot') {
    sectionStyles = styles.footStyles;
  }
  const otherStyles = Object.assign(
    {},
    theme.table,
    theme[sectionName],
    styles.styles,
    sectionStyles
  ) as Partial<Styles>;
  const columnStyles =
    styles.columnStyles[column.dataKey] || styles.columnStyles[column.index] || {};
  const colStyles = sectionName === 'body' ? columnStyles : {};
  const rowStyles =
    sectionName === 'body' && rowIndex % 2 === 0
      ? Object.assign({}, theme.alternateRow, styles.alternateRowStyles)
      : {};
  const defaultStyle = defaultStyles(SCALE_FACTOR);
  const themeStyles = Object.assign({}, defaultStyle, otherStyles, rowStyles, colStyles) as Styles &
    Partial<Styles>;
  return Object.assign(themeStyles, cellInputStyles);
}

function defaultStyles(scaleFactor: number): Styles {
  return {
    font: 'helvetica', // helvetica, times, courier
    fontStyle: 'normal', // normal, bold, italic, bolditalic
    overflow: 'linebreak', // linebreak, ellipsize, visible or hidden
    fillColor: false, // Either false for transparent, rbg array e.g. [255, 255, 255] or gray level e.g 200
    textColor: 20,
    halign: 'left', // left, center, right, justify
    valign: 'top', // top, middle, bottom
    fontSize: 10,
    cellPadding: 5 / scaleFactor, // number or {top,left,right,left,vertical,horizontal}
    lineColor: 200,
    lineWidth: 0,
    cellWidth: 'auto', // 'auto'|'wrap'|number
    minCellHeight: 0,
    minCellWidth: 0,
  };
}

function getTheme(name: ThemeName): { [key: string]: Partial<Styles> } {
  const themes: { [key in ThemeName]: { [key: string]: Partial<Styles> } } = {
    striped: {
      table: { fillColor: 255, textColor: 80, fontStyle: 'normal' },
      head: { textColor: 255, fillColor: [41, 128, 185], fontStyle: 'bold' },
      body: {},
      foot: { textColor: 255, fillColor: [41, 128, 185], fontStyle: 'bold' },
      alternateRow: { fillColor: 245 },
    },
    grid: {
      table: {
        fillColor: 255,
        textColor: 80,
        fontStyle: 'normal',
        lineWidth: 0.1,
      },
      head: {
        textColor: 255,
        fillColor: [26, 188, 156],
        fontStyle: 'bold',
        lineWidth: 0,
      },
      body: {},
      foot: {
        textColor: 255,
        fillColor: [26, 188, 156],
        fontStyle: 'bold',
        lineWidth: 0,
      },
      alternateRow: {},
    },
    plain: {
      head: { fontStyle: 'bold' },
      foot: { fontStyle: 'bold' },
    },
  };
  return themes[name];
}

function parseInput(current: UserOptions): TableInput {
  const options = Object.assign({}, current);

  const styles = parseStyles(current);
  const hooks = parseHooks(current);
  const settings = parseSettings(options);
  const content = parseContent4Input(options);

  return {
    id: current.tableId,
    content,
    hooks,
    styles,
    settings,
  };
}

function parseStyles(cInput: UserOptions) {
  const styleOptions: StylesProps = {
    styles: {},
    headStyles: {},
    bodyStyles: {},
    footStyles: {},
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
  const margin = parseSpacing(options.margin, 40 / SCALE_FACTOR);
  const startY = getStartY(options.startY) ?? margin.top;

  let showFoot: 'everyPage' | 'lastPage' | 'never';
  if (options.showFoot === true) {
    showFoot = 'everyPage';
  } else if (options.showFoot === false) {
    showFoot = 'never';
  } else {
    showFoot = options.showFoot ?? 'everyPage';
  }

  let showHead: 'everyPage' | 'firstPage' | 'never';
  if (options.showHead === true) {
    showHead = 'everyPage';
  } else if (options.showHead === false) {
    showHead = 'never';
  } else {
    showHead = options.showHead ?? 'everyPage';
  }

  const useCss = options.useCss ?? false;
  const theme = options.theme || (useCss ? 'plain' : 'striped');

  const horizontalPageBreak: boolean = options.horizontalPageBreak ? true : false;
  const horizontalPageBreakRepeat = options.horizontalPageBreakRepeat ?? null;

  return {
    includeHiddenHtml: options.includeHiddenHtml ?? false,
    useCss,
    theme,
    startY,
    margin,
    pageBreak: options.pageBreak ?? 'auto',
    rowPageBreak: options.rowPageBreak ?? 'auto',
    tableWidth: options.tableWidth ?? 'auto',
    showHead,
    showFoot,
    tableLineWidth: options.tableLineWidth ?? 0,
    tableLineColor: options.tableLineColor ?? 200,
    horizontalPageBreak,
    horizontalPageBreakRepeat,
  };
}

function getStartY(userStartY: number | false | undefined) {
  // const previous = doc.getLastAutoTable();
  // const sf = doc.scaleFactor();
  // const currentPage = doc.pageNumber();

  // let isSamePageAsPreviousTable = false;
  // if (previous && previous.startPageNumber) {
  //   const endingPage = previous.startPageNumber + previous.pageNumber - 1;
  //   isSamePageAsPreviousTable = endingPage === currentPage;
  // }

  // if (typeof userStartY === 'number') {
  //   return userStartY;
  // } else if (userStartY == null || userStartY === false) {
  //   if (isSamePageAsPreviousTable && previous?.finalY != null) {
  //     // Some users had issues with overlapping tables when they used multiple
  //     // tables without setting startY so setting it here to a sensible default.
  //     return previous.finalY + 20 / sf;
  //   }
  // }
  // return null;
  return 0;
}

function parseContent4Input(options: UserOptions) {
  const head = options.head || [];
  const body = options.body || [];
  const foot = options.foot || [];

  const columns = options.columns || parseColumns(head, body, foot);
  return {
    columns,
    head,
    body,
    foot,
  };
}

function parseColumns(head: RowInput[], body: RowInput[], foot: RowInput[]) {
  const firstRow: RowInput = head[0] || body[0] || foot[0] || [];
  const result: ColumnInput[] = [];
  Object.keys(firstRow)
    .filter((key) => key !== '_element')
    .forEach((key) => {
      let colSpan = 1;
      let input: CellInput;
      if (Array.isArray(firstRow)) {
        input = firstRow[parseInt(key)];
      } else {
        input = firstRow[key];
      }
      if (typeof input === 'object' && !Array.isArray(input)) {
        colSpan = input?.colSpan || 1;
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
