/**
 * Raster image decoding for `<image>` elements.
 *
 * PNG needs decoding because PDF image streams cannot carry PNG's filters;
 * JPEG is embedded as-is with `DCTDecode`.
 */

import UPNGImport from '@pdf-lib/upng';

const UPNG = (UPNGImport as unknown as { default?: typeof UPNGImport }).default ?? UPNGImport;

export interface PngImage {
  kind: 'png';
  width: number;
  height: number;
  /** Interleaved-free RGB samples, 3 bytes per pixel. */
  rgb: Uint8Array;
  /** 8-bit alpha samples, when the image has any transparency. */
  alpha?: Uint8Array;
}

export interface JpegImage {
  kind: 'jpeg';
  width: number;
  height: number;
  colorSpace: string;
  /** The original JPEG bytes, embedded verbatim. */
  data: Uint8Array;
}

export type RasterImage = PngImage | JpegImage;

/** Decode a PNG into raw RGB (plus alpha) samples. */
export function decodePng(data: Uint8Array): PngImage {
  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  const png = UPNG.decode(buffer);
  if (png.frames.length > 1) throw new Error('Animated PNGs are not supported');

  const rgba = new Uint8Array(UPNG.toRGBA8(png)[0]);
  const { width, height } = png;
  const rgb = new Uint8Array(width * height * 3);
  const alpha = new Uint8Array(width * height);
  let hasAlpha = false;
  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
    alpha[i] = rgba[i * 4 + 3];
    if (alpha[i] < 255) hasAlpha = true;
  }
  return { kind: 'png', width, height, rgb, alpha: hasAlpha ? alpha : undefined };
}

/**
 * Read a JPEG's frame header for its dimensions and color space. The pixels
 * themselves stay compressed.
 */
export function decodeJpeg(data: Uint8Array): JpegImage {
  if (data.length < 2 || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error('Invalid JPEG data');
  }
  // Markers without a payload; these never carry a frame header.
  const STANDALONE = [0xd8, 0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7];
  const NOT_FRAME = new Set([0xc4, 0xc8, 0xcc]);

  let pos = 2;
  while (pos < data.length) {
    while (pos < data.length && data[pos] !== 0xff) pos++;
    if (pos + 1 >= data.length) break;
    const marker = data[pos + 1];
    if (marker === 0xd9) break;
    if (STANDALONE.includes(marker)) {
      pos += 2;
      continue;
    }
    if (pos + 3 >= data.length) break;
    const length = (data[pos + 2] << 8) | data[pos + 3];
    if (marker >= 0xc0 && marker <= 0xcf && !NOT_FRAME.has(marker)) {
      const height = (data[pos + 5] << 8) | data[pos + 6];
      const width = (data[pos + 7] << 8) | data[pos + 8];
      const components = data[pos + 9];
      const colorSpace =
        components === 1 ? 'DeviceGray' : components === 4 ? 'DeviceCMYK' : 'DeviceRGB';
      return { kind: 'jpeg', width, height, colorSpace, data };
    }
    pos += 2 + length;
  }
  throw new Error('JPEG SOF marker not found');
}
