import { pt2mm } from '@pdfme/common';
import type { Styles, TableInput, Settings, Section, StylesProps } from './types';

type ContentSettings = {
  body: Row[];
  head: Row[];
  columns: Column[];
};

export class Cell {
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
    const vPadding = this.padding('top') + this.padding('bottom');
    const height = lineCount * lineHeight + vPadding;
    return Math.max(height, this.styles.minCellHeight);
  }

  padding(name: 'top' | 'bottom' | 'left' | 'right') {
    return this.styles.cellPadding[name];
  }
}

export class Column {
  index: number;
  wrappedWidth = 0;
  minReadableWidth = 0;
  minWidth = 0;
  width = 0;

  constructor(index: number) {
    this.index = index;
  }

  getMaxCustomCellWidth(table: Table) {
    let max = 0;
    for (const row of table.allRows()) {
      const cell: Cell = row.cells[this.index];
      max = Math.max(max, cell.styles.cellWidth);
    }
    return max;
  }
}

export class Row {
  readonly raw: string[];
  readonly index: number;
  readonly section: Section;
  readonly cells: { [key: string]: Cell };

  height = 0;

  constructor(raw: string[], index: number, section: Section, cells: { [key: string]: Cell }) {
    this.raw = raw;
    this.index = index;
    this.section = section;
    this.cells = cells;
  }

  getMaxCellHeight(columns: Column[]) {
    return columns.reduce((acc, column) => Math.max(acc, this.cells[column.index]?.height || 0), 0);
  }

  getMinimumRowHeight(columns: Column[]) {
    return columns.reduce((acc: number, column: Column) => {
      const cell = this.cells[column.index];
      if (!cell) return 0;
      const vPadding = cell.padding('top') + cell.padding('bottom');
      const oneRowHeight = vPadding + cell.styles.lineHeight;
      return oneRowHeight > acc ? oneRowHeight : acc;
    }, 0);
  }
}

export class Table {
  readonly settings: Settings;
  readonly styles: StylesProps;

  readonly columns: Column[];
  readonly head: Row[];
  readonly body: Row[];

  constructor(input: TableInput, content: ContentSettings) {
    this.settings = input.settings;
    this.styles = input.styles;

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

  getWidth() {
    return this.settings.tableWidth;
  }

  getHeight() {
    return (this.settings.showHead ? this.getHeadHeight() : 0) + this.getBodyHeight();
  }
}
