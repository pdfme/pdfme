import type { Schema } from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';

export type ALIGNMENT = 'left' | 'center' | 'right' | 'justify';
export type VERTICAL_ALIGNMENT = 'top' | 'middle' | 'bottom';
export type DYNAMIC_FONT_SIZE_FIT = 'horizontal' | 'vertical';

export type FontWidthCalcValues = {
  font: FontKitFont;
  fontSize: number;
  characterSpacing: number;
  boxWidthInPt: number;
};

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TextSegment {
  content: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  color?: string;
  backgroundColor?: string;
}

export interface TextLine {
  segments: TextSegment[];
  heightInMm: number;
}

export interface ListItem {
  level: number;
  ordered: boolean;
  orderNumber?: number;
  segments: TextSegment[];
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface TextBlock {
  type: 'paragraph' | 'heading' | 'code' | 'blockquote' | 'table' | 'list';
  level?: HeadingLevel;
  language?: string;
  lines: TextLine[];
  rawText?: string;
  tableData?: TableData;
  listItems?: ListItem[];
}

export interface TextSchema extends Schema {
  fontName?: string;
  alignment: ALIGNMENT;
  verticalAlignment: VERTICAL_ALIGNMENT;
  fontSize: number;
  lineHeight: number;
  strikethrough?: boolean;
  underline?: boolean;
  characterSpacing: number;
  dynamicFontSize?: {
    min: number;
    max: number;
    fit: DYNAMIC_FONT_SIZE_FIT;
  };
  fontColor: string;
  backgroundColor: string;
  richText?: boolean;
  __lineRange?: { start: number; end: number };
  __isSplit?: boolean;
}
