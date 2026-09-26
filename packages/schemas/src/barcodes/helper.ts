import { b64toUint8Array, isHexValid } from '@pdfme/common';
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
    const regexp = /^(\d|[A-Z]|[-.$/+%]|\s)+$/;
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
    const regexp = /^[A-Da-d]([0-9.$:/+-])+[A-Da-d]$/;
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

/**
 * Barcode colors historically accept bwip-js style hex without a leading '#';
 * CSS and pdfme's color utils require the '#', so add it when missing.
 */
export const ensureHexColorHash = (color: string | undefined) =>
  color && !color.startsWith('#') && isHexValid(`#${color}`) ? `#${color}` : color;

export type BarcodeRenderRuntime = 'document-canvas' | 'offscreencanvas' | 'node-buffer';

type CanvasLike = HTMLCanvasElement | OffscreenCanvas;

type BwipJsRenderer = {
  toCanvas?: (canvas: CanvasLike, options: RenderOptions) => void;
  toBuffer?: (options: RenderOptions) => Promise<Buffer>;
  toSVG?: (options: RenderOptions) => string;
};

const getBwipJsRenderer = () => bwipjs as unknown as BwipJsRenderer;

const getDocument = () => (globalThis as { document?: Document }).document;

const getOffscreenCanvasCtor = () =>
  (globalThis as { OffscreenCanvas?: typeof OffscreenCanvas }).OffscreenCanvas;

/**
 * Pick a barcode renderer from capabilities, not `typeof window`.
 * Browser Workers have neither `window` nor Node's `bwip-js.toBuffer()`.
 * OffscreenCanvas without `toCanvas()` (Node bwip-js export) falls back to `toBuffer()`.
 */
export const resolveBarcodeRenderRuntime = (): BarcodeRenderRuntime => {
  const doc = getDocument();
  const renderer = getBwipJsRenderer();
  if (doc && typeof doc.createElement === 'function') {
    return 'document-canvas';
  }

  if (typeof getOffscreenCanvasCtor() === 'function' && typeof renderer.toCanvas === 'function') {
    return 'offscreencanvas';
  }

  if (typeof renderer.toBuffer === 'function') {
    return 'node-buffer';
  }

  throw new Error(
    '[@pdfme/schemas] Barcode rendering requires a document canvas, OffscreenCanvas, or bwip-js toBuffer().',
  );
};

const pngBufferFromDataUrl = (dataUrl: string): Buffer =>
  Buffer.from(b64toUint8Array(dataUrl).buffer);

const pngBufferFromBlob = async (blob: Blob): Promise<Buffer> =>
  Buffer.from(await blob.arrayBuffer());

const renderBarcodeToCanvas = (canvas: CanvasLike, options: RenderOptions) => {
  const toCanvas = getBwipJsRenderer().toCanvas;
  if (typeof toCanvas !== 'function') {
    throw new Error('[@pdfme/schemas] bwip-js toCanvas() is not available in this environment.');
  }
  toCanvas(canvas, options);
};

const renderBarcodeToDocumentCanvas = (options: RenderOptions): Buffer => {
  const canvas = getDocument()!.createElement('canvas');
  renderBarcodeToCanvas(canvas, options);
  return pngBufferFromDataUrl(canvas.toDataURL('image/png'));
};

const renderBarcodeToOffscreenCanvas = async (options: RenderOptions): Promise<Buffer> => {
  const OffscreenCanvasCtor = getOffscreenCanvasCtor();
  if (typeof OffscreenCanvasCtor !== 'function') {
    throw new Error('[@pdfme/schemas] OffscreenCanvas is not available in this environment.');
  }
  const canvas = new OffscreenCanvasCtor(1, 1);
  renderBarcodeToCanvas(canvas, options);
  return pngBufferFromBlob(await canvas.convertToBlob({ type: 'image/png' }));
};

const renderBarcodeToNodeBuffer = async (options: RenderOptions): Promise<Buffer> => {
  const toBuffer = getBwipJsRenderer().toBuffer;
  if (typeof toBuffer !== 'function') {
    throw new Error('[@pdfme/schemas] bwip-js toBuffer() is not available in this environment.');
  }
  return toBuffer(options);
};

type CreateBarCodeArg = {
  type: BarcodeTypes;
  input: string;
  width: number;
  height: number;
  backgroundColor?: string;
  barColor?: string;
  textColor?: string;
  includetext?: boolean;
};

const createBwipJsRenderOptions = (arg: CreateBarCodeArg): RenderOptions => {
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

  return bwipjsArg;
};

export const createBarCodeSvg = (arg: CreateBarCodeArg): string => {
  const toSVG = getBwipJsRenderer().toSVG;
  if (typeof toSVG !== 'function') {
    throw new Error('[@pdfme/schemas] bwip-js toSVG() is not available in this environment.');
  }

  const defaultFill = `#${mapHexColorForBwipJsLib(arg.barColor)}`;
  const svg = toSVG(createBwipJsRenderOptions(arg)).replace(
    /<svg\b(?![^>]*\sfill=)/,
    `<svg fill="${defaultFill}"`,
  );
  if (/<image\b/i.test(svg)) {
    throw new Error(
      `[@pdfme/schemas] bwip-js emitted an embedded image for ${arg.type}; vector barcode PDF rendering requires path-based SVG.`,
    );
  }

  return svg;
};

export const createBarCode = async (arg: CreateBarCodeArg): Promise<Buffer> => {
  const bwipjsArg = createBwipJsRenderOptions(arg);
  const runtime = resolveBarcodeRenderRuntime();
  if (runtime === 'document-canvas') {
    return renderBarcodeToDocumentCanvas(bwipjsArg);
  }
  if (runtime === 'offscreencanvas') {
    return renderBarcodeToOffscreenCanvas(bwipjsArg);
  }
  return renderBarcodeToNodeBuffer(bwipjsArg);
};
