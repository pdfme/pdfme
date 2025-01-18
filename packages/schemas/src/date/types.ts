import { Schema } from '@pdfme/common';
import { ALIGNMENT } from '../text/types';

export interface DateSchema extends Schema {
  format: string;
  fontName?: string;
  alignment: ALIGNMENT;
  fontSize: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  locale?: string;
}
