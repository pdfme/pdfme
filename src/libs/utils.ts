import { nanoid } from 'nanoid';
import base64url from 'base64url';
import _set from 'lodash.set';

export const uuid = nanoid;

export const set = _set;

export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const uniq = <T>(array: Array<T>) => Array.from(new Set(array));

const shift = (number: number, precision: number, reverseShift: boolean) => {
  if (reverseShift) {
    precision = -precision;
  }
  const numArray = `${number}`.split('e');

  return Number(`${numArray[0]}e${numArray[1] ? Number(numArray[1]) + precision : precision}`);
};

export const round = (number: number, precision: number) => {
  return shift(Math.round(shift(number, precision, false)), precision, true);
};

export const b64toUint8Array = (base64: string) => {
  if (typeof window !== 'undefined') {
    try {
      const byteString = window.atob(base64.split(',')[1]);
      const unit8arr = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i += 1) {
        unit8arr[i] = byteString.charCodeAt(i);
      }

      return unit8arr;
    } catch {
      return new Uint8Array(base64url.toBuffer(base64));
    }
  }

  return new Uint8Array(base64url.toBuffer(base64));
};

export const b64toBlob = (base64: string) => {
  const uniy8Array = b64toUint8Array(base64);
  const [, , mimeType] = base64.match(/(:)([a-z/]+)(;)/)!;

  return new Blob([uniy8Array.buffer], { type: mimeType });
};

export const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  array = array.slice();
  const startIndex = to < 0 ? array.length + to : to;
  const [item] = array.splice(from, 1);
  array.splice(startIndex, 0, item);

  return array;
};

export const flatten = <T>(arr: T[][]): T[] => ([] as T[]).concat(...arr);

export const pt2mm = (pt: number) => {
  // https://www.ddc.co.jp/words/archives/20090701114500.html
  const mmRatio = 0.3527;

  return parseFloat(String(pt)) * mmRatio;
};

export const mm2pt = (mm: number): number => {
  // https://www.ddc.co.jp/words/archives/20090701114500.html
  const ptRatio = 2.8346;

  return parseFloat(String(mm)) * ptRatio;
};
