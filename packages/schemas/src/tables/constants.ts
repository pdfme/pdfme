import type { TableImageHeightMode } from './types.js';

export const DEFAULT_TABLE_IMAGE_HEIGHT = 20;
export const DEFAULT_TABLE_IMAGE_HEIGHT_MODE: TableImageHeightMode = 'fixed';
// PNG and JPEG data URLs only. gif/webp/svg/http and bare strings are not images.
export const TABLE_IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g);base64,/i;
// Same slack dynamic page breaks use, so a capped auto row still fits with the header.
export const TABLE_IMAGE_AUTO_SAFETY_MARGIN = 0.5;
