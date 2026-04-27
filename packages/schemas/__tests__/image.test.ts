import { describe, it, expect } from 'vitest';
import { PDFDocument } from '@pdfme/pdf-lib';
import * as pdfLib from '@pdfme/pdf-lib';
import { BLANK_PDF, type Schema, type PDFRenderProps } from '@pdfme/common';
import { image } from '../src/index.js';

describe('image plugin memory-safety', () => {
  it('does not pin the full base64 input as a cache key', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const _cache = new Map<string | number, unknown>();

    // A minimal but valid 1×1 PNG data URL is sufficient: we only need
    // embedPng to succeed so the render path reaches the cache; the
    // cache key is derived from `value` regardless of image size.
    const minimalPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1J' +
      'REFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=';

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
