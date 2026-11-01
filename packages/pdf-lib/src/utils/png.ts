import UPNGModule from '@pdf-lib/upng';

type DecodedPng = {
  ctype: number;
  width: number;
  height: number;
};

type UPNGApi = {
  decode: (input: ArrayBuffer) => DecodedPng;
  toRGBA8: (decoded: DecodedPng) => ArrayBuffer[];
};

const isUPNGApi = (value: unknown): value is UPNGApi =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as UPNGApi).decode === 'function' &&
  typeof (value as UPNGApi).toRGBA8 === 'function';

const resolveUPNG = (value: unknown): UPNGApi => {
  let current: unknown = value;

  while (current && typeof current === 'object') {
    if (isUPNGApi(current)) return current;
    current = (current as { default?: unknown }).default;
  }

  throw new TypeError('Failed to resolve @pdf-lib/upng exports');
};

const UPNG = resolveUPNG(UPNGModule);

// UPNG.decode reads the whole ArrayBuffer from offset 0, so a view with a
// non-zero byteOffset (e.g. a pooled Node Buffer) must be narrowed first.
const toStandaloneArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const { buffer, byteOffset, byteLength } = bytes;
  if (byteOffset === 0 && byteLength === buffer.byteLength) {
    return buffer as ArrayBuffer;
  }
  return buffer.slice(byteOffset, byteOffset + byteLength) as ArrayBuffer;
};

const getImageType = (ctype: number) => {
  if (ctype === 0) return PngType.Greyscale;
  if (ctype === 2) return PngType.Truecolour;
  if (ctype === 3) return PngType.IndexedColour;
  if (ctype === 4) return PngType.GreyscaleWithAlpha;
  if (ctype === 6) return PngType.TruecolourWithAlpha;
  throw new Error(`Unknown color type: ${ctype}`);
};

const splitAlphaChannel = (rgbaChannel: Uint8Array) => {
  const pixelCount = Math.floor(rgbaChannel.length / 4);

  const rgbChannel = new Uint8Array(pixelCount * 3);
  const alphaChannel = new Uint8Array(pixelCount * 1);

  let rgbaOffset = 0;
  let rgbOffset = 0;
  let alphaOffset = 0;

  while (rgbaOffset < rgbaChannel.length) {
    rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
    rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
    rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
    alphaChannel[alphaOffset++] = rgbaChannel[rgbaOffset++];
  }

  return { rgbChannel, alphaChannel };
};

export enum PngType {
  Greyscale = 'Greyscale',
  Truecolour = 'Truecolour',
  IndexedColour = 'IndexedColour',
  GreyscaleWithAlpha = 'GreyscaleWithAlpha',
  TruecolourWithAlpha = 'TruecolourWithAlpha',
}

export class PNG {
  static load = (pngData: Uint8Array) => new PNG(pngData);

  readonly rgbChannel: Uint8Array;
  readonly alphaChannel?: Uint8Array;
  readonly type: PngType;
  readonly width: number;
  readonly height: number;
  readonly bitsPerComponent: number;

  private constructor(pngData: Uint8Array) {
    const upng = UPNG.decode(toStandaloneArrayBuffer(pngData));
    const frames = UPNG.toRGBA8(upng);

    if (frames.length > 1) throw new Error(`Animated PNGs are not supported`);

    const frame = new Uint8Array(frames[0]);
    const { rgbChannel, alphaChannel } = splitAlphaChannel(frame);

    this.rgbChannel = rgbChannel;

    const hasAlphaValues = alphaChannel.some((a) => a < 255);
    if (hasAlphaValues) this.alphaChannel = alphaChannel;

    this.type = getImageType(upng.ctype);

    this.width = upng.width;
    this.height = upng.height;
    this.bitsPerComponent = 8;
  }
}
