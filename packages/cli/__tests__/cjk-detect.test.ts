import { describe, it, expect } from 'vitest';
import { containsCJK, detectCJKInTemplate, detectCJKInInputs } from '../src/cjk-detect.js';

describe('containsCJK', () => {
  it('detects Japanese hiragana', () => {
    expect(containsCJK('こんにちは')).toBe(true);
  });

  it('detects Japanese katakana', () => {
    expect(containsCJK('カタカナ')).toBe(true);
  });

  it('detects CJK ideographs', () => {
    expect(containsCJK('漢字')).toBe(true);
  });

  it('detects Korean', () => {
    expect(containsCJK('한국어')).toBe(true);
  });

  it('returns false for ASCII', () => {
    expect(containsCJK('Hello World')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(containsCJK('')).toBe(false);
  });

  it('detects mixed content', () => {
    expect(containsCJK('Hello 世界')).toBe(true);
  });
});

describe('detectCJKInTemplate', () => {
  it('detects CJK in schema content', () => {
    const template = {
      schemas: [[{ name: 'title', content: '請求書', type: 'text' }]],
    };
    expect(detectCJKInTemplate(template as any)).toBe(true);
  });

  it('returns false for ASCII content', () => {
    const template = {
      schemas: [[{ name: 'title', content: 'Invoice', type: 'text' }]],
    };
    expect(detectCJKInTemplate(template as any)).toBe(false);
  });
});

describe('detectCJKInInputs', () => {
  it('detects CJK in input values', () => {
    expect(detectCJKInInputs([{ name: '田中太郎' }])).toBe(true);
  });

  it('returns false for ASCII inputs', () => {
    expect(detectCJKInInputs([{ name: 'John Doe' }])).toBe(false);
  });
});
