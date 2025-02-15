import { Schema } from '@pdfme/common/dist/esm/index.js';
import { ALIGNMENT } from '../text/types.js';

export interface DateSchema extends Schema {
  [key: string]: unknown;
  type: 'date' | 'time' | 'dateTime';
  name: string;
  content: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  rotate?: number;
  opacity?: number;
  readOnly?: boolean;
  required?: boolean;
  __bodyRange?: { start: number; end?: number };
  __isSplit?: boolean;
  format: string;
  fontName?: string;
  alignment: ALIGNMENT;
  fontSize: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  locale?: string;
}
