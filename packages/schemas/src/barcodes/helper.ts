import { b64toUint8Array } from '@pdfme/common';
import bwipjs, { RenderOptions } from 'bwip-js';
import { Buffer } from 'buffer';
import { BARCODE_TYPES, DEFAULT_BARCODE_INCLUDETEXT } from './constants.js';
import { BarcodeTypes } from './types.js';

// GTIN-13, GTIN-8, GTIN-12, GTIN-14
const validateCheckDigit = (input: string, checkDigitPos: number) => {
  let passCheckDigit = true;

  if (input.length === checkDigitPos) {
    const ds = input.slice(0, -1).replace(/[^0-9]/g, '');
    let sum = 0;
    let odd = 1;
    for (let i = ds.length - 1; i > -1; i -= 1) {
      sum += Number(ds[i]) * (odd ? 3 : 1);
      odd ^= 1;
      if (sum > 0xffffffffffff) {
        // ~2^48 at max
        sum %= 10;
      }
    }
    passCheckDigit = String(10 - (sum % 10)).slice(-1) === input.slice(-1);
  }

  return passCheckDigit;
};
export const validateBarcodeInput = (type: BarcodeTypes, input: string) => {
  if (!input) return false;

  if (!BARCODE_TYPES.includes(type)) return false;

  if (type === 'qrcode') {
    // Up to 500 characters
    return input.length < 500;
  }
  if (type === 'japanpost') {
    // For Japan Post: Postal codes must be digits (0-9) only.
    // Address display numbers can use alphanumeric characters (0-9, A-Z) and hyphen (-).
    const regexp = /^(\d{7})(\d|[A-Z]|-)+$/;
    return regexp.test(input);
  }
  if (type === 'ean13') {
    // For EAN-13: Valid characters are digits (0-9) only.
    // Either 12 digits (without check digit) or 13 digits (with check digit).
    const regexp = /^\d{12}$|^\d{13}$/;
    return regexp.test(input) && validateCheckDigit(input, 13);
  }
  if (type === 'ean8') {
    // For EAN-8: Valid characters are digits (0-9) only.
    // Either 7 digits (without check digit) or 8 digits (with check digit).
    const regexp = /^\d{7}$|^\d{8}$/;
    return regexp.test(input) && validateCheckDigit(input, 8);
  }
  if (type === 'code39') {
    // For Code39: Valid characters are digits (0-9), uppercase alphabets (A-Z),
    // symbols (-, ., $, /, +, %), and space.
    const regexp = /^(\d|[A-Z]|\-|\.|\$|\/|\+|\%|\s)+$/;
    return regexp.test(input);
  }
  if (type === 'code128') {
    // For Code128: Valid characters are all except Kanji, Hiragana, and Katakana.
    // https://qiita.com/graminume/items/2ac8dd9c32277fa9da64
    return !input.match(
      /([\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf]|[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝〜　])+/,
    );
  }
  if (type === 'nw7') {
    // For NW-7: Valid characters are digits (0-9) and symbols (-, ., $, :, /, +).
    // The first and last characters must be one of the alphabets A-D (start/stop codes).
    const regexp = /^[A-Da-d]([0-9\-\.\$\:\/\+])+[A-Da-d]$/;
    return regexp.test(input);
  }
  if (type === 'itf14') {
    // For ITF-14: Valid characters are digits (0-9) only.
    // Either 13 digits (without check digit) or 14 digits (with check digit).
    const regexp = /^\d{13}$|^\d{14}$/;
    return regexp.test(input) && validateCheckDigit(input, 14);
  }
  if (type === 'upca') {
    // For UPCA: Valid characters are digits (0-9) only.
    // Either 11 digits (without check digit) or 12 digits (with check digit).
    const regexp = /^\d{11}$|^\d{12}$/;
    return regexp.test(input) && validateCheckDigit(input, 12);
  }
  if (type === 'upce') {
    // For UPCE: Valid characters are digits (0-9) only.
    // The first digit (number system character) must be 0.
    // Either 7 digits (without check digit) or 8 digits (with check digit).
    const regexp = /^0(\d{6}$|\d{7}$)/;
    return regexp.test(input) && validateCheckDigit(input, 8);
  }
  if (type === 'gs1datamatrix') {
    let ret = false;
    // Find the GTIN application identifier: regex for "(01)" and the digits following it until another "(".
    const regexp = /\((01)\)(\d*)(\(|$)/;
    let res = input.match(regexp);
    if (
      res != null &&
      input.length <= 52 && // 52 is the max length of a GS1 DataMatrix barcode before bwip-js throws an error
      res[1] === '01' &&
      (res[2].length === 14 || res[2].length === 8 || res[2].length === 12 || res[2].length === 13)
    ) {
      let gtin = res[2];
      ret = validateCheckDigit(gtin, gtin.length);
    }
    return ret;
  }
  if (type === 'pdf417') {
    // PDF417 can encode a wide range of characters,
    // but considering performance and library limitations, the maximum number of characters is limited (up to 1000 characters here).
    return input.length > 0 && input.length <= 1000;
  }

  return false;
};

/**
 * The bwip.js lib has a different name for nw7 type barcodes
 */
export const barCodeType2Bcid = (type: BarcodeTypes) =>
  type === 'nw7' ? 'rationalizedCodabar' : type;

/**
 *  Strip hash from the beginning of HTML hex color codes for the bwip.js lib
 */
export const mapHexColorForBwipJsLib = (color: string | undefined, fallback?: string) =>
  color ? color.replace('#', '') : fallback ? fallback.replace('#', '') : '000000';

export const createBarCode = async (arg: {
  type: BarcodeTypes;
  input: string;
  width: number;
  height: number;
  backgroundColor?: string;
  barColor?: string;
  textColor?: string;
  includetext?: boolean;
}): Promise<Buffer> => {
  const {
    type,
    input,
    width,
    height,
    backgroundColor,
    barColor,
    textColor,
    includetext = DEFAULT_BARCODE_INCLUDETEXT,
  } = arg;

  const bcid = barCodeType2Bcid(type);
  const scale = 5;
  const bwipjsArg: RenderOptions = {
    bcid,
    text: input,
    width,
    height,
    scale,
    includetext,
    textxalign: 'center',
  };

  if (backgroundColor) bwipjsArg.backgroundcolor = mapHexColorForBwipJsLib(backgroundColor);
  if (barColor) bwipjsArg.barcolor = mapHexColorForBwipJsLib(barColor);
  if (textColor) bwipjsArg.textcolor = mapHexColorForBwipJsLib(textColor);

  let res: Buffer;

  if (typeof window !== 'undefined') {
    const canvas = document.createElement('canvas');
    // Use a type assertion to safely call toCanvas
    const bwipjsModule = bwipjs as unknown as {
      toCanvas(canvas: HTMLCanvasElement, options: RenderOptions): void;
    };
    bwipjsModule.toCanvas(canvas, bwipjsArg);
    const dataUrl = canvas.toDataURL('image/png');
    res = Buffer.from(b64toUint8Array(dataUrl).buffer);
  } else {
    // Use a type assertion to safely call toBuffer
    const bwipjsModule = bwipjs as unknown as {
      toBuffer(options: RenderOptions): Promise<Buffer>;
    };
    res = await bwipjsModule.toBuffer(bwipjsArg);
  }

  return res;
};
