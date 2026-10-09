import PDFObject from './PDFObject.js';
import CharCodes from '../syntax/CharCodes.js';
import {
  charFromCode,
  copyStringIntoBuffer,
  padStart,
  utf16Decode,
  pdfDocEncodingDecode,
  toCharCode,
  parseDate,
  hasUtf16BOM,
} from '../../utils/index.js';
import { InvalidPDFDateStringError } from '../errors.js';

class PDFString extends PDFObject {
  // The PDF spec allows newlines and parens to appear directly within a literal
  // string. These character _may_ be escaped. But they do not _have_ to be. So
  // for simplicity, we will not bother escaping them. `value` is the string's
  // written form: for text that may contain unbalanced parens or backslashes,
  // use `fromBytes`, which escapes them.
  static of = (value: string) => new PDFString(value);

  // Unlike `of`, which takes a literal's written form as-is, this escapes the bytes that cannot
  // appear raw in a literal string: parens and backslashes (which would unbalance or alter it) and
  // CR (which readers turn into LF). Use it for arbitrary bytes or text, e.g. decrypted strings.
  static fromBytes = (bytes: Uint8Array) => {
    let value = '';
    for (let idx = 0, len = bytes.length; idx < len; idx++) {
      const byte = bytes[idx];
      if (byte === CharCodes.LeftParen) value += '\\(';
      else if (byte === CharCodes.RightParen) value += '\\)';
      else if (byte === CharCodes.BackSlash) value += '\\\\';
      else if (byte === CharCodes.CarriageReturn) value += '\\r';
      else value += charFromCode(byte);
    }
    return new PDFString(value);
  };

  static fromDate = (date: Date) => {
    const year = padStart(String(date.getUTCFullYear()), 4, '0');
    const month = padStart(String(date.getUTCMonth() + 1), 2, '0');
    const day = padStart(String(date.getUTCDate()), 2, '0');
    const hours = padStart(String(date.getUTCHours()), 2, '0');
    const mins = padStart(String(date.getUTCMinutes()), 2, '0');
    const secs = padStart(String(date.getUTCSeconds()), 2, '0');
    return new PDFString(`D:${year}${month}${day}${hours}${mins}${secs}Z`);
  };

  private readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  asBytes(): Uint8Array {
    const bytes: number[] = [];

    let octal = '';
    let escaped = false;

    const pushByte = (byte?: number) => {
      if (byte !== undefined) bytes.push(byte);
      escaped = false;
    };

    for (let idx = 0, len = this.value.length; idx < len; idx++) {
      const char = this.value[idx];
      const byte = toCharCode(char);
      const nextChar = this.value[idx + 1];
      if (!escaped) {
        if (byte === CharCodes.BackSlash) escaped = true;
        else pushByte(byte);
      } else {
        if (byte === CharCodes.Newline) pushByte();
        else if (byte === CharCodes.CarriageReturn) {
          // A backslash followed by CRLF is a single line continuation: skip the LF too
          if (nextChar === '\n') idx++;
          pushByte();
        } else if (byte === CharCodes.n) pushByte(CharCodes.Newline);
        else if (byte === CharCodes.r) pushByte(CharCodes.CarriageReturn);
        else if (byte === CharCodes.t) pushByte(CharCodes.Tab);
        else if (byte === CharCodes.b) pushByte(CharCodes.Backspace);
        else if (byte === CharCodes.f) pushByte(CharCodes.FormFeed);
        else if (byte === CharCodes.LeftParen) pushByte(CharCodes.LeftParen);
        else if (byte === CharCodes.RightParen) pushByte(CharCodes.RightParen);
        else if (byte === CharCodes.BackSlash) pushByte(CharCodes.BackSlash);
        else if (byte >= CharCodes.Zero && byte <= CharCodes.Seven) {
          octal += char;
          if (octal.length === 3 || !(nextChar >= '0' && nextChar <= '7')) {
            pushByte(parseInt(octal, 8));
            octal = '';
          }
        } else {
          pushByte(byte);
        }
      }
    }

    return new Uint8Array(bytes);
  }

  decodeText(): string {
    const bytes = this.asBytes();
    if (hasUtf16BOM(bytes)) return utf16Decode(bytes);
    return pdfDocEncodingDecode(bytes);
  }

  decodeDate(): Date {
    const text = this.decodeText();
    const date = parseDate(text);
    if (!date) throw new InvalidPDFDateStringError(text);
    return date;
  }

  asString(): string {
    return this.value;
  }

  clone(): PDFString {
    return PDFString.of(this.value);
  }

  toString(): string {
    return `(${this.value})`;
  }

  sizeInBytes(): number {
    return this.value.length + 2;
  }

  copyBytesInto(buffer: Uint8Array, offset: number): number {
    buffer[offset++] = CharCodes.LeftParen;
    offset += copyStringIntoBuffer(this.value, buffer, offset);
    buffer[offset++] = CharCodes.RightParen;
    return this.value.length + 2;
  }
}

export default PDFString;
