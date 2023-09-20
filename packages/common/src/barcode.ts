import { b64toUint8Array, } from './helper';
import { BarCodeType, } from './type';
import bwipjs, { ToBufferOptions } from 'bwip-js';
import { Buffer } from 'buffer';

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

export const createBarCode = async (arg: {
  type: BarCodeType;
  input: string;
  width: number;
  height: number;
  backgroundcolor?: string;
  barcolor?: string;
  textcolor?: string;
}): Promise<Buffer> => {
  const { type, input, width, height, backgroundcolor, barcolor, textcolor } = arg;
  const bcid = barCodeType2Bcid(type);
  const includetext = true;
  const scale = 5;
  const bwipjsArg: ToBufferOptions = { bcid, text: input, width, height, scale, includetext };

  if (backgroundcolor) bwipjsArg.backgroundcolor = mapHexColorForBwipJsLib(backgroundcolor);
  if (barcolor) bwipjsArg.barcolor = mapHexColorForBwipJsLib(barcolor);
  if (textcolor) bwipjsArg.textcolor = mapHexColorForBwipJsLib(textcolor);

  let res: Buffer;

  if (typeof window !== 'undefined') {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, bwipjsArg);
    const dataUrl = canvas.toDataURL('image/png');
    res = b64toUint8Array(dataUrl).buffer as Buffer;
  } else {
    res = await bwipjs.toBuffer(bwipjsArg);
  }

  return res;
};


