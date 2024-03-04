// ref: https://github.com/image-size/image-size ----------------------------
// The following code is adapted from the image-size code. Unnecessary formats and dependencies on Node have been removed.
import { Buffer } from 'buffer';

type IImage = {
  validate: (input: Uint8Array) => boolean;
  calculate: (input: Uint8Array) => { width: number; height: number } | undefined;
};

const decoder = new TextDecoder();
const toUTF8String = (input: Uint8Array, start = 0, end = input.length) =>
  decoder.decode(input.slice(start, end));

const toHexString = (input: Uint8Array, start = 0, end = input.length) =>
  input.slice(start, end).reduce((memo, i) => memo + ('0' + i.toString(16)).slice(-2), '');

const readUInt16BE = (input: Uint8Array, offset = 0) => input[offset] * 2 ** 8 + input[offset + 1];

const readUInt32BE = (input: Uint8Array, offset = 0) =>
  input[offset] * 2 ** 24 +
  input[offset + 1] * 2 ** 16 +
  input[offset + 2] * 2 ** 8 +
  input[offset + 3];

const extractSize = (input: Uint8Array, index: number) => {
  return {
    height: readUInt16BE(input, index),
    width: readUInt16BE(input, index + 2),
  };
};

const validateInput = (input: Uint8Array, index: number): void => {
  // index should be within buffer limits
  if (index > input.length) {
    throw new TypeError('Corrupt JPG, exceeded buffer limits');
  }
  // Every JPEG block must begin with a 0xFF
  if (input[index] !== 0xff) {
    throw new TypeError('Invalid JPG, marker table corrupted');
  }
};

const JPG: IImage = {
  validate: (input) => toHexString(input, 0, 2) === 'ffd8',

  calculate(input) {
    // Skip 4 chars, they are for signature
    input = input.slice(4);

    let next: number;
    while (input.length) {
      // read length of the next block
      const i = readUInt16BE(input, 0);

      // ensure correct format
      validateInput(input, i);

      // 0xFFC0 is baseline standard(SOF)
      // 0xFFC1 is baseline optimized(SOF)
      // 0xFFC2 is progressive(SOF2)
      next = input[i + 1];
      if (next === 0xc0 || next === 0xc1 || next === 0xc2) {
        const size = extractSize(input, i + 5);

        return size;
      }

      // move to the next block
      input = input.slice(i + 2);
    }

    throw new TypeError('Invalid JPG, no size found');
  },
};

const pngSignature = 'PNG\r\n\x1a\n';
const pngImageHeaderChunkName = 'IHDR';

// Used to detect "fried" png's: http://www.jongware.com/pngdefry.html
const pngFriedChunkName = 'CgBI';

const PNG: IImage = {
  validate(input) {
    if (pngSignature === toUTF8String(input, 1, 8)) {
      let chunkName = toUTF8String(input, 12, 16);
      if (chunkName === pngFriedChunkName) {
        chunkName = toUTF8String(input, 28, 32);
      }
      if (chunkName !== pngImageHeaderChunkName) {
        throw new TypeError('Invalid PNG');
      }
      return true;
    }
    return false;
  },

  calculate(input) {
    if (toUTF8String(input, 12, 16) === pngFriedChunkName) {
      return {
        height: readUInt32BE(input, 36),
        width: readUInt32BE(input, 32),
      };
    }
    return {
      height: readUInt32BE(input, 20),
      width: readUInt32BE(input, 16),
    };
  },
};

const typeHandlers = {
  jpg: JPG,
  png: PNG,
};

type imageType = keyof typeof typeHandlers;

function detector(input: Uint8Array): imageType | undefined {
  const firstBytes: { [byte: number]: imageType } = {
    0x89: 'png',
    0xff: 'jpg',
  };
  const byte = input[0];
  if (byte in firstBytes) {
    const type = firstBytes[byte];
    if (type && typeHandlers[type].validate(input)) {
      return type;
    }
  }

  const keys = Object.keys(typeHandlers) as imageType[];
  return keys.find((key: imageType) => typeHandlers[key].validate(input));
}

export const getImageDimension = (value: string): { height: number; width: number } => {
  const dataUriPrefix = ';base64,';
  const idx = value.indexOf(dataUriPrefix);
  const imgBase64 = value.substring(idx + dataUriPrefix.length, value.length);
  return imageSize(Buffer.from(imgBase64, 'base64'));
};

const imageSize = (imgBuffer: Buffer): { height: number; width: number } => {
  const type = detector(imgBuffer);

  if (typeof type !== 'undefined' && type in typeHandlers) {
    const size = typeHandlers[type].calculate(imgBuffer);
    if (size !== undefined) {
      return size;
    }
  }

  throw new TypeError(
    '[@pdfme/schemas/images] Unsupported file type: ' + (type === undefined ? 'undefined' : type)
  );
};
// ----------------------------
