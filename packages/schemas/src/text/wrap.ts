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

type WrapAtom = {
  text: string;
  required: boolean;
};

export const PARAGRAPH_SPLIT = /\r\n|\r|\n|\f|\v/g;

export const splitParagraphs = (value: string): string[] => value.split(PARAGRAPH_SPLIT);

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

const splitOverflowByGrapheme = (
  text: string,
  measure: (value: string) => number,
  maxWidth: number,
): string[] => {
  const graphemes = splitGraphemes(text);
  if (graphemes.length === 0) return [''];

  const pieces: string[] = [];
  let current = '';
  for (const grapheme of graphemes) {
    const next = current + grapheme;
    if (current !== '' && measure(next) > maxWidth) {
      pieces.push(current);
      current = grapheme;
    } else {
      current = next;
    }
  }
  if (current !== '') pieces.push(current);
  return pieces.length > 0 ? pieces : [''];
};

const wrapParagraph = (
  paragraph: string,
  measure: (value: string) => number,
  maxWidth: number,
): WrapLine[] => {
  const source = paragraph.trimEnd();
  if (source === '') {
    return [{ text: '', hardBreak: true }];
  }

  const lines: WrapLine[] = [];
  let current = '';

  const flush = (hardBreak: boolean) => {
    const text = current.trimEnd();
    current = '';
    if (text === '') {
      // Space-only atoms measure as empty after trimEnd. Do not invent a blank
      // soft line; promote the previous line when this flush ends the paragraph.
      if (!hardBreak) return;
      if (lines.length === 0) {
        lines.push({ text: '', hardBreak: true });
        return;
      }
      const last = lines[lines.length - 1];
      if (last) lines[lines.length - 1] = { ...last, hardBreak: true };
      return;
    }
    lines.push({ text, hardBreak });
  };

  const startLine = (atomText: string) => {
    if (atomText === '') {
      current = '';
      return;
    }
    if (measure(atomText.trimEnd()) <= maxWidth) {
      current = atomText;
    } else {
      appendOverflow(atomText);
    }
  };

  const appendOverflow = (atomText: string) => {
    const pieces = splitOverflowByGrapheme(atomText, measure, maxWidth);
    for (let index = 0; index < pieces.length - 1; index += 1) {
      const text = pieces[index]?.trimEnd() ?? '';
      if (text === '') continue;
      lines.push({ text, hardBreak: false });
    }
    // A leftover space after an overflowing word ("abcdef " → "abc"/"def"/" ")
    // must not become its own line or a space-only `current` that flushes empty.
    const remainder = pieces[pieces.length - 1] ?? '';
    current = remainder.trim() === '' ? '' : remainder;
  };

  for (const atom of getAtoms(source)) {
    if (current === '') {
      startLine(atom.text);
    } else if (measure((current + atom.text).trimEnd()) <= maxWidth) {
      current += atom.text;
    } else {
      flush(false);
      // Spaces that caused the wrap belong to the previous line; do not indent
      // the continuation. Paragraph-leading spaces still go through startLine
      // above because `current` is empty at the start of the paragraph.
      startLine(atom.text.replace(/^\s+/, ''));
    }

    if (atom.required) {
      flush(true);
    }
  }

  if (current !== '') {
    flush(true);
  } else if (lines.length === 0) {
    lines.push({ text: '', hardBreak: true });
  } else {
    lines[lines.length - 1] = { ...lines[lines.length - 1], hardBreak: true };
  }

  return lines;
};

export const wrapText = (
  value: string,
  measure: MeasureTextWidth,
  maxWidth: number,
): WrapLine[] => {
  const lines: WrapLine[] = [];
  for (const paragraph of splitParagraphs(value)) {
    lines.push(...wrapParagraph(paragraph, measure, maxWidth));
  }
  return lines.length > 0 ? lines : [{ text: '', hardBreak: true }];
};

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
