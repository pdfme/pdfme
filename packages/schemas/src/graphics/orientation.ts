import jpegJsModule from 'jpeg-js';
import UPNGModule from '@pdf-lib/upng';

export type ImageFormat = 'jpeg' | 'png' | 'other';

type JpegJsApi = {
  decode: (
    data: Uint8Array,
    opts?: {
      useTArray?: boolean;
      formatAsRGBA?: boolean;
      maxMemoryUsageInMB?: number;
    },
  ) => { data: Uint8Array; width: number; height: number };
  encode: (
    img: { data: Uint8Array; width: number; height: number },
    quality: number,
  ) => { data: Uint8Array };
};

type DecodedPng = { width: number; height: number };

type UPNGApi = {
  decode: (input: ArrayBuffer) => DecodedPng;
  toRGBA8: (decoded: DecodedPng) => ArrayBuffer[];
  encode: (
    bufs: ArrayBuffer[],
    width: number,
    height: number,
    cnum: number,
  ) => ArrayBuffer | Uint8Array;
};

const isJpegJsApi = (value: unknown): value is JpegJsApi =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as JpegJsApi).decode === 'function' &&
  typeof (value as JpegJsApi).encode === 'function';

const isUPNGApi = (value: unknown): value is UPNGApi =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as UPNGApi).decode === 'function' &&
  typeof (value as UPNGApi).toRGBA8 === 'function' &&
  typeof (value as UPNGApi).encode === 'function';

const resolveExport = <T>(
  value: unknown,
  guard: (candidate: unknown) => candidate is T,
  label: string,
): T => {
  let current: unknown = value;
  while (current && typeof current === 'object') {
    if (guard(current)) return current;
    current = (current as { default?: unknown }).default;
  }
  throw new TypeError(`Failed to resolve ${label} exports`);
};

const jpegJs = resolveExport(jpegJsModule, isJpegJsApi, 'jpeg-js');
const UPNG = resolveExport(UPNGModule, isUPNGApi, '@pdf-lib/upng');

const JPEG_ENCODE_QUALITY = 90;
const JPEG_MAX_MEMORY_MB = 512;

const JPEG_SOI_0 = 0xff;
const JPEG_SOI_1 = 0xd8;
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

const isPngSignature = (bytes: Uint8Array): boolean => {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
};

export const detectImageFormat = (bytes: Uint8Array): ImageFormat => {
  if (bytes.length >= 2 && bytes[0] === JPEG_SOI_0 && bytes[1] === JPEG_SOI_1) {
    return 'jpeg';
  }
  if (isPngSignature(bytes)) {
    return 'png';
  }
  return 'other';
};

/** TIFF/IFD0: returns 1..8 or undefined. Never throws. */
export const parseTiffOrientation = (tiff: Uint8Array): number | undefined => {
  try {
    if (tiff.length < 8) return undefined;
    const le = tiff[0] === 0x49 && tiff[1] === 0x49; // 'II'
    if (!le && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return undefined; // 'MM'
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    if (view.getUint16(2, le) !== 42) return undefined;
    const ifd = view.getUint32(4, le);
    if (ifd + 2 > tiff.length) return undefined;
    const n = view.getUint16(ifd, le);
    for (let i = 0; i < n; i++) {
      const entry = ifd + 2 + i * 12;
      if (entry + 12 > tiff.length) return undefined;
      if (view.getUint16(entry, le) !== 0x0112) continue;
      if (view.getUint16(entry + 2, le) !== 3) return undefined; // SHORT
      if (view.getUint32(entry + 4, le) !== 1) return undefined;
      const val = view.getUint16(entry + 8, le);
      return val >= 1 && val <= 8 ? val : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

/** JPEG: scan APP1 'Exif\0\0' segments; stop at SOS/EOI. */
export const getJpegOrientation = (bytes: Uint8Array): number | undefined => {
  if (bytes.length < 4 || bytes[0] !== JPEG_SOI_0 || bytes[1] !== JPEG_SOI_1) return undefined;
  let pos = 2;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) return undefined;
    const marker = bytes[pos + 1];
    if (marker === 0xda || marker === 0xd9) return undefined; // SOS/EOI
    const size = (bytes[pos + 2] << 8) | bytes[pos + 3];
    if (size < 2 || pos + 2 + size > bytes.length) return undefined;
    if (marker === 0xe1 && size >= 8) {
      const segment = bytes.subarray(pos + 4, pos + 2 + size);
      if (
        segment[0] === 0x45 &&
        segment[1] === 0x78 &&
        segment[2] === 0x69 &&
        segment[3] === 0x66 &&
        segment[4] === 0 &&
        segment[5] === 0
      ) {
        return parseTiffOrientation(segment.subarray(6));
      }
    }
    pos += 2 + size;
  }
  return undefined;
};

/** PNG: scan chunks for eXIf (raw TIFF payload); stop at IDAT/IEND. */
export const getPngOrientation = (bytes: Uint8Array): number | undefined => {
  if (!isPngSignature(bytes)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8;
  while (pos + 12 <= bytes.length) {
    const length = view.getUint32(pos);
    if (pos + 12 + length > bytes.length) return undefined;
    const type = String.fromCharCode(
      bytes[pos + 4],
      bytes[pos + 5],
      bytes[pos + 6],
      bytes[pos + 7],
    );
    if (type === 'eXIf') {
      return parseTiffOrientation(bytes.subarray(pos + 8, pos + 8 + length));
    }
    if (type === 'IDAT' || type === 'IEND') return undefined;
    pos += 12 + length;
  }
  return undefined;
};

export const orientationSwapsDimensions = (orientation: number) => orientation >= 5;

/**
 * Map source (x, y) into destination (dx, dy) for EXIF orientations 2–8.
 * Orientations 5–8 swap width and height.
 */
export const transformRgba = (
  src: Uint8Array,
  width: number,
  height: number,
  orientation: number,
): { data: Uint8Array; width: number; height: number } => {
  const swap = orientationSwapsDimensions(orientation);
  const destWidth = swap ? height : width;
  const destHeight = swap ? width : height;
  const dest = new Uint8Array(destWidth * destHeight * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = x;
      let dy = y;
      switch (orientation) {
        case 2:
          dx = width - 1 - x;
          dy = y;
          break;
        case 3:
          dx = width - 1 - x;
          dy = height - 1 - y;
          break;
        case 4:
          dx = x;
          dy = height - 1 - y;
          break;
        case 5:
          dx = y;
          dy = x;
          break;
        case 6:
          dx = height - 1 - y;
          dy = x;
          break;
        case 7:
          dx = height - 1 - y;
          dy = width - 1 - x;
          break;
        case 8:
          dx = y;
          dy = width - 1 - x;
          break;
        default:
          break;
      }
      const srcIndex = (y * width + x) * 4;
      const destIndex = (dy * destWidth + dx) * 4;
      dest[destIndex] = src[srcIndex];
      dest[destIndex + 1] = src[srcIndex + 1];
      dest[destIndex + 2] = src[srcIndex + 2];
      dest[destIndex + 3] = src[srcIndex + 3];
    }
  }

  return { data: dest, width: destWidth, height: destHeight };
};

const bakeJpegOrientation = (bytes: Uint8Array): Uint8Array => {
  const orientation = getJpegOrientation(bytes);
  if (!orientation || orientation === 1) return bytes;
  const raw = jpegJs.decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
    maxMemoryUsageInMB: JPEG_MAX_MEMORY_MB,
  });
  const transformed = transformRgba(raw.data, raw.width, raw.height, orientation);
  return new Uint8Array(
    jpegJs.encode(
      { data: transformed.data, width: transformed.width, height: transformed.height },
      JPEG_ENCODE_QUALITY,
    ).data,
  );
};

const bakePngOrientation = (bytes: Uint8Array): Uint8Array => {
  const orientation = getPngOrientation(bytes);
  if (!orientation || orientation === 1) return bytes;
  const img = UPNG.decode(toArrayBuffer(bytes));
  const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
  const transformed = transformRgba(rgba, img.width, img.height, orientation);
  return new Uint8Array(
    UPNG.encode([toArrayBuffer(transformed.data)], transformed.width, transformed.height, 0),
  );
};

/**
 * One normalize path for JPEG and PNG. Tag absent/1 is a byte-identical
 * passthrough. Tag 2–8 decodes, transforms pixels, and re-encodes without
 * an orientation tag. May throw on decode/encode failure — callers fall back.
 */
export const normalizeImageOrientation = (bytes: Uint8Array): Uint8Array => {
  const kind = detectImageFormat(bytes);
  if (kind === 'jpeg') return bakeJpegOrientation(bytes);
  if (kind === 'png') return bakePngOrientation(bytes);
  return bytes;
};
