import fs from 'fs';
import path from 'path';
import * as fontkit from 'fontkit';
import { describe, expect, test } from 'vitest';
import { getDefaultFont } from '@pdfme/common';
import { CustomFontEmbedder } from '@pdfme/pdf-lib';
import { getFontKitFont } from '../src/text/helper.js';

const UBUNTU = new Uint8Array(
  fs.readFileSync(path.join(__dirname, '../../pdf-lib/assets/fonts/ubuntu/Ubuntu-R.ttf')),
);

// Each call gets its own view of the font; the views of one parse have it as their prototype.
// The parse owns fontkit's tables: a font that is not a view (no caching) fails here.
const parsedFontOf = (font: object) => {
  const parsed = Object.getPrototypeOf(font);
  expect(Object.hasOwn(parsed, '_tables')).toBe(true);
  return parsed;
};

describe('getFontKitFont across generate calls', () => {
  test('parses the same font bytes once, with a font of its own per call', async () => {
    const font = { Ubuntu: { data: UBUNTU, fallback: true } };
    const first = await getFontKitFont('Ubuntu', font, new Map());
    const second = await getFontKitFont('Ubuntu', font, new Map());
    expect(second).not.toBe(first);
    expect(parsedFontOf(second)).toBe(parsedFontOf(first));
  });

  test('parses other bytes on their own, even with the same font name', async () => {
    const first = await getFontKitFont(
      'Ubuntu',
      { Ubuntu: { data: UBUNTU, fallback: true } },
      new Map(),
    );
    const copy = { Ubuntu: { data: UBUNTU.slice(), fallback: true } };
    expect(parsedFontOf(await getFontKitFont('Ubuntu', copy, new Map()))).not.toBe(
      parsedFontOf(first),
    );
  });

  test('parses font bytes given as an ArrayBuffer once', async () => {
    const font = { Ubuntu: { data: UBUNTU.slice().buffer, fallback: true } };
    const first = await getFontKitFont('Ubuntu', font, new Map());
    const second = await getFontKitFont('Ubuntu', font, new Map());
    expect(parsedFontOf(second)).toBe(parsedFontOf(first));
  });

  test('parses the default font once', async () => {
    const first = await getFontKitFont(undefined, getDefaultFont(), new Map());
    const second = await getFontKitFont(undefined, getDefaultFont(), new Map());
    expect(parsedFontOf(second)).toBe(parsedFontOf(first));
  });

  test('parses the font once for concurrent calls', async () => {
    const font = { Ubuntu: { data: UBUNTU.slice(), fallback: true } };
    const [first, second] = await Promise.all([
      getFontKitFont('Ubuntu', font, new Map()),
      getFontKitFont('Ubuntu', font, new Map()),
    ]);
    expect(parsedFontOf(second)).toBe(parsedFontOf(first));
  });

  test('shares the parse with embedding the font', async () => {
    const font = await getFontKitFont(
      'Ubuntu',
      { Ubuntu: { data: UBUNTU, fallback: true } },
      new Map(),
    );
    const embedder = await CustomFontEmbedder.for(
      fontkit as unknown as Parameters<typeof CustomFontEmbedder.for>[0],
      UBUNTU,
    );
    expect(parsedFontOf(embedder.font)).toBe(parsedFontOf(font));
  });
});
