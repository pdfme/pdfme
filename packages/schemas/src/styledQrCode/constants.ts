export const DEFAULT_STYLED_QR_CODE_BG_COLOR = '#ffffff';
export const DEFAULT_STYLED_QR_CODE_DOT_COLOR = '#000000';
export const DEFAULT_STYLED_QR_CODE_CORNER_COLOR = '#000000';
export const DEFAULT_STYLED_QR_CODE_IMAGE_MARGIN = 20;
export const DEFAULT_STYLED_QR_CODE_ERROR_CORRECTION_LEVEL = 'M';

export const DOT_TYPES = [
  'square',
  'dots',
  'rounded',
  'extra-rounded',
  'classy',
  'classy-rounded',
] as const;

export const CORNER_SQUARE_TYPES = [
  'square',
  'extra-rounded',
  'dot',
  'dots',
  'rounded',
  'classy',
  'classy-rounded',
] as const;

export const CORNER_DOT_TYPES = [
  'square',
  'dot',
  'dots',
  'rounded',
  'extra-rounded',
  'classy',
  'classy-rounded',
] as const;

export const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const;

// Gradient defaults
export const DEFAULT_GRADIENT_START_OFFSET = 0.2;
export const DEFAULT_GRADIENT_END_OFFSET = 0.8;
export const DEFAULT_NEW_COLOR_STOP_OFFSET = 0.2;

// UI sizes
export const GRADIENT_SLIDER_HEIGHT = 30;
export const COLOR_SWATCH_SIZE = 20;
export const TRIANGLE_BORDER_SIZE = 7.2;
export const TRIANGLE_HEIGHT = 9.6;
export const DELETE_BUTTON_SIZE = 14;

// Validation
export const MAX_QR_CONTENT_LENGTH = 500;
export const MAX_IMAGE_SIZE_MB = 2;

