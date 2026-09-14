import { Schema } from '@pdfme/common';
import { ALIGNMENT, FONT_WEIGHT, FONT_STYLE } from '../text/types.js';

export interface DateSchema extends Schema {
  format: string;
  fontName?: string;
  fontWeight?: FONT_WEIGHT;
  fontStyle?: FONT_STYLE;
  alignment: ALIGNMENT;
  fontSize: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  locale?: string;
  // Explicitly include these properties from Schema for TypeScript
  width: number;
  height: number;
  name: string;
  type: string;
  content?: string;
}
