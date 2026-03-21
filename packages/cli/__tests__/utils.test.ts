import { describe, it, expect } from 'vitest';
import { detectPaperSize, parsePageRange, getImageOutputPaths } from '../src/utils.js';

describe('detectPaperSize', () => {
  it('detects A4 portrait', () => {
    expect(detectPaperSize(210, 297)).toBe('A4 portrait');
  });

  it('detects A4 landscape', () => {
    expect(detectPaperSize(297, 210)).toBe('A4 landscape');
  });

  it('detects Letter portrait', () => {
    expect(detectPaperSize(216, 279)).toBe('Letter portrait');
  });

  it('returns null for non-standard size', () => {
    expect(detectPaperSize(100, 100)).toBeNull();
  });

  it('tolerates small differences', () => {
    expect(detectPaperSize(210.01, 297.01)).toBe('A4 portrait');
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

  it('clamps to total pages', () => {
    expect(parsePageRange('1-10', 3)).toEqual([1, 2, 3]);
  });

  it('ignores out of range', () => {
    expect(parsePageRange('0,6', 3)).toEqual([]);
  });
});

describe('getImageOutputPaths', () => {
  it('generates png paths', () => {
    expect(getImageOutputPaths('/tmp/out.pdf', 2, 'png')).toEqual([
      '/tmp/out-1.png',
      '/tmp/out-2.png',
    ]);
  });

  it('generates jpg paths', () => {
    expect(getImageOutputPaths('/tmp/out.pdf', 1, 'jpeg')).toEqual(['/tmp/out-1.jpg']);
  });
});
