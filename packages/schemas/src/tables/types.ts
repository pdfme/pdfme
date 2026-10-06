import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types.js';
import type { BoxDimension } from '../box.js';
import type { Schema } from '@pdfme/common';

export const TABLE_CELL_TYPES = ['text', 'image'] as const;
export type TableCellType = (typeof TABLE_CELL_TYPES)[number];
export const TABLE_IMAGE_HEIGHT_MODES = ['fixed', 'auto'] as const;
export type TableImageHeightMode = (typeof TABLE_IMAGE_HEIGHT_MODES)[number];

export type Spacing = BoxDimension;
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

export type CellSchema = Schema &
  CellStyle & {
    cellType?: TableCellType;
    imageHeightMode?: TableImageHeightMode;
    imageHeight?: number;
    columnIndex?: number;
    rowIndex?: number;
    // Render-only identity of the table being painted. Not stored on the template.
    pickerSchemaKey?: string;
  };

export type TableSchema = Schema & {
  showHead: boolean;
  head: string[];
  headWidthPercentages: number[];
  repeatHead?: boolean;

  tableStyles: {
    borderColor: string;
    borderWidth: number;
  };
  headStyles: CellStyle;
  bodyStyles: CellStyle & { alternateBackgroundColor: string };
  columnStyles: {
    alignment?: { [colIndex: number]: ALIGNMENT };
    cellType?: { [colIndex: number]: TableCellType };
    imageHeightMode?: { [colIndex: number]: TableImageHeightMode };
    imageHeight?: { [colIndex: number]: number };
  };
};

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
  lineWidth: BorderInsets;
  cellWidth: number;
  minCellHeight: number;
  minCellWidth: number;
  cellType?: TableCellType;
  imageHeightMode?: TableImageHeightMode;
  imageHeight?: number;
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
  // Template showHead before a split segment hides the header. Auto image limits
  // use this so planning and drawing stay on the same row height.
  templateShowHead: boolean;
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
