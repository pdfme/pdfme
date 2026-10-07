import { Schema } from '@pdfme/common';
import { BARCODE_FITS, BARCODE_TYPES } from './constants.js';

export type BarcodeFit = (typeof BARCODE_FITS)[number];

export type BarcodeSchema = Schema & {
  type: (typeof BARCODE_TYPES)[number];
  backgroundColor: string;
  barColor: string;
  textColor?: string;
  includetext?: boolean;
  fit?: BarcodeFit;
};

export type BarcodeTypes = (typeof BARCODE_TYPES)[number];
