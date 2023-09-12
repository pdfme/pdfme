import { BarCodeType } from './type';

/**
 * The bwip.js lib has a different name for nw7 type barcodes
 */
export const barCodeType2Bcid = (type: BarCodeType) =>
  type === 'nw7' ? 'rationalizedCodabar' : type;

/**
 *  Strip hash from the beginning of HTML hex color codes for the bwip.js lib
 */
export const mapHexColorForBwipJsLib = (color: string | undefined, fallback?: string) =>
  color ? color.replace('#', '') : fallback ? fallback.replace('#', '') : '000000';
