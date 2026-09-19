import { collectUax14Breaks, isSaCodePoint, type LineBreakOpportunity } from './lineBreak.js';

/**
 * One visual line produced by the shared wrap engine.
 *
 * `hardBreak` is true for the last line of a source paragraph (including a
 * blank paragraph). Soft-wrapped continuation lines are `hardBreak: false`.
 *
 * Viewer must draw these objects with `white-space: pre` and must not feed
 * `splitTextToSize` facade strings into `pre`: the facade suffixes hard lines
 * with `\n`, which would render as an extra blank line.
 */
export type WrapLine = {
  text: string;
  hardBreak: boolean;
};

export type MeasureTextWidth = (text: string) => number;

export type StyledRunInput<T> = {
  text: string;
  measure: (text: string) => number;
  style: T;
};

export type StyledLayoutSpan<T> = {
  text: string;
  width: number;
  style: T;
};

export type StyledLayoutLine<T> = {
  spans: StyledLayoutSpan<T>[];
  text: string;
  width: number;
  hardBreak: boolean;
};

export type AlignedLayoutLine<T> = StyledLayoutLine<T> & {
  x: number;
  extraLetterSpacing: number;
};

type WrapAtom = {
  text: string;
  required: boolean;
};

type LineRange = {
  start: number;
  end: number;
  hardBreak: boolean;
};

type RunRange<T> = {
  start: number;
  end: number;
  run: StyledRunInput<T>;
};

export const PARAGRAPH_SPLIT = /\r\n|\r|\n|\f|\v/g;

export const splitParagraphs = (value: string): string[] => value.split(PARAGRAPH_SPLIT);

const splitParagraphsWithOffsets = (value: string): { start: number; end: number }[] => {
  const result: { start: number; end: number }[] = [];
  let previous = 0;
  for (const match of value.matchAll(PARAGRAPH_SPLIT)) {
    result.push({ start: previous, end: match.index });
    previous = match.index + match[0].length;
  }
  result.push({ start: previous, end: value.length });
  return result;
};

let wordSegmenter: Intl.Segmenter | undefined;
let graphemeSegmenter: Intl.Segmenter | undefined;

const getWordSegmenter = (): Intl.Segmenter | undefined => {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter === 'undefined') {
    return undefined;
  }
  wordSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'word' });
  return wordSegmenter;
};

const getGraphemeSegmenter = (): Intl.Segmenter | undefined => {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter === 'undefined') {
    return undefined;
  }
  graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return graphemeSegmenter;
};

export const splitGraphemes = (text: string): string[] => {
  const segmenter = getGraphemeSegmenter();
  if (!segmenter) {
    return Array.from(text);
  }
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
};

export const countGraphemes = (text: string): number => splitGraphemes(text).length;

const collectSaDictionaryBreaks = (text: string): LineBreakOpportunity[] => {
  const segmenter = getWordSegmenter();
  if (!segmenter) return [];

  const breaks: LineBreakOpportunity[] = [];
  let index = 0;
  while (index < text.length) {
    const codePoint = text.codePointAt(index);
    if (codePoint === undefined) break;
    const unitLength = codePoint > 0xffff ? 2 : 1;
    if (!isSaCodePoint(codePoint)) {
      index += unitLength;
      continue;
    }

    const start = index;
    index += unitLength;
    while (index < text.length) {
      const next = text.codePointAt(index);
      if (next === undefined || !isSaCodePoint(next)) break;
      index += next > 0xffff ? 2 : 1;
    }

    let offset = start;
    for (const { segment } of segmenter.segment(text.slice(start, index))) {
      offset += segment.length;
      if (offset > start && offset < index) {
        breaks.push({ position: offset, required: false });
      }
    }
  }
  return breaks;
};

const mergeBreaks = (
  primary: LineBreakOpportunity[],
  extra: LineBreakOpportunity[],
): LineBreakOpportunity[] => {
  const requiredByPosition = new Map<number, boolean>();
  for (const item of primary) {
    requiredByPosition.set(item.position, item.required);
  }
  for (const item of extra) {
    if (!requiredByPosition.has(item.position)) {
      requiredByPosition.set(item.position, item.required);
    }
  }
  return [...requiredByPosition.entries()]
    .map(([position, required]) => ({ position, required }))
    .sort((left, right) => left.position - right.position);
};

const getAtoms = (text: string): WrapAtom[] => {
  const breaks = mergeBreaks(collectUax14Breaks(text), collectSaDictionaryBreaks(text));
  const atoms: WrapAtom[] = [];
  let previous = 0;
  for (const item of breaks) {
    if (item.position <= previous) continue;
    atoms.push({
      text: text.slice(previous, item.position),
      required: item.required,
    });
    previous = item.position;
  }
  if (previous < text.length) {
    atoms.push({ text: text.slice(previous), required: true });
  }
  return atoms;
};

const trimEndIndex = (source: string, start: number, end: number): number => {
  let index = end;
  while (index > start && /\s/.test(source[index - 1] ?? '')) {
    index -= 1;
  }
  return index;
};

const skipLeadingSpace = (source: string, start: number, end: number): number => {
  let index = start;
  while (index < end && /\s/.test(source[index] ?? '')) {
    index += 1;
  }
  return index;
};

const isSpaceOnly = (source: string, start: number, end: number): boolean =>
  source.slice(start, end).trim() === '';

const splitOverflowByGraphemeRange = (
  source: string,
  start: number,
  end: number,
  measure: (from: number, to: number) => number,
  maxWidth: number,
): { start: number; end: number }[] => {
  const graphemes = splitGraphemes(source.slice(start, end));
  if (graphemes.length === 0) return [{ start, end }];

  const pieces: { start: number; end: number }[] = [];
  let pieceStart = start;
  let position = start;
  for (const grapheme of graphemes) {
    const next = position + grapheme.length;
    if (position !== pieceStart && measure(pieceStart, next) > maxWidth) {
      pieces.push({ start: pieceStart, end: position });
      pieceStart = position;
    }
    position = next;
  }
  if (position > pieceStart || pieces.length === 0) {
    pieces.push({ start: pieceStart, end: position });
  }
  return pieces;
};

/**
 * Wrap one paragraph (already split on hard breaks, trailing whitespace trimmed).
 *
 * Style boundaries are not break opportunities: callers pass a measure that
 * walks styled runs, but atoms come from UAX #14 + SA on the concatenated text.
 *
 * A word that still fits on a full line stays together on the next line. A word
 * wider than the box fills the remaining width of the current line first, then
 * splits at grapheme boundaries — never “move wholly, then split”.
 */
const wrapParagraphRanges = (
  source: string,
  measureRaw: (start: number, end: number) => number,
  maxWidth: number,
): LineRange[] => {
  if (source === '') {
    return [{ start: 0, end: 0, hardBreak: true }];
  }

  const measure = (start: number, end: number) => {
    const trimmed = trimEndIndex(source, start, end);
    if (trimmed <= start) return 0;
    return measureRaw(start, trimmed);
  };

  const lines: LineRange[] = [];
  let currentStart = 0;
  let currentEnd = 0;
  let hasCurrent = false;

  const emit = (start: number, end: number, hardBreak: boolean) => {
    const trimmed = trimEndIndex(source, start, end);
    if (trimmed <= start) {
      if (!hardBreak) return;
      if (lines.length === 0) {
        lines.push({ start: 0, end: 0, hardBreak: true });
        return;
      }
      const last = lines[lines.length - 1];
      if (last) lines[lines.length - 1] = { ...last, hardBreak: true };
      return;
    }
    lines.push({ start, end: trimmed, hardBreak });
  };

  const flush = (hardBreak: boolean) => {
    if (!hasCurrent) {
      if (!hardBreak) return;
      if (lines.length === 0) {
        lines.push({ start: 0, end: 0, hardBreak: true });
        return;
      }
      const last = lines[lines.length - 1];
      if (last) lines[lines.length - 1] = { ...last, hardBreak: true };
      return;
    }
    emit(currentStart, currentEnd, hardBreak);
    hasCurrent = false;
  };

  const appendOverflow = (start: number, end: number) => {
    let position = start;
    if (hasCurrent) {
      const graphemes = splitGraphemes(source.slice(start, end));
      let takenEnd = start;
      for (const grapheme of graphemes) {
        const next = takenEnd + grapheme.length;
        if (measure(currentStart, next) > maxWidth) break;
        takenEnd = next;
      }
      if (takenEnd > start) {
        currentEnd = takenEnd;
        flush(false);
        position = takenEnd;
      } else {
        flush(false);
      }
    }

    if (position >= end) return;

    const pieces = splitOverflowByGraphemeRange(source, position, end, measure, maxWidth);
    for (let index = 0; index < pieces.length - 1; index += 1) {
      const piece = pieces[index];
      if (!piece) continue;
      const trimmed = trimEndIndex(source, piece.start, piece.end);
      if (trimmed <= piece.start) continue;
      lines.push({ start: piece.start, end: trimmed, hardBreak: false });
    }
    const remainder = pieces[pieces.length - 1];
    if (!remainder || isSpaceOnly(source, remainder.start, remainder.end)) {
      hasCurrent = false;
      return;
    }
    currentStart = remainder.start;
    currentEnd = remainder.end;
    hasCurrent = true;
  };

  const startLine = (start: number, end: number) => {
    if (start >= end) {
      hasCurrent = false;
      return;
    }
    if (measure(start, end) <= maxWidth) {
      currentStart = start;
      currentEnd = end;
      hasCurrent = true;
    } else {
      hasCurrent = false;
      appendOverflow(start, end);
    }
  };

  let cursor = 0;
  for (const atom of getAtoms(source)) {
    const atomStart = cursor;
    const atomEnd = cursor + atom.text.length;
    cursor = atomEnd;

    if (!hasCurrent) {
      startLine(atomStart, atomEnd);
    } else if (measure(currentStart, atomEnd) <= maxWidth) {
      currentEnd = atomEnd;
    } else if (measure(atomStart, atomEnd) <= maxWidth) {
      flush(false);
      startLine(skipLeadingSpace(source, atomStart, atomEnd), atomEnd);
    } else {
      appendOverflow(atomStart, atomEnd);
    }

    if (atom.required) {
      flush(true);
    }
  }

  if (hasCurrent) {
    flush(true);
  } else if (lines.length === 0) {
    lines.push({ start: 0, end: 0, hardBreak: true });
  } else {
    const last = lines[lines.length - 1];
    if (last) lines[lines.length - 1] = { ...last, hardBreak: true };
  }

  return lines;
};

const measureStyledSlice = <T>(
  runRanges: RunRange<T>[],
  start: number,
  end: number,
  characterSpacing: number,
): number => {
  let width = 0;
  let hasText = false;
  for (const { start: runStart, end: runEnd, run } of runRanges) {
    const sliceStart = Math.max(start, runStart);
    const sliceEnd = Math.min(end, runEnd);
    if (sliceStart >= sliceEnd) continue;
    const text = run.text.slice(sliceStart - runStart, sliceEnd - runStart);
    if (!text) continue;
    if (hasText) width += characterSpacing;
    width += run.measure(text);
    hasText = true;
  }
  return width;
};

const sliceStyledSpans = <T>(
  runRanges: RunRange<T>[],
  start: number,
  end: number,
): StyledLayoutSpan<T>[] => {
  const spans: StyledLayoutSpan<T>[] = [];
  for (const { start: runStart, end: runEnd, run } of runRanges) {
    const sliceStart = Math.max(start, runStart);
    const sliceEnd = Math.min(end, runEnd);
    if (sliceStart >= sliceEnd) continue;
    const text = run.text.slice(sliceStart - runStart, sliceEnd - runStart);
    if (!text) continue;
    spans.push({
      text,
      width: run.measure(text),
      style: run.style,
    });
  }
  return spans;
};

const lineWidthFromSpans = <T>(spans: StyledLayoutSpan<T>[], characterSpacing: number): number => {
  let width = 0;
  spans.forEach((span, index) => {
    if (index > 0) width += characterSpacing;
    width += span.width;
  });
  return width;
};

/**
 * Shared wrap for plain text (one style) and inline Markdown (many styles).
 * Break opportunities come from the concatenated visual text; each span is
 * measured with its own font/style.
 */
export const layoutStyledRuns = <T>(
  runs: StyledRunInput<T>[],
  maxWidth: number,
  options?: { characterSpacing?: number },
): StyledLayoutLine<T>[] => {
  const characterSpacing = options?.characterSpacing ?? 0;
  const runRanges: RunRange<T>[] = [];
  let offset = 0;
  for (const run of runs) {
    runRanges.push({ start: offset, end: offset + run.text.length, run });
    offset += run.text.length;
  }
  const fullText = runs.map((run) => run.text).join('');
  const lines: StyledLayoutLine<T>[] = [];

  for (const paragraph of splitParagraphsWithOffsets(fullText)) {
    const raw = fullText.slice(paragraph.start, paragraph.end);
    const source = raw.trimEnd();
    const origin = paragraph.start;
    const ranges = wrapParagraphRanges(
      source,
      (start, end) => measureStyledSlice(runRanges, origin + start, origin + end, characterSpacing),
      maxWidth,
    );
    for (const range of ranges) {
      const spans = sliceStyledSpans(runRanges, origin + range.start, origin + range.end);
      const text = source.slice(range.start, range.end);
      lines.push({
        spans,
        text,
        width: lineWidthFromSpans(spans, characterSpacing),
        hardBreak: range.hardBreak,
      });
    }
  }

  return lines.length > 0 ? lines : [{ spans: [], text: '', width: 0, hardBreak: true }];
};

export const getLineAlignment = (
  line: { text: string; width: number; hardBreak: boolean },
  boxWidth: number,
  alignment: string,
): { x: number; extraLetterSpacing: number; usedWidth: number } => {
  let extraLetterSpacing = 0;
  let usedWidth = line.width;
  if (alignment === 'justify' && !line.hardBreak) {
    const graphemeCount = countGraphemes(line.text);
    if (graphemeCount > 0) {
      extraLetterSpacing = (boxWidth - line.width) / graphemeCount;
      usedWidth = boxWidth;
    }
  }
  let x = 0;
  if (alignment === 'center') {
    x = (boxWidth - usedWidth) / 2;
  } else if (alignment === 'right') {
    x = boxWidth - usedWidth;
  }
  return { x, extraLetterSpacing, usedWidth };
};

export const alignLayoutLines = <T>(
  lines: StyledLayoutLine<T>[],
  boxWidth: number,
  alignment: string,
): AlignedLayoutLine<T>[] =>
  lines.map((line) => {
    const { x, extraLetterSpacing } = getLineAlignment(line, boxWidth, alignment);
    return { ...line, x, extraLetterSpacing };
  });

export const wrapText = (value: string, measure: MeasureTextWidth, maxWidth: number): WrapLine[] =>
  layoutStyledRuns([{ text: value, measure, style: undefined }], maxWidth).map((line) => ({
    text: line.text,
    hardBreak: line.hardBreak,
  }));

/**
 * Legacy `splitTextToSize` shape: hard (paragraph-ending) lines are suffixed
 * with `\n` so PDF justify can skip them. Empty hard lines stay `''` — not
 * `'\n'` — matching historical output.
 *
 * Do not join these strings into a `white-space: pre` Viewer. Use `WrapLine`
 * objects instead; the suffix would paint an extra blank line.
 */
export const toLegacySplitLines = (lines: WrapLine[]): string[] =>
  lines.map((line) => {
    if (line.text === '') return '';
    return line.hardBreak ? `${line.text}\n` : line.text;
  });
