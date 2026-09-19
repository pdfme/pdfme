import { afterEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from '@pdfme/pdf-lib';
import * as pdfLib from '@pdfme/pdf-lib';
import { BLANK_PDF, mm2pt, type Schema, type PDFRenderProps } from '@pdfme/common';
import jpeg from 'jpeg-js';
import UPNG from '@pdf-lib/upng';
import { Buffer } from 'buffer';
import { image } from '../src/index.js';
import {
  detectImageFormat,
  getJpegOrientation,
  getPngOrientation,
  normalizeImageOrientation,
  parseTiffOrientation,
  transformRgba,
} from '../src/graphics/orientation.js';

const ORIENTATIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const BYTE_ORDERS = [true, false] as const;

const PATTERN_WIDTH = 4;
const PATTERN_HEIGHT = 2;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const buildTiff = (orientation: number, littleEndian: boolean): Uint8Array => {
  const buf = new Uint8Array(26);
  const view = new DataView(buf.buffer);
  buf[0] = littleEndian ? 0x49 : 0x4d;
  buf[1] = littleEndian ? 0x49 : 0x4d;
  view.setUint16(2, 42, littleEndian);
  view.setUint32(4, 8, littleEndian);
  view.setUint16(8, 1, littleEndian);
  view.setUint16(10, 0x0112, littleEndian);
  view.setUint16(12, 3, littleEndian);
  view.setUint32(14, 1, littleEndian);
  view.setUint16(18, orientation, littleEndian);
  view.setUint32(22, 0, littleEndian);
  return buf;
};

const jpegApp1 = (payload: Uint8Array): Uint8Array => {
  const size = 2 + payload.length;
  const segment = new Uint8Array(2 + size);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  segment[2] = (size >> 8) & 0xff;
  segment[3] = size & 0xff;
  segment.set(payload, 4);
  return segment;
};

const exifPayload = (orientation: number, littleEndian: boolean): Uint8Array => {
  const tiff = buildTiff(orientation, littleEndian);
  const payload = new Uint8Array(6 + tiff.length);
  payload.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
  payload.set(tiff, 6);
  return payload;
};

const insertJpegSegments = (jpegBytes: Uint8Array, segments: Uint8Array[]): Uint8Array => {
  let extra = 0;
  for (const segment of segments) extra += segment.length;
  const out = new Uint8Array(jpegBytes.length + extra);
  out[0] = jpegBytes[0];
  out[1] = jpegBytes[1];
  let offset = 2;
  for (const segment of segments) {
    out.set(segment, offset);
    offset += segment.length;
  }
  out.set(jpegBytes.subarray(2), offset);
  return out;
};

const jpegWithOrientation = (
  jpegBytes: Uint8Array,
  orientation: number,
  littleEndian = true,
): Uint8Array => insertJpegSegments(jpegBytes, [jpegApp1(exifPayload(orientation, littleEndian))]);

const buildExifChunk = (tiff: Uint8Array): Uint8Array => {
  const typeAndData = new Uint8Array(4 + tiff.length);
  typeAndData.set([0x65, 0x58, 0x49, 0x66]);
  typeAndData.set(tiff, 4);
  const chunk = new Uint8Array(12 + tiff.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, tiff.length);
  chunk.set(typeAndData, 4);
  view.setUint32(8 + tiff.length, crc32(typeAndData));
  return chunk;
};

const insertPngChunkBefore = (
  pngBytes: Uint8Array,
  chunk: Uint8Array,
  beforeType: string,
): Uint8Array => {
  const pngView = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength);
  let pos = 8;
  while (pos + 8 <= pngBytes.length) {
    const length = pngView.getUint32(pos);
    const type = String.fromCharCode(
      pngBytes[pos + 4],
      pngBytes[pos + 5],
      pngBytes[pos + 6],
      pngBytes[pos + 7],
    );
    if (type === beforeType) {
      const out = new Uint8Array(pngBytes.length + chunk.length);
      out.set(pngBytes.subarray(0, pos), 0);
      out.set(chunk, pos);
      out.set(pngBytes.subarray(pos), pos + chunk.length);
      return out;
    }
    pos += 12 + length;
  }
  throw new Error(`PNG fixture is missing ${beforeType}`);
};

const pngWithOrientation = (
  pngBytes: Uint8Array,
  orientation: number,
  littleEndian = true,
): Uint8Array =>
  insertPngChunkBefore(pngBytes, buildExifChunk(buildTiff(orientation, littleEndian)), 'IDAT');

const pngWithOrientationAfterIdat = (
  pngBytes: Uint8Array,
  orientation: number,
  littleEndian = true,
): Uint8Array =>
  insertPngChunkBefore(pngBytes, buildExifChunk(buildTiff(orientation, littleEndian)), 'IEND');

const makePatternRgba = (): Uint8Array => {
  const data = new Uint8Array(PATTERN_WIDTH * PATTERN_HEIGHT * 4);
  for (let i = 0; i < PATTERN_WIDTH * PATTERN_HEIGHT; i++) {
    const offset = i * 4;
    data[offset] = (i + 1) * 20;
    data[offset + 1] = (i + 1) * 25;
    data[offset + 2] = (i + 1) * 30;
    data[offset + 3] = 255;
  }
  return data;
};

const pixelAt = (data: Uint8Array, width: number, x: number, y: number): number[] => {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

const encodeJpegPattern = (): Uint8Array =>
  new Uint8Array(
    jpeg.encode({ data: makePatternRgba(), width: PATTERN_WIDTH, height: PATTERN_HEIGHT }, 90).data,
  );

const encodePngPattern = (): Uint8Array =>
  new Uint8Array(
    UPNG.encode([makePatternRgba().buffer], PATTERN_WIDTH, PATTERN_HEIGHT, 0) as
      | ArrayBuffer
      | Uint8Array,
  );

const toDataUrl = (mime: 'image/jpeg' | 'image/png', bytes: Uint8Array): string =>
  `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;

const renderImage = async (value: string, box = { width: 40, height: 20 }) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const _cache = new Map<string | number, unknown>();
  const schema = {
    name: 'pic',
    type: 'image',
    content: value,
    position: { x: 0, y: 0 },
    width: box.width,
    height: box.height,
    rotate: 0,
    opacity: 1,
  } as unknown as Schema;
  const arg = {
    value,
    schema,
    basePdf: BLANK_PDF,
    pdfLib,
    pdfDoc,
    page,
    options: {},
    _cache,
  } as unknown as PDFRenderProps<Schema>;
  const drawImage = vi.spyOn(page, 'drawImage');
  await image.pdf(arg);
  return { arg, page, _cache, drawImage };
};

describe('orientation parser', () => {
  it('reads IFD0 tag 0x0112 for orientations 1–8 in both TIFF byte orders', () => {
    for (const orientation of ORIENTATIONS) {
      for (const littleEndian of BYTE_ORDERS) {
        expect(parseTiffOrientation(buildTiff(orientation, littleEndian))).toBe(orientation);
      }
    }
  });

  it('reads JPEG APP1 Exif and PNG eXIf for orientations 1–8 × both byte orders', () => {
    const jpegBytes = encodeJpegPattern();
    const pngBytes = encodePngPattern();
    for (const orientation of ORIENTATIONS) {
      for (const littleEndian of BYTE_ORDERS) {
        expect(getJpegOrientation(jpegWithOrientation(jpegBytes, orientation, littleEndian))).toBe(
          orientation,
        );
        expect(getPngOrientation(pngWithOrientation(pngBytes, orientation, littleEndian))).toBe(
          orientation,
        );
      }
    }
  });

  it('skips an XMP APP1 and still finds a later Exif APP1', () => {
    const xmp = new Uint8Array([0x68, 0x74, 0x74, 0x70, 0x3a, 0x2f, 0x2f]); // http://
    const jpegBytes = insertJpegSegments(encodeJpegPattern(), [
      jpegApp1(xmp),
      jpegApp1(exifPayload(6, true)),
    ]);
    expect(getJpegOrientation(jpegBytes)).toBe(6);
  });

  it('skips 0xFF fill bytes and standalone RST markers before Exif APP1', () => {
    const fillAndRst = new Uint8Array([0xff, 0xff, 0xff, 0xd0]);
    const jpegBytes = insertJpegSegments(encodeJpegPattern(), [
      fillAndRst,
      jpegApp1(exifPayload(6, true)),
    ]);
    expect(getJpegOrientation(jpegBytes)).toBe(6);
  });

  it('keeps scanning after an Exif APP1 with no valid Orientation', () => {
    const jpegBytes = insertJpegSegments(encodeJpegPattern(), [
      jpegApp1(exifPayload(0, true)),
      jpegApp1(exifPayload(6, true)),
    ]);
    expect(getJpegOrientation(jpegBytes)).toBe(6);
  });

  it('reads a PNG eXIf chunk that appears after IDAT', () => {
    expect(getPngOrientation(pngWithOrientationAfterIdat(encodePngPattern(), 6))).toBe(6);
  });

  it('returns undefined for missing, truncated, or out-of-range tags', () => {
    expect(getJpegOrientation(encodeJpegPattern())).toBeUndefined();
    expect(getPngOrientation(encodePngPattern())).toBeUndefined();
    expect(parseTiffOrientation(buildTiff(0, true))).toBeUndefined();
    expect(parseTiffOrientation(buildTiff(9, true))).toBeUndefined();
    expect(parseTiffOrientation(new Uint8Array([0x49, 0x49, 0x2a]))).toBeUndefined();

    const truncatedApp1 = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x40, 0x45, 0x78]);
    expect(getJpegOrientation(truncatedApp1)).toBeUndefined();

    const garbage = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x00, 0x01, 0x02, 0x03]);
    expect(getJpegOrientation(garbage)).toBeUndefined();
  });

  it('detects JPEG/PNG by magic bytes', () => {
    expect(detectImageFormat(encodeJpegPattern())).toBe('jpeg');
    expect(detectImageFormat(encodePngPattern())).toBe('png');
    expect(detectImageFormat(new Uint8Array([0x00, 0x01, 0x02]))).toBe('other');
  });
});

describe('orientation transform', () => {
  const src = makePatternRgba();

  it.each([
    {
      orientation: 2,
      width: 4,
      height: 2,
      corners: { tl: [3, 0], tr: [0, 0], bl: [3, 1], br: [0, 1] },
    },
    {
      orientation: 3,
      width: 4,
      height: 2,
      corners: { tl: [3, 1], tr: [0, 1], bl: [3, 0], br: [0, 0] },
    },
    {
      orientation: 4,
      width: 4,
      height: 2,
      corners: { tl: [0, 1], tr: [3, 1], bl: [0, 0], br: [3, 0] },
    },
    {
      orientation: 5,
      width: 2,
      height: 4,
      corners: { tl: [0, 0], tr: [0, 1], bl: [3, 0], br: [3, 1] },
    },
    {
      orientation: 6,
      width: 2,
      height: 4,
      corners: { tl: [0, 1], tr: [0, 0], bl: [3, 1], br: [3, 0] },
    },
    {
      orientation: 7,
      width: 2,
      height: 4,
      corners: { tl: [3, 1], tr: [3, 0], bl: [0, 1], br: [0, 0] },
    },
    {
      orientation: 8,
      width: 2,
      height: 4,
      corners: { tl: [3, 0], tr: [3, 1], bl: [0, 0], br: [0, 1] },
    },
  ])(
    'maps corners exactly for orientation $orientation',
    ({ orientation, width, height, corners }) => {
      const result = transformRgba(src, PATTERN_WIDTH, PATTERN_HEIGHT, orientation);
      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      expect(pixelAt(result.data, width, 0, 0)).toEqual(
        pixelAt(src, PATTERN_WIDTH, corners.tl[0], corners.tl[1]),
      );
      expect(pixelAt(result.data, width, width - 1, 0)).toEqual(
        pixelAt(src, PATTERN_WIDTH, corners.tr[0], corners.tr[1]),
      );
      expect(pixelAt(result.data, width, 0, height - 1)).toEqual(
        pixelAt(src, PATTERN_WIDTH, corners.bl[0], corners.bl[1]),
      );
      expect(pixelAt(result.data, width, width - 1, height - 1)).toEqual(
        pixelAt(src, PATTERN_WIDTH, corners.br[0], corners.br[1]),
      );
    },
  );
});

describe('orientation bake', () => {
  it('is a byte-identical passthrough when the tag is absent or 1', () => {
    const jpegBytes = encodeJpegPattern();
    const pngBytes = encodePngPattern();
    expect(normalizeImageOrientation(jpegBytes)).toBe(jpegBytes);
    expect(normalizeImageOrientation(pngBytes)).toBe(pngBytes);

    const jpegTag1 = jpegWithOrientation(jpegBytes, 1);
    const pngTag1 = pngWithOrientation(pngBytes, 1);
    expect(normalizeImageOrientation(jpegTag1)).toBe(jpegTag1);
    expect(normalizeImageOrientation(pngTag1)).toBe(pngTag1);
  });

  it('re-encodes orientations 2–8 without a tag and swaps dims for 5–8', () => {
    const jpegBytes = encodeJpegPattern();
    const pngBytes = encodePngPattern();
    for (const orientation of [2, 3, 4, 5, 6, 7, 8] as const) {
      const bakedJpeg = normalizeImageOrientation(jpegWithOrientation(jpegBytes, orientation));
      const bakedPng = normalizeImageOrientation(pngWithOrientation(pngBytes, orientation));
      expect(getJpegOrientation(bakedJpeg)).toBeUndefined();
      expect(getPngOrientation(bakedPng)).toBeUndefined();

      const jpegDecoded = jpeg.decode(bakedJpeg, { useTArray: true, formatAsRGBA: true });
      const pngDecoded = UPNG.decode(
        bakedPng.buffer.slice(bakedPng.byteOffset, bakedPng.byteOffset + bakedPng.byteLength),
      );
      const expectSwap = orientation >= 5;
      const expectWidth = expectSwap ? PATTERN_HEIGHT : PATTERN_WIDTH;
      const expectHeight = expectSwap ? PATTERN_WIDTH : PATTERN_HEIGHT;
      expect(jpegDecoded.width).toBe(expectWidth);
      expect(jpegDecoded.height).toBe(expectHeight);
      expect(pngDecoded.width).toBe(expectWidth);
      expect(pngDecoded.height).toBe(expectHeight);
    }
  });

  it('throws when a tagged JPEG body cannot be decoded so callers can fall back', () => {
    const tagged = jpegWithOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 6);
    expect(() => normalizeImageOrientation(tagged)).toThrow();
  });
});

describe('image.pdf() orientation integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses baked (swapped) dims for an orientation-6 JPEG and is cache-stable', async () => {
    const value = toDataUrl('image/jpeg', jpegWithOrientation(encodeJpegPattern(), 6));
    const first = await renderImage(value);
    expect(first.drawImage).toHaveBeenCalledTimes(1);

    const drawArgs = first.drawImage.mock.calls[0][1] as { width: number; height: number };
    // 4×2 + orientation 6 → 2×4. Wide 40×20 box contain-fits to 10×20 mm.
    expect(drawArgs.width).toBeCloseTo(mm2pt(10));
    expect(drawArgs.height).toBeCloseTo(mm2pt(20));

    const keys = [...(first._cache.keys() as Iterable<string>)];
    expect(keys).toHaveLength(1);
    const cached = first._cache.get(keys[0]) as { width: number; height: number };
    expect(cached.width).toBe(PATTERN_HEIGHT);
    expect(cached.height).toBe(PATTERN_WIDTH);

    await image.pdf(first.arg);
    expect(first.drawImage).toHaveBeenCalledTimes(2);
    expect([...(first._cache.keys() as Iterable<string>)]).toHaveLength(1);
    const secondArgs = first.drawImage.mock.calls[1][1] as { width: number; height: number };
    expect(secondArgs.width).toBeCloseTo(drawArgs.width);
    expect(secondArgs.height).toBeCloseTo(drawArgs.height);
  });

  it('uses baked (swapped) dims for an orientation-6 PNG', async () => {
    const value = toDataUrl('image/png', pngWithOrientation(encodePngPattern(), 6));
    const { drawImage } = await renderImage(value);
    const drawArgs = drawImage.mock.calls[0][1] as { width: number; height: number };
    expect(drawArgs.width).toBeCloseTo(mm2pt(10));
    expect(drawArgs.height).toBeCloseTo(mm2pt(20));
  });

  it('warns and embeds original bytes when the bake throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // SOI + Exif APP1 + SOF0 (so pdf-lib can embed) + EOI. jpeg-js cannot decode
    // this — there is no scan data — so the bake throws and we fall back.
    const app1 = jpegApp1(exifPayload(6, true));
    const sof = new Uint8Array([
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x04, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11,
      0x01, 0x03, 0x11, 0x01,
    ]);
    const tagged = new Uint8Array(2 + app1.length + sof.length + 2);
    tagged[0] = 0xff;
    tagged[1] = 0xd8;
    tagged.set(app1, 2);
    tagged.set(sof, 2 + app1.length);
    tagged[tagged.length - 2] = 0xff;
    tagged[tagged.length - 1] = 0xd9;

    expect(() => normalizeImageOrientation(tagged)).toThrow();

    const value = toDataUrl('image/jpeg', tagged);
    const { drawImage, _cache } = await renderImage(value);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain('EXIF orientation bake failed');
    const cached = [..._cache.values()][0] as { width: number; height: number };
    expect(cached.width).toBe(PATTERN_WIDTH);
    expect(cached.height).toBe(PATTERN_HEIGHT);
  });
});
