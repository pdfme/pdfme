import bwipjs, { ToBufferOptions } from 'bwip-js';
import { BarCodeType } from './type';
import { b64toUint8Array } from './utils';
export const validateBarcodeInput = (type: BarCodeType, input: string) => {
  if (!input) return false;
  if (type === 'qrcode') {
    // 500文字以下
    return input.length < 500;
  }
  if (type === 'japanpost') {
    // 郵便番号は数字(0-9)のみ。住所表示番号は英数字(0-9,A-Z)とハイフン(-)が使用可能です。
    const regexp = /^(\d{7})(\d|[A-Z]|-)+$/;

    return regexp.test(input);
  }
  if (type === 'ean13') {
    // 有効文字は数値(0-9)のみ。チェックデジットを含まない12桁orチェックデジットを含む13桁。
    const regexp = /^\d{12}$|^\d{13}$/;

    return regexp.test(input);
  }
  if (type === 'ean8') {
    // 有効文字は数値(0-9)のみ。チェックデジットを含まない7桁orチェックデジットを含む8桁。
    const regexp = /^\d{7}$|^\d{8}$/;

    return regexp.test(input);
  }
  if (type === 'code39') {
    // 有効文字は数字(0-9)。アルファベット大文字(A-Z)、記号(-.$/+%)、半角スペース。
    const regexp = /^(\d|[A-Z]|\-|\.|\$|\/|\+|\%|\s)+$/;

    return regexp.test(input);
  }
  if (type === 'code128') {
    // 有効文字は漢字、ひらがな、カタカナ以外。
    // https://qiita.com/graminume/items/2ac8dd9c32277fa9da64
    return !input.match(
      /([\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf]|[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝〜])+/
    );
  }
  if (type === 'nw7') {
    // 有効文字はNW-7は数字(0-9)と記号(-.$:/+)。
    // スタートコード／ストップコードとして、コードの始まりと終わりはアルファベット(A-D)のいずれかを使用してください。
    const regexp = /^[A-Da-d]([0-9\-\.\$\:\/\+])+[A-Da-d]$/;

    return regexp.test(input);
  }
  if (type === 'itf14') {
    // 有効文字は数値(0-9)のみ。 チェックデジットを含まない13桁orチェックデジットを含む14桁。
    const regexp = /^\d{13}$|^\d{14}$/;

    return regexp.test(input);
  }
  if (type === 'upca') {
    // 有効文字は数値(0-9)のみ。 チェックデジットを含まない11桁orチェックデジットを含む12桁。
    const regexp = /^\d{11}$|^\d{12}$/;

    return regexp.test(input);
  }
  if (type === 'upce') {
    // 有効文字は数値(0-9)のみ。 1桁目に指定できる数字(ナンバーシステムキャラクタ)は0のみ。
    // チェックデジットを含まない7桁orチェックデジットを含む8桁。
    const regexp = /^0(\d{6}$|\d{7}$)/;

    return regexp.test(input);
  }

  return false;
};

export const createBarCode = ({
  type,
  input,
  width,
  height,
  backgroundColor,
}: {
  type: BarCodeType;
  input: string;
  width: number;
  height: number;
  backgroundColor?: string;
}): Promise<Buffer> => {
  const bwipjsArg: ToBufferOptions = {
    bcid: type === 'nw7' ? 'rationalizedCodabar' : type,
    text: input,
    scale: 5,
    width,
    height,
    includetext: true,
  };
  if (backgroundColor) {
    bwipjsArg.backgroundcolor = backgroundColor;
  }

  if (bwipjs.toCanvas) {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, bwipjsArg);
    const dataUrl = canvas.toDataURL('image/png');
    return Promise.resolve(b64toUint8Array(dataUrl).buffer as Buffer);
  }
  return bwipjs.toBuffer(bwipjsArg);
};
