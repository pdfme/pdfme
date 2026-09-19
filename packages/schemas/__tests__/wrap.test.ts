import type { Font as FontKitFont } from 'fontkit';
import { mm2pt } from '@pdfme/common';
import { calculateDynamicFontSize, splitTextToSize, wrapTextToSize } from '../src/text/helper.js';
import { CJ, getRawLineBreakClass, IS, QU, SA } from '../src/text/lineBreak.js';
import {
  LINE_BREAK_SOURCE_SHA256,
  LINE_BREAK_UNICODE_VERSION,
} from '../src/text/lineBreakClasses.generated.js';
import {
  getRichTextLineText,
  layoutRichTextLines,
  type ResolvedRichTextRun,
} from '../src/text/richText.js';
import { toLegacySplitLines, type WrapLine } from '../src/text/wrap.js';
import type { TextSchema } from '../src/text/types.js';

const createMockFont = (advanceWidth = 500) =>
  ({
    unitsPerEm: 1000,
    ascent: 800,
    descent: -200,
    bbox: { maxY: 800, minY: -200 },
    layout: (text: string) => ({
      glyphs: Array.from(text, () => ({ advanceWidth })),
    }),
    hasGlyphForCodePoint: () => true,
  }) as unknown as FontKitFont;

const wrap = (value: string, boxWidthInPt: number, fontSize = 10, characterSpacing = 0) =>
  wrapTextToSize({
    value,
    characterSpacing,
    boxWidthInPt,
    fontSize,
    fontKitFont: createMockFont(),
  });

const lineTexts = (lines: WrapLine[]) => lines.map((line) => line.text);

describe('UCD line-break classes', () => {
  it('pins the generated table to a Unicode version and checksum', () => {
    expect(LINE_BREAK_UNICODE_VERSION).toBe('18.0.0');
    expect(LINE_BREAK_SOURCE_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('classifies the #1115 punctuation that used to orphan', () => {
    expect(getRawLineBreakClass(':'.codePointAt(0)!)).toBe(IS);
    expect(getRawLineBreakClass("'".codePointAt(0)!)).toBe(QU);
    expect(getRawLineBreakClass('‘'.codePointAt(0)!)).toBe(QU);
    expect(getRawLineBreakClass('’'.codePointAt(0)!)).toBe(QU);
    expect(getRawLineBreakClass('ぁ'.codePointAt(0)!)).toBe(CJ);
    expect(getRawLineBreakClass('ก'.codePointAt(0)!)).toBe(SA);
    expect(getRawLineBreakClass('ก'.codePointAt(0)!)).toBe(SA);
    expect(getRawLineBreakClass('ກ'.codePointAt(0)!)).toBe(SA);
    expect(getRawLineBreakClass('ក'.codePointAt(0)!)).toBe(SA);
  });
});

describe('shared wrap engine (#1115)', () => {
  it('keeps König: together instead of orphaning the colon', () => {
    // 11 even-width glyphs fit on a line. "Party-König" is 11, ":" is a
    // separate word-segmenter atom today, so the old packer started the next
    // line with ":". UAX #14 forbids a break before IS.
    const lines = wrap('Party-König: oder die', 55);
    expect(lineTexts(lines).some((text) => text.startsWith(':'))).toBe(false);
    expect(lineTexts(lines).some((text) => text.includes('König:'))).toBe(true);
  });

  it('keeps a curly opening quote attached to the following word', () => {
    // 7 even-width glyphs/line. "die " fits, "die ‘Party" does not, so the
    // wrap must start the next line with the quote still glued to Party.
    const lines = wrap('die ‘Party kommt', 35);
    expect(lineTexts(lines).some((text) => text === '‘' || text.endsWith('‘'))).toBe(false);
    expect(lineTexts(lines).some((text) => text.startsWith('‘Party'))).toBe(true);
  });

  it('does not split a possessive straight apostrophe onto the next line', () => {
    const lines = wrap("companies' obligations", 50);
    expect(lineTexts(lines).some((text) => text.startsWith("'"))).toBe(false);
    expect(lineTexts(lines).join(' ')).toContain("companies'");
  });

  it('does not let Japanese small kana start a line (CJ→NS)', () => {
    const lines = wrap('これはきょーです', 15);
    expect(lineTexts(lines).some((text) => text.startsWith('ょ'))).toBe(false);
  });

  it('does not let a Japanese closer start a line', () => {
    const lines = wrap('これは。文章です', 15);
    expect(lineTexts(lines).some((text) => text.startsWith('。'))).toBe(false);
  });

  it('splits an unbreakable run at grapheme boundaries', () => {
    const lines = wrap('abcdef', 25);
    expect(lineTexts(lines)).toEqual(['abcde', 'f']);
    expect(lines[0]?.hardBreak).toBe(false);
    expect(lines[1]?.hardBreak).toBe(true);
  });

  it('does not emit a blank line from a space-only wrap atom', () => {
    const lines = wrap('aaa    bbb', 20);
    expect(lineTexts(lines)).toEqual(['aaa', 'bbb']);
    expect(lines.some((line) => line.text === '')).toBe(false);
  });

  it('keeps paragraph indentation while dropping wrap-leading spaces', () => {
    const lines = wrap('hello\n  world', 100);
    expect(lines).toEqual([
      { text: 'hello', hardBreak: true },
      { text: '  world', hardBreak: true },
    ]);
  });

  it('does not emit an empty line from leftover space after an overflow split', () => {
    // Monospaced 3-char width (5pt/glyph at 10pt). "abcdef " overflows, and
    // the trailing space used to become its own line before "xyz".
    const lines = wrap('abcdef xyz', 15);
    expect(lineTexts(lines)).toEqual(['abc', 'def', 'xyz']);
    expect(lines.map((line) => line.hardBreak)).toEqual([false, false, true]);
    expect(
      splitTextToSize({
        value: 'abcdef xyz',
        characterSpacing: 0,
        boxWidthInPt: 15,
        fontSize: 10,
        fontKitFont: createMockFont(),
      }),
    ).toEqual(['abc', 'def', 'xyz\n']);
  });

  it('marks only the last line of a paragraph as a hard break', () => {
    const lines = wrap('aaa bbb ccc', 15);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(0, -1).every((line) => !line.hardBreak)).toBe(true);
    expect(lines.at(-1)?.hardBreak).toBe(true);
  });

  it('treats CRLF as one paragraph break, matching LF', () => {
    const crlf = wrap('hello\r\nworld', 100);
    const lf = wrap('hello\nworld', 100);
    expect(lineTexts(crlf)).toEqual(['hello', 'world']);
    expect(lineTexts(crlf)).toEqual(lineTexts(lf));
    expect(crlf).toHaveLength(2);
  });

  it('counts the same lines for dynamic font size and wrap on CRLF', () => {
    const fontKitFont = createMockFont();
    const textSchema = {
      type: 'text',
      position: { x: 0, y: 0 },
      width: 50,
      height: 20,
      fontSize: 10,
      lineHeight: 1,
      characterSpacing: 0,
      dynamicFontSize: { min: 4, max: 20, fit: 'vertical' },
    } as TextSchema;
    const crlf = calculateDynamicFontSize({
      textSchema,
      fontKitFont,
      value: 'hello\r\nworld',
    });
    const lf = calculateDynamicFontSize({
      textSchema,
      fontKitFont,
      value: 'hello\nworld',
    });
    expect(wrap('hello\r\nworld', 100)).toHaveLength(2);
    expect(crlf).toBe(lf);
  });

  it('preserves blank paragraphs as empty hard lines', () => {
    const lines = wrap('hello\n\nworld', 100);
    expect(lines).toEqual([
      { text: 'hello', hardBreak: true },
      { text: '', hardBreak: true },
      { text: 'world', hardBreak: true },
    ]);
  });

  it('converts structured lines to the legacy facade without turning blanks into extra pre lines', () => {
    const legacy = toLegacySplitLines(wrap('hello\n\nworld', 100));
    expect(legacy).toEqual(['hello\n', '', 'world\n']);
  });

  it('keeps splitTextToSize as a facade over the same lines', () => {
    const value = "Party-König: oder die ‘Party’ companies' word";
    const args = {
      value,
      characterSpacing: 0,
      boxWidthInPt: 55,
      fontSize: 10,
      fontKitFont: createMockFont(),
    };
    const structured = wrapTextToSize(args);
    expect(splitTextToSize(args)).toEqual(toLegacySplitLines(structured));
  });

  it('uses the SA word-segmenter dictionary for Thai when ICU can split words', () => {
    const thai = 'ประเทศไทยเป็นประเทศในเอเชียตะวันออกเฉียงใต้';
    const wordLikes = [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(thai)]
      .filter((segment) => segment.isWordLike)
      .map((segment) => segment.segment);
    if (wordLikes.length < 2) return;

    const lines = wrap(thai, 40);
    expect(lines.length).toBeGreaterThan(1);
    const joined = lineTexts(lines).join('');
    expect(joined).toBe(thai);
    expect(lineTexts(lines).every((text) => text.length > 1 || thai.includes(text))).toBe(true);
  });

  it('fills remaining current-line width before splitting a word wider than the box', () => {
    const lines = wrap('xx abcdefgh', 20);
    expect(lineTexts(lines)).toEqual(['xx a', 'bcde', 'fgh']);
    expect(lines.map((line) => line.hardBreak)).toEqual([false, false, true]);
  });

  it('does not split grapheme clusters when overflowing', () => {
    const lines = wrap('aaaé́bbb', 15);
    const joined = lineTexts(lines).join('');
    expect(joined.replace(/\s/g, '')).toBe('aaaé́bbb'.replace(/\s/g, ''));
    expect(lineTexts(lines).some((text) => text.includes('\u0301') && !text.includes('é'))).toBe(
      false,
    );
  });
});

const richLines = (value: string, boxWidthInPt: number, fontSize = 10) => {
  const run: ResolvedRichTextRun = {
    text: value,
    fontName: 'Base',
    fontKitFont: createMockFont(),
    syntheticBold: false,
    syntheticItalic: false,
  };
  return layoutRichTextLines({
    runs: [run],
    fontSize,
    characterSpacing: 0,
    boxWidthInPt,
  });
};

describe('shared styled-run layout (plain === markdown)', () => {
  it('matches plain wrap for undecorated markdown runs', () => {
    const value = "Party-König: oder die ‘Party’ companies' word\n\nnext";
    const plain = wrap(value, 55);
    const markdown = richLines(value, 55);
    expect(markdown.map(getRichTextLineText)).toEqual(lineTexts(plain));
    expect(markdown.map((line) => line.hardBreak)).toEqual(plain.map((line) => line.hardBreak));
  });

  it('breaks com**pan**ies as the word companies', () => {
    const fontKitFont = createMockFont();
    const lines = layoutRichTextLines({
      runs: [
        { text: 'x ', fontName: 'Base', fontKitFont, syntheticBold: false, syntheticItalic: false },
        {
          text: 'com',
          fontName: 'Base',
          fontKitFont,
          syntheticBold: false,
          syntheticItalic: false,
        },
        {
          text: 'pan',
          bold: true,
          fontName: 'Base',
          fontKitFont,
          syntheticBold: true,
          syntheticItalic: false,
        },
        {
          text: 'ies',
          fontName: 'Base',
          fontKitFont,
          syntheticBold: false,
          syntheticItalic: false,
        },
      ],
      fontSize: 10,
      characterSpacing: 0,
      boxWidthInPt: 50,
    });
    expect(lines.map(getRichTextLineText)).toEqual(['x', 'companies']);
    expect(lines[1]?.runs.map((run) => run.text)).toEqual(['com', 'pan', 'ies']);
  });

  it('keeps hardBreak through a page-split range', () => {
    const lines = richLines('aaa bbb ccc', 15);
    expect(lines.length).toBeGreaterThan(1);
    const firstPage = lines.slice(0, 1);
    const secondPage = lines.slice(1);
    expect(firstPage[0]?.hardBreak).toBe(false);
    expect(secondPage.at(-1)?.hardBreak).toBe(true);
  });

  it('treats markdown CRLF as one paragraph break', () => {
    const crlf = richLines('hello\r\nworld', 100);
    const lf = richLines('hello\nworld', 100);
    expect(crlf.map(getRichTextLineText)).toEqual(['hello', 'world']);
    expect(crlf.map(getRichTextLineText)).toEqual(lf.map(getRichTextLineText));
    expect(crlf.map((line) => line.hardBreak)).toEqual([true, true]);
  });

  it('matches dynamicFontSize line counts for plain and undecorated markdown', () => {
    const fontKitFont = createMockFont();
    const textSchema = {
      type: 'text',
      position: { x: 0, y: 0 },
      width: 15,
      height: 20,
      fontSize: 10,
      lineHeight: 1,
      characterSpacing: 0,
      dynamicFontSize: { min: 4, max: 20, fit: 'vertical' },
    } as TextSchema;
    const value = 'aaa bbb ccc ddd eee';
    const plainSize = calculateDynamicFontSize({
      textSchema,
      fontKitFont,
      value,
    });
    const boxWidthInPt = mm2pt(15);
    const plainLines = wrap(value, boxWidthInPt, plainSize);
    const markdownLines = richLines(value, boxWidthInPt, plainSize);
    expect(markdownLines).toHaveLength(plainLines.length);
    expect(markdownLines.map(getRichTextLineText)).toEqual(lineTexts(plainLines));
  });
});
