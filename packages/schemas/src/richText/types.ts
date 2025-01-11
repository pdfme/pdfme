import type { Schema } from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';

export type ALIGNMENT = 'left' | 'center' | 'right';
export type VERTICAL_ALIGNMENT = 'top' | 'middle' | 'bottom';
export type DYNAMIC_FONT_SIZE_FIT = 'horizontal' | 'vertical';

export type RichTextLetterStyle = {
  fontSize?: number;
  lineHeight?: number;
  characterSpacing?: number;
  opacity?: number;
  fontName?: string;
  fontColor?: string;
  backgroundColor?: string;
  underline?: boolean;
  strikethrough?: boolean;
};

export type RichTextLetterStyleHandler = {
  fontSize?: { op: 'inc'; value: number } | { op: 'dec'; value: number } | number;
  lineHeight?: { op: 'inc'; value: number } | { op: 'dec'; value: number } | number;
  characterSpacing?: { op: 'inc'; value: number } | { op: 'dec'; value: number } | number;
  opacity?: { op: 'inc'; value: number } | { op: 'dec'; value: number } | number;
  fontName?: string;
  fontColor?: string | 'reset';
  backgroundColor?: string | 'reset';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

export interface RichTextSchema extends Schema {
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
  opacity?: number;
}

// New code -----------------------------------

export type RichTextLetter = {
  letter: string;
  style: RichTextLetterStyle;
};

export type FontWidthCalcValues = {
  font: FontKitFont;
  fontSize: number;
  characterSpacing: number;
  boxWidthInPt: number;
};
