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

// Matrix/stacked symbologies whose modules must not be distorted: rendered at their
// intrinsic aspect ratio and letterboxed into the box. 1D symbologies stretch freely.
export const ASPECT_RATIO_LOCKED_BARCODE_TYPES = ['qrcode', 'gs1datamatrix', 'pdf417'] as const;
