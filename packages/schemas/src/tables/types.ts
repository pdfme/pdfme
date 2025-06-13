import type { ALIGNMENT, Spacing, BaseTextStyle } from '../text/types.js';
import type { Schema } from '@pdfme/common';

export type { Spacing } from '../text/types.js';

export type CellStyle = BaseTextStyle;

export type CellSchema = Schema & CellStyle;

export interface TableSchema extends Schema {
  showHead: boolean;
  head: string[];
  headWidthPercentages: number[];

  tableStyles: {
    borderColor: string;
    borderWidth: number;
  };
  headStyles: CellStyle;
  bodyStyles: CellStyle & { alternateBackgroundColor: string };
  columnStyles: {
    alignment?: { [colIndex: number]: ALIGNMENT };
  };
}

export interface Styles {
  fontName: string | undefined;
  backgroundColor: string;
  textColor: string;
  lineHeight: number;
  characterSpacing: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
  verticalAlignment: 'top' | 'middle' | 'bottom';
  fontSize: number;
  cellPadding: Spacing;
  lineColor: string;
  lineWidth: Spacing;
  cellWidth: number;
  minCellHeight: number;
  minCellWidth: number;
}

export interface TableInput {
  settings: Settings;
  styles: StylesProps;
  content: ContentInput;
}

interface ContentInput {
  body: string[][];
  head: string[][];
  columns: number[];
}

export interface Settings {
  startY: number;
  margin: Spacing;
  tableWidth: number;
  showHead: boolean;
  tableLineWidth: number;
  tableLineColor: string;
}

export interface StylesProps {
  styles: Partial<Styles>;
  headStyles: Partial<Styles>;
  bodyStyles: Partial<Styles>;
  alternateRowStyles: Partial<Styles>;
  columnStyles: { [key: string]: Partial<Styles> };
}

export type Section = 'head' | 'body';
