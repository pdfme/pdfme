import { describe, expect, it } from 'vitest';
import { PAGE_SIZE_PRESETS, detectPaperSize, resolvePageSize } from '../src/index.js';

describe('resolvePageSize', () => {
  it('resolves A4 portrait by default', () => {
    expect(resolvePageSize()).toEqual(PAGE_SIZE_PRESETS.A4);
  });

  it('resolves a preset in landscape orientation', () => {
    expect(resolvePageSize('Letter', 'landscape')).toEqual({ width: 279.4, height: 215.9 });
  });

  it('resolves a custom size in landscape orientation', () => {
    expect(resolvePageSize({ width: 100, height: 200 }, 'landscape')).toEqual({
      width: 200,
      height: 100,
    });
  });

  it('rejects unknown presets', () => {
    expect(() => resolvePageSize('unknown' as never)).toThrow('unknown page size preset');
  });
});

describe('detectPaperSize', () => {
  it('detects A4 portrait', () => {
    expect(detectPaperSize(PAGE_SIZE_PRESETS.A4.width, PAGE_SIZE_PRESETS.A4.height)).toBe(
      'A4 portrait',
    );
  });

  it('detects A4 landscape', () => {
    expect(detectPaperSize(PAGE_SIZE_PRESETS.A4.height, PAGE_SIZE_PRESETS.A4.width)).toBe(
      'A4 landscape',
    );
  });

  it('detects Letter portrait with rounded dimensions', () => {
    expect(detectPaperSize(216, 279)).toBe('Letter portrait');
  });

  it('returns null for non-standard size', () => {
    expect(detectPaperSize(100, 100)).toBeNull();
  });
});
