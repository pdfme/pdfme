import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types';
import type { Schema } from '@pdfme/common';

export type Spacing = { top: number; right: number; bottom: number; left: number };
type BorderInsets = Spacing;
type BoxDimensions = Spacing;

export interface CellStyle {
  fontName?: string;
  alignment: ALIGNMENT;
  verticalAlignment: VERTICAL_ALIGNMENT;
  fontSize: number;
  lineHeight: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: BoxDimensions;
  padding: BoxDimensions;
}

export type CellSchema = Schema & CellStyle;

export interface TableSchema extends Schema {
  showHead: boolean;
  head: string[];
  headWidthPercentages: number[];

  __bodyRange?: { start: number; end?: number };

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
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'middle' | 'bottom';
  fontSize: number;
  cellPadding: Spacing;
  lineColor: string;
  lineWidth: BorderInsets;
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
