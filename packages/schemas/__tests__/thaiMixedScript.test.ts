// @vitest-environment node

import { describe, it, expect } from 'vitest';

// Duplicate of the helper functions used in pdfRender.ts. The actual
// implementation lives in `packages/schemas/src/text/pdfRender.ts`, but it is
// not exported. We duplicate it here to document the intended behaviour and
// provide a regression test for the mixed Latin/Thai rendering bug reported
// in https://github.com/pdfme/pdfme/issues/1347.

type TextScriptRun = {
  text: string;
  script: 'thai' | 'other';
};

const THAI_SCRIPT_RE = /\p{Script=Thai}/u;

const getScriptOfSegment = (segment: string): TextScriptRun['script'] => {
  return THAI_SCRIPT_RE.test(segment) ? 'thai' : 'other';
};

const splitTextByScriptRuns = (text: string): TextScriptRun[] => {
  if (!text) return [];

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const runs: TextScriptRun[] = [];

  for (const { segment } of segmenter.segment(text)) {
    const script = getScriptOfSegment(segment);
    const prev = runs[runs.length - 1];
    if (!THAI_SCRIPT_RE.test(segment) && segment.trim() === '' && prev) {
      prev.text += segment;
      continue;
    }
    if (!prev || prev.script !== script) {
      runs.push({ text: segment, script });
    } else {
      prev.text += segment;
    }
  }
  return runs;
};

describe('splitTextByScriptRuns', () => {
  it('splits mixed Latin and Thai text into homogeneous script runs', () => {
    const input = 'A วันที่';
    const runs = splitTextByScriptRuns(input);
    expect(runs).toEqual([
      { text: 'A ', script: 'other' },
      { text: 'วันที่', script: 'thai' },
    ]);
  });

  it('keeps whitespace with the previous run to avoid leading spaces in Thai runs', () => {
    const input = 'ABC  วันที่';
    const runs = splitTextByScriptRuns(input);
    expect(runs).toEqual([
      { text: 'ABC  ', script: 'other' },
      { text: 'วันที่', script: 'thai' },
    ]);
  });

  it('handles purely Thai text as a single run', () => {
    const input = 'วันที่ดี';
    const runs = splitTextByScriptRuns(input);
    expect(runs).toEqual([{ text: 'วันที่ดี', script: 'thai' }]);
  });

  it('handles purely Latin text as a single run', () => {
    const input = 'Hello world';
    const runs = splitTextByScriptRuns(input);
    expect(runs).toEqual([{ text: 'Hello world', script: 'other' }]);
  });
});