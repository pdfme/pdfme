import { TextSchema, ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types';

export interface DateSchema extends TextSchema {
  format: string;
  fontName?: string;
  alignment: ALIGNMENT;
  verticalAlignment: VERTICAL_ALIGNMENT;
  fontSize: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
}
