import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from '@pdfme/pdf-lib';
import * as pdfLib from '@pdfme/pdf-lib';
import { BLANK_PDF, type Schema, type PDFRenderProps } from '@pdfme/common';
import { image } from '../src/index.js';
import { getImageFitLayout, type ImageSchema } from '../src/graphics/image.js';

const minimalPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1J' +
  'REFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=';

const getPropPanelSchema = (activeSchema: ImageSchema) => {
  if (typeof image.propPanel.schema !== 'function') {
    throw new Error('Expected image propPanel.schema to be a function');
  }

  return image.propPanel.schema({
    activeSchema: activeSchema as never,
    i18n: (key: string) => key,
  } as never);
};

describe('image plugin memory-safety', () => {
  it('does not pin the full base64 input as a cache key', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const _cache = new Map<string | number, unknown>();

    // A minimal but valid 1×1 PNG data URL is sufficient: we only need
    // embedPng to succeed so the render path reaches the cache; the
    // cache key is derived from `value` regardless of image size.
    const schema = {
      name: 'pic',
      type: 'image',
      content: minimalPng,
      position: { x: 0, y: 0 },
      width: 50,
      height: 50,
    } as unknown as Schema;

    const arg = {
      value: minimalPng,
      schema,
      basePdf: BLANK_PDF,
      pdfLib,
      pdfDoc,
      page,
      options: {},
      _cache,
    } as unknown as PDFRenderProps<Schema>;

    await image.pdf(arg);

    const keys = [...(_cache.keys() as Iterable<string>)];
    // Exactly one cache entry should have been created by the one pdf() call.
    expect(keys.length).toBe(1);
    // Regression guard: the cache key MUST be a fingerprint, not the raw
    // input. Before the fix, the key was `${schema.type}${value}` and its
    // byte length matched the input byte length. A tight bound of 100
    // chars catches any regression back to that behaviour — the current
    // fingerprint format (`${type}:${len}:${fnv1a-hex}`) stays well under
    // 40 even for huge inputs.
    expect(keys[0].length).toBeLessThan(100);
    // Schema type must still be part of the key so different plugins
    // can't collide on the same shared cache Map.
    expect(keys[0].startsWith('image')).toBe(true);
    // Same input hitting the cache a second time must be a cache hit, not
    // a new entry — proves the fingerprint is deterministic.
    await image.pdf(arg);
    expect([...(_cache.keys() as Iterable<string>)].length).toBe(1);
  });

  it('distinguishes different images via the fingerprint', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const _cache = new Map<string | number, unknown>();

    const pngA =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1J' +
      'REFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=';
    // Same size/header/trailer shape as pngA but different middle bytes —
    // the fingerprint must still distinguish them. Because the key is a
    // hash over every byte, any differing byte flips the hash with
    // overwhelming probability.
    const pngB =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAD8S7TTAAAAAXNSR0IArs4c6QAAAA1J' +
      'REFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=';

    const base = {
      name: 'pic',
      type: 'image',
      position: { x: 0, y: 0 },
      width: 50,
      height: 50,
    };

    const argA = {
      value: pngA,
      schema: { ...base, content: pngA } as unknown as Schema,
      basePdf: BLANK_PDF,
      pdfLib,
      pdfDoc,
      page,
      options: {},
      _cache,
    } as unknown as PDFRenderProps<Schema>;

    const argB = { ...argA, value: pngB, schema: { ...base, content: pngB } as unknown as Schema };

    await image.pdf(argA);
    await image.pdf(argB);

    // Two different images must produce two distinct cache entries.
    expect([...(_cache.keys() as Iterable<string>)].length).toBe(2);
  });
});

describe('image fit and position', () => {
  it('defaults missing fit fields to contain centered placement', () => {
    expect(
      getImageFitLayout({
        sourceWidth: 200,
        sourceHeight: 100,
        boxWidth: 100,
        boxHeight: 100,
      }),
    ).toMatchObject({
      objectFit: 'contain',
      objectPosition: 'center center',
      width: 100,
      height: 50,
      offsetX: 0,
      offsetY: 25,
    });
  });

  it('aligns contained images within the leftover space', () => {
    expect(
      getImageFitLayout({
        sourceWidth: 200,
        sourceHeight: 100,
        boxWidth: 100,
        boxHeight: 100,
        objectFit: 'contain',
        objectPosition: 'left top',
      }),
    ).toMatchObject({ offsetX: 0, offsetY: 0 });

    expect(
      getImageFitLayout({
        sourceWidth: 200,
        sourceHeight: 100,
        boxWidth: 100,
        boxHeight: 100,
        objectFit: 'contain',
        objectPosition: 'right bottom',
      }),
    ).toMatchObject({ offsetX: 0, offsetY: 50 });

    expect(
      getImageFitLayout({
        sourceWidth: 100,
        sourceHeight: 200,
        boxWidth: 100,
        boxHeight: 100,
        objectFit: 'contain',
        objectPosition: 'right bottom',
      }),
    ).toMatchObject({ offsetX: 50, offsetY: 0 });
  });

  it('cover center-crops and ignores stored objectPosition', () => {
    expect(
      getImageFitLayout({
        sourceWidth: 200,
        sourceHeight: 100,
        boxWidth: 100,
        boxHeight: 100,
        objectFit: 'cover',
        objectPosition: 'left top',
      }),
    ).toMatchObject({
      objectFit: 'cover',
      objectPosition: 'center center',
      width: 200,
      height: 100,
      offsetX: -50,
      offsetY: 0,
    });
  });

  it('hides objectPosition in the prop panel only for cover', () => {
    const containSchema = getPropPanelSchema({
      name: 'pic',
      type: 'image',
      position: { x: 0, y: 0 },
      width: 40,
      height: 40,
      objectFit: 'contain',
    });
    expect(containSchema.objectPosition.hidden).toBe(false);

    const coverSchema = getPropPanelSchema({
      name: 'pic',
      type: 'image',
      position: { x: 0, y: 0 },
      width: 40,
      height: 40,
      objectFit: 'cover',
      objectPosition: 'right bottom',
    });
    expect(coverSchema.objectPosition.hidden).toBe(true);
  });

  it('clips PDF rendering for cover images', async () => {
    const embedPng = vi.fn(async () => ({ width: 200, height: 100 }));
    const drawImage = vi.fn();
    const pushOperators = vi.fn();
    const schema = {
      name: 'pic',
      type: 'image',
      content: minimalPng,
      position: { x: 0, y: 0 },
      width: 40,
      height: 40,
      objectFit: 'cover',
      objectPosition: 'left top',
    } as ImageSchema;

    await image.pdf({
      value: minimalPng,
      schema,
      basePdf: BLANK_PDF,
      pdfLib,
      pdfDoc: { embedPng } as never,
      page: { getHeight: () => 200, drawImage, pushOperators } as never,
      options: {},
      _cache: new Map<string | number, unknown>(),
    } as unknown as PDFRenderProps<ImageSchema>);

    expect(pushOperators).toHaveBeenCalledTimes(2);
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
    const drawOptions = drawImage.mock.calls[0][1] as { width: number; height: number };
    expect(drawOptions.width).toBeGreaterThan(drawOptions.height);
  });
});
