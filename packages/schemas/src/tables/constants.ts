import type { TableImageHeightMode } from './types.js';

export const DEFAULT_TABLE_IMAGE_HEIGHT = 20;
export const DEFAULT_TABLE_IMAGE_HEIGHT_MODE: TableImageHeightMode = 'fixed';
// PNG and JPEG data URLs only. gif/webp/svg/http and bare strings are not images.
export const TABLE_IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g);base64,/i;
// Page breaks keep 0.5mm of slack. The auto cap is larger so a row at the limit
// is not flush with that check, where float error reads an exact fit as overflow.
export const TABLE_IMAGE_AUTO_SAFETY_MARGIN = 1;
