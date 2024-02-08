import type { Font as FontKitFont } from 'fontkit';
import { splitTextToSize, getFontKitFont, widthOfTextAtSize } from '../text/helper';
import {
  Schema,
  isBlankPdf,
  BasePdf,
  CommonOptions,
  PDFRenderProps,
  getDefaultFont,
  mm2pt,
  getFallbackFontName,
  pt2mm,
} from '@pdfme/common';
import type {
  TableSchema,
  CellStyle,
  Styles,
  Spacing,
  TableInput,
  Settings,
  StylesProps,
  Section,
} from './types';
import { cloneDeep } from '../utils';
import { Cell, Column, Row, Table } from './classes';

type StyleProp = 'styles' | 'headStyles' | 'bodyStyles' | 'alternateRowStyles' | 'columnStyles';

interface CreateTableArgs {
  schema: Schema;
  basePdf: BasePdf;
  options: CommonOptions;
  _cache: Map<any, any>;
}

interface UserOptions {
  startY: number;
  tableWidth: number;
  margin: Spacing;
  showHead: boolean;
  tableLineWidth?: number;
  tableLineColor?: string;
  head?: string[][];
  body?: string[][];

  styles?: Partial<Styles>;
  bodyStyles?: Partial<Styles>;
  headStyles?: Partial<Styles>;
  alternateRowStyles?: Partial<Styles>;
  columnStyles?: {
    [key: string]: Partial<Styles>;
  };
}

async function calculateWidths(
  table: Table,
  getFontKitFontByFontName: (fontName: string | undefined) => Promise<FontKitFont>
) {
  await calculate(table, getFontKitFontByFontName);

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
  getFontKitFontByFontName: (fontName: string | undefined) => Promise<FontKitFont>
) {
  for (const row of table.allRows()) {
    for (const column of table.columns) {
      const cell = row.cells[column.index];
      if (!cell) continue;

      const hPadding = cell.padding('right') + cell.padding('left');
      const fontKitFont = await getFontKitFontByFontName(cell.styles.fontName);

      cell.contentWidth = getStringWidth(cell, fontKitFont) + hPadding;

      const longestWordWidth = getStringWidth(
        Object.assign(cell, { text: cell.text.join(' ').split(/\s+/) }),
        fontKitFont
      );
      cell.minReadableWidth = longestWordWidth + hPadding;

      cell.minWidth = cell.styles.cellWidth;
      cell.wrappedWidth = cell.styles.cellWidth;
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
        const columnStyles = table.styles.columnStyles[column.index] || {};
        const cellWidth = columnStyles.cellWidth || columnStyles.minCellWidth;
        if (cellWidth) {
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

function parseContent4Table(input: TableInput, fallbackFontName: string) {
  const content = input.content;
  const columns = content.columns.map((index) => new Column(index));
  const styles = input.styles;
  return {
    columns,
    head: parseSection('head', content.head, columns, styles, fallbackFontName),
    body: parseSection('body', content.body, columns, styles, fallbackFontName),
  };
}

function parseSection(
  sectionName: Section,
  sectionRows: string[][],
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
            rawCell = rawRow[column.index];
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

  const colStyles = styles.columnStyles[column.index] || styles.columnStyles[column.index] || {};

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

function parseSettings(options: UserOptions): Settings {
  return {
    startY: options.startY,
    margin: options.margin,
    tableWidth: options.tableWidth,
    showHead: options.showHead,
    tableLineWidth: options.tableLineWidth ?? 0,
    tableLineColor: options.tableLineColor ?? '',
  };
}

function parseContent4Input(options: UserOptions) {
  const head = options.head || [];
  const body = options.body || [];
  const columns = (head[0] || body[0] || []).map((_, index) => index);
  return { columns, head, body };
}

function mapCellStyle(style: CellStyle): Partial<Styles> {
  return {
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
  };
}

function getTableOptions(schema: TableSchema, body: string[][]): UserOptions {
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
    showHead: schema.showHead,
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
}

function createTableWithAvailableHeight(
  tableBody: Row[],
  availableHeight: number,
  args: CreateTableArgs
) {
  let limit = availableHeight;
  const newTableBody: string[][] = [];
  let index = 0;
  while (limit > 0 && index < tableBody.length) {
    const row = tableBody.slice(0, index + 1).pop();
    if (!row) break;
    const rowHeight = row.height;
    if (limit - rowHeight < 0) {
      break;
    }
    newTableBody.push(row.raw);
    limit -= rowHeight;
    index++;
  }
  return createSingleTable(newTableBody, args);
}

function parseInput(schema: TableSchema, body: string[][]): TableInput {
  const options = getTableOptions(schema, body);
  const styles = parseStyles(options);
  const settings = parseSettings(options);
  const content = parseContent4Input(options);

  return { content, styles, settings };
}
export async function createSingleTable(body: string[][], args: CreateTableArgs) {
  const { options, _cache, basePdf } = args;
  if (!isBlankPdf(basePdf)) throw new Error('[@pdfme/schema/table] Blank PDF is not supported');

  const input = parseInput(args.schema as TableSchema, body);

  const font = options.font || getDefaultFont();

  const getFontKitFontByFontName = (fontName: string | undefined) =>
    getFontKitFont(fontName, font, _cache);
  const fallbackFontName = getFallbackFontName(font);

  const content = parseContent4Table(input, fallbackFontName);

  // TODO ここから。calculateWidthsをテーブルのコンストラクターに移動する
  const table = new Table(input, content);
  await calculateWidths(table, getFontKitFontByFontName);
  return table;
}

export async function createMultiTables(body: string[][], args: CreateTableArgs) {
  const { basePdf, schema } = args;

  if (!isBlankPdf(basePdf)) throw new Error('[@pdfme/schema/table] Blank PDF is not supported');
  const pageHeight = basePdf.height;
  const paddingBottom = basePdf.padding[2];
  const availableHeight = pageHeight - paddingBottom - schema.position.y;
  const table = await createSingleTable(body, args);

  if (table.getHeight() <= availableHeight) {
    return [table];
  }

  const firstTable = await createTableWithAvailableHeight(
    table.body,
    availableHeight - table.getHeadHeight(),
    args
  );
  const tables: Table[] = [firstTable];

  const bodyForRestTables = table.body.slice(firstTable.body.length);
  const paddingTop = basePdf.padding[0];
  const pageAvailableHeight = pageHeight - paddingTop - paddingBottom;

  const _schema = cloneDeep(schema);
  _schema.showHead = false;
  _schema.position.y = paddingTop;
  args.schema = _schema;

  const secondTable = await createTableWithAvailableHeight(
    bodyForRestTables,
    pageAvailableHeight,
    args
  );
  tables.push(secondTable);

  // TODO 現在は2つまでしか対応していない
  return tables;
}
