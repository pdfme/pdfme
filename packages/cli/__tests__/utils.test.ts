import { describe, it, expect } from 'vitest';
import { PAGE_SIZE_PRESETS } from '@pdfme/common';
import { detectPaperSize, parsePageRange, getImageOutputPaths } from '../src/utils.js';

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

  it('detects Letter portrait', () => {
    expect(detectPaperSize(216, 279)).toBe('Letter portrait');
  });

  it('returns null for non-standard size', () => {
    expect(detectPaperSize(100, 100)).toBeNull();
  });

  it('tolerates small differences', () => {
    expect(
      detectPaperSize(PAGE_SIZE_PRESETS.A4.width + 0.01, PAGE_SIZE_PRESETS.A4.height + 0.01),
    ).toBe('A4 portrait');
  });
});

describe('parsePageRange', () => {
  it('parses single page', () => {
    expect(parsePageRange('2', 5)).toEqual([2]);
  });

  it('parses range', () => {
    expect(parsePageRange('1-3', 5)).toEqual([1, 2, 3]);
  });

  it('parses comma-separated', () => {
    expect(parsePageRange('1,3,5', 5)).toEqual([1, 3, 5]);
  });

  it('parses mixed', () => {
    expect(parsePageRange('1-2,4', 5)).toEqual([1, 2, 4]);
  });

  it('rejects out-of-range segments', () => {
    expect(() => parsePageRange('1-10', 3)).toThrow('Pages must be between 1 and 3');
  });

  it('rejects invalid tokens', () => {
    expect(() => parsePageRange('nope', 3)).toThrow('Invalid page range segment');
  });
});

describe('getImageOutputPaths', () => {
  it('generates png paths', () => {
    expect(getImageOutputPaths('/tmp/out.pdf', 2)).toEqual(['/tmp/out-1.png', '/tmp/out-2.png']);
  });
});
