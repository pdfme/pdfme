import type { Schema } from '@pdfme/common/dist/esm/index.js';
import { BARCODE_TYPES } from './constants.js';

export interface BarcodeSchema extends Schema {
  type: (typeof BARCODE_TYPES)[number];
  backgroundColor: string;
  barColor: string;
  textColor?: string;
  includetext?: boolean;
  width: number;
  height: number;
  position: { x: number; y: number };
  rotate?: number;
  opacity?: number;
  name?: string;
}

export type BarcodeTypes = (typeof BARCODE_TYPES)[number];
