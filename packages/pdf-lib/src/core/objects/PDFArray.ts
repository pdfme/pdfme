import PDFBool from './PDFBool';
import PDFDict from './PDFDict';
import PDFHexString from './PDFHexString';
import PDFName from './PDFName';
import PDFNull from './PDFNull';
import PDFNumber from './PDFNumber';
import PDFObject from './PDFObject';
import PDFRef from './PDFRef';
import PDFStream from './PDFStream';
import PDFString from './PDFString';
import PDFContext from '../PDFContext';
import CharCodes from '../syntax/CharCodes';
import { PDFArrayIsNotRectangleError } from '../errors';
import PDFRawStream from './PDFRawStream';

class PDFArray extends PDFObject {
  static withContext = (context: PDFContext) => new PDFArray(context);

  private readonly array: PDFObject[];
  private readonly context: PDFContext;

  private constructor(context: PDFContext) {
    super();
    this.array = [];
    this.context = context;
  }

  size(): number {
    return this.array.length;
  }

  push(object: PDFObject): void {
    this.array.push(object);
  }

  insert(index: number, object: PDFObject): void {
    this.array.splice(index, 0, object);
  }

  indexOf(object: PDFObject): number | undefined {
    const index = this.array.indexOf(object);
    return index === -1 ? undefined : index;
  }

  remove(index: number): void {
    this.array.splice(index, 1);
  }

  set(idx: number, object: PDFObject): void {
    this.array[idx] = object;
  }

  get(index: number): PDFObject {
    return this.array[index];
  }

  lookupMaybe(index: number, type: typeof PDFArray): PDFArray | undefined;
  lookupMaybe(index: number, type: typeof PDFBool): PDFBool | undefined;
  lookupMaybe(index: number, type: typeof PDFDict): PDFDict | undefined;
  lookupMaybe(index: number, type: typeof PDFHexString): PDFHexString | undefined;
  lookupMaybe(index: number, type: typeof PDFName): PDFName | undefined;
  lookupMaybe(index: number, type: typeof PDFNull): typeof PDFNull | undefined;
  lookupMaybe(index: number, type: typeof PDFNumber): PDFNumber | undefined;
  lookupMaybe(index: number, type: typeof PDFStream): PDFStream | undefined;
  lookupMaybe(index: number, type: typeof PDFRawStream): PDFRawStream | undefined;
  lookupMaybe(index: number, type: typeof PDFRef): PDFRef | undefined;
  lookupMaybe(index: number, type: typeof PDFString): PDFString | undefined;
  lookupMaybe(
    index: number,
    type1: typeof PDFString,
    type2: typeof PDFHexString,
  ): PDFString | PDFHexString | undefined;

  lookupMaybe(index: number, ...types: any[]) {
    return this.context.lookupMaybe(
      this.get(index),
      // @ts-ignore
      ...types,
    ) as any;
  }

  lookup(index: number): PDFObject | undefined;
  lookup(index: number, type: typeof PDFArray): PDFArray;
  lookup(index: number, type: typeof PDFBool): PDFBool;
  lookup(index: number, type: typeof PDFDict): PDFDict;
  lookup(index: number, type: typeof PDFHexString): PDFHexString;
  lookup(index: number, type: typeof PDFName): PDFName;
  lookup(index: number, type: typeof PDFNull): typeof PDFNull;
  lookup(index: number, type: typeof PDFNumber): PDFNumber;
  lookup(index: number, type: typeof PDFStream): PDFStream;
  lookup(index: number, type: typeof PDFRawStream): PDFRawStream;
  lookup(index: number, type: typeof PDFRef): PDFRef;
  lookup(index: number, type: typeof PDFString): PDFString;
  lookup(
    index: number,
    type1: typeof PDFString,
    type2: typeof PDFHexString,
  ): PDFString | PDFHexString;

  lookup(index: number, ...types: any[]) {
    return this.context.lookup(
      this.get(index),
      // @ts-ignore
      ...types,
    ) as any;
  }

  asRectangle(): { x: number; y: number; width: number; height: number } {
    if (this.size() !== 4) throw new PDFArrayIsNotRectangleError(this.size());

    const lowerLeftX = this.lookup(0, PDFNumber).asNumber();
    const lowerLeftY = this.lookup(1, PDFNumber).asNumber();
    const upperRightX = this.lookup(2, PDFNumber).asNumber();
    const upperRightY = this.lookup(3, PDFNumber).asNumber();

    const x = lowerLeftX;
    const y = lowerLeftY;
    const width = upperRightX - lowerLeftX;
    const height = upperRightY - lowerLeftY;

    return { x, y, width, height };
  }

  asArray(): PDFObject[] {
    return this.array.slice();
  }

  clone(context?: PDFContext): PDFArray {
    const clone = PDFArray.withContext(context || this.context);
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      clone.push(this.array[idx]);
    }
    return clone;
  }

  toString(): string {
    let arrayString = '[ ';
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      arrayString += this.get(idx).toString();
      arrayString += ' ';
    }
    arrayString += ']';
    return arrayString;
  }

  sizeInBytes(): number {
    let size = 3;
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      size += this.get(idx).sizeInBytes() + 1;
    }
    return size;
  }

  copyBytesInto(buffer: Uint8Array, offset: number): number {
    const initialOffset = offset;

    buffer[offset++] = CharCodes.LeftSquareBracket;
    buffer[offset++] = CharCodes.Space;
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      offset += this.get(idx).copyBytesInto(buffer, offset);
      buffer[offset++] = CharCodes.Space;
    }
    buffer[offset++] = CharCodes.RightSquareBracket;

    return offset - initialOffset;
  }

  scalePDFNumbers(x: number, y: number): void {
    for (let idx = 0, len = this.size(); idx < len; idx++) {
      const el = this.lookup(idx);
      if (el instanceof PDFNumber) {
        const factor = idx % 2 === 0 ? x : y;
        this.set(idx, PDFNumber.of(el.asNumber() * factor));
      }
    }
  }
}

export default PDFArray;
