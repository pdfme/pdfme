import { Schema } from '@pdfme/common';
import { BARCODE_TYPES } from './constants.js';

export interface BarcodeSchema extends Schema {
  type: (typeof BARCODE_TYPES)[number];
  backgroundColor: string;
  barColor: string;
  textColor?: string;
  includetext?: boolean;
}

export type BarcodeTypes = (typeof BARCODE_TYPES)[number];
