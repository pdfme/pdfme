import { Schema } from '@pdfme/common';
import { BARCODE_TYPES } from './constants.js';

export interface BarcodeSchema extends Schema {
  type: (typeof BARCODE_TYPES)[number];
  backgroundColor: string;
  barColor: string;
  textColor?: string;
  includetext?: boolean;
  // Text controls for human-readable text (when supported by symbology)
  alttext?: string;
  textxalign?: 'left' | 'center' | 'right';
  textyalign?: 'above' | 'below';
  textsize?: number;
  textyoffset?: number;

  // Rendering controls
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  padding?: number;
  paddingtop?: number;
  paddingleft?: number;
  paddingright?: number;
  paddingbottom?: number;
  inkspread?: number;
  showBorder?: boolean; // when false → borderwidth = 0
  borderwidth?: number;
  bordercolor?: string;
  format?: 'png' | 'svg'; // output format used mainly in PDF rendering

  // QR specific controls
  eclevel?: 'L' | 'M' | 'Q' | 'H';
  version?: number; // 1..40
  mask?: number; // 0..7
  qzone?: number; // quiet zone in modules

  // PDF417 controls (optional)
  columns?: number;
  rows?: number;
  compact?: boolean;
}

export type BarcodeTypes = (typeof BARCODE_TYPES)[number];
