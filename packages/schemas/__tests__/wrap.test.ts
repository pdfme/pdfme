import type { Font as FontKitFont } from 'fontkit';
import { splitTextToSize, wrapTextToSize } from '../src/text/helper.js';
import { CJ, getRawLineBreakClass, IS, QU, SA } from '../src/text/lineBreak.js';
import { toLegacySplitLines, type WrapLine } from '../src/text/wrap.js';

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

  it('marks only the last line of a paragraph as a hard break', () => {
    const lines = wrap('aaa bbb ccc', 15);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(0, -1).every((line) => !line.hardBreak)).toBe(true);
    expect(lines.at(-1)?.hardBreak).toBe(true);
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
});
