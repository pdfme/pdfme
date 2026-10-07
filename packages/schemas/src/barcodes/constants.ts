export const BARCODE_TYPES = [
  'qrcode',
  'japanpost',
  'ean13',
  'ean8',
  'code39',
  'code128',
  'nw7',
  'itf14',
  'upca',
  'upce',
  'gs1datamatrix',
  'pdf417',
] as const;

export const DEFAULT_BARCODE_BG_COLOR = '#ffffff';

export const DEFAULT_BARCODE_COLOR = '#000000';

export const DEFAULT_BARCODE_INCLUDETEXT = true;

export const BARCODE_FITS = ['stretch', 'contain'] as const;
export const DEFAULT_BARCODE_FIT = 'stretch';
// Matrix/stacked symbologies whose modules must stay square → new fields default to 'contain'.
export const BARCODE_2D_TYPES = ['qrcode', 'gs1datamatrix', 'pdf417'] as const;
