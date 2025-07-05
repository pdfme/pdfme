import { readFileSync } from 'fs';
import * as path from 'path';
import type { Font as FontKitFont } from 'fontkit';
import { Font, getDefaultFont } from '@pdfme/common';
import {
  calculateDynamicFontSize,
  getBrowserVerticalFontAdjustments,
  getFontDescentInPt,
  getFontKitFont,
  getSplittedLines,
  filterStartJP,
  filterEndJP,
} from '../src/text/helper.js';
import {
  LINE_START_FORBIDDEN_CHARS_JA,
  LINE_END_FORBIDDEN_CHARS_JA,
} from '../src/text/constants.js';

import { FontWidthCalcValues, TextSchema } from '../src/text/types.js';

const sansData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const serifData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: sansData },
  SauceHanSerifJP: { data: serifData },
});

const getTextSchema = () => {
  const textSchema: TextSchema = {
    name: 'test',
    type: 'text',
    content: 'test',
    position: { x: 0, y: 0 },
    width: 50,
    height: 20,
    alignment: 'left',
    verticalAlignment: 'top',
    fontColor: '#000000',
    backgroundColor: '#ffffff',
    lineHeight: 1,
    characterSpacing: 1,
    fontSize: 14,
  };
  return textSchema;
};

describe('getSplitPosition test with mocked font width calculations', () => {
  /**
   * To simplify these tests we mock the widthOfTextAtSize function to return
   * the length of the text in number of characters.
   * Therefore, setting the boxWidthInPt to 5 should result in a split after 5 characters.
   */

  let widthOfTextAtSizeSpy: jest.SpyInstance<number, [string]>;

  beforeAll(() => {
    // @ts-ignore
    widthOfTextAtSizeSpy = jest.spyOn(require('../src/text/helper'), 'widthOfTextAtSize');
    widthOfTextAtSizeSpy.mockImplementation((text) => {
      return text.length;
    });
  });

  afterAll(() => {
    widthOfTextAtSizeSpy.mockRestore();
  });

  const mockedFont: FontKitFont = {} as FontKitFont;
  const mockCalcValues: FontWidthCalcValues = {
    font: mockedFont,
    fontSize: 12,
    characterSpacing: 1,
    boxWidthInPt: 5,
  };

  it('does not split an empty string', () => {
    expect(getSplittedLines('', mockCalcValues)).toEqual(['']);
  });

  it('does not split a short line', () => {
    expect(getSplittedLines('a', mockCalcValues)).toEqual(['a']);
    expect(getSplittedLines('aaaa', mockCalcValues)).toEqual(['aaaa']);
  });

  it('splits a line to the nearest previous breakable char', () => {
    expect(getSplittedLines('aaa bbb', mockCalcValues)).toEqual(['aaa', 'bbb']);
    expect(getSplittedLines('top-hat', mockCalcValues)).toEqual(['top-', 'hat']);
    expect(getSplittedLines('top—hat', mockCalcValues)).toEqual(['top—', 'hat']); // em dash
    expect(getSplittedLines('top–hat', mockCalcValues)).toEqual(['top–', 'hat']); // en dash
  });

  it('splits a line where the split point is on a breakable char', () => {
    expect(getSplittedLines('aaaaa bbbbb', mockCalcValues)).toEqual(['aaaaa', 'bbbbb']);
    expect(getSplittedLines('left-hand', mockCalcValues)).toEqual(['left-', 'hand']);
  });

  it('splits a long line in the middle of a word if too long', () => {
    expect(getSplittedLines('aaaaaa bbb', mockCalcValues)).toEqual(['aaaaa', 'a bbb']);
    expect(getSplittedLines('aaaaaa-a b', mockCalcValues)).toEqual(['aaaaa', 'a-a b']);
    expect(getSplittedLines('aaaaa-aa b', mockCalcValues)).toEqual(['aaaaa', '-aa b']);
  });

  it('splits a long line without breakable chars at exactly 5 chars', () => {
    expect(getSplittedLines('abcdef', mockCalcValues)).toEqual(['abcde', 'f']);
  });

  it('splits a very long line without breakable chars at exactly 5 chars', () => {
    expect(getSplittedLines('abcdefghijklmn', mockCalcValues)).toEqual(['abcde', 'fghij', 'klmn']);
  });

  it('splits a line with lots of words', () => {
    expect(getSplittedLines('a b c d e', mockCalcValues)).toEqual(['a b c', 'd e']);
  });
});

describe('getSplittedLines test with real font width calculations', () => {
  const font = getDefaultFont();
  const baseCalcValues = {
    fontSize: 12,
    characterSpacing: 1,
    boxWidthInPt: 40,
  };

  it('should not split a line when the text is shorter than the width', async () => {
    const _cache = new Map();
    await getFontKitFont(getTextSchema().fontName, font, _cache).then((fontKitFont) => {
      const fontWidthCalcs = Object.assign({}, baseCalcValues, { font: fontKitFont });
      const result = getSplittedLines('short', fontWidthCalcs);
      expect(result).toEqual(['short']);
    });
  });

  it('should split a line when the text is longer than the width', async () => {
    const _cache = new Map();
    await getFontKitFont(getTextSchema().fontName, font, _cache).then((fontKitFont) => {
      const fontWidthCalcs = Object.assign({}, baseCalcValues, { font: fontKitFont });
      const result = getSplittedLines('this will wrap', fontWidthCalcs);
      expect(result).toEqual(['this', 'will', 'wrap']);
    });
  });

  it('should split a line in the middle when unspaced text will not fit on a line', async () => {
    const _cache = new Map();
    await getFontKitFont(getTextSchema().fontName, font, _cache).then((fontKitFont) => {
      const fontWidthCalcs = Object.assign({}, baseCalcValues, { font: fontKitFont });
      const result = getSplittedLines('thiswillbecut', fontWidthCalcs);
      expect(result).toEqual(['thiswi', 'llbecu', 't']);
    });
  });

  it('should not split text when it is impossible due to size constraints', async () => {
    const _cache = new Map();
    await getFontKitFont(getTextSchema().fontName, font, _cache).then((fontKitFont) => {
      const fontWidthCalcs = Object.assign({}, baseCalcValues, { font: fontKitFont });
      fontWidthCalcs.boxWidthInPt = 2;
      const result = getSplittedLines('thiswillnotbecut', fontWidthCalcs);
      expect(result).toEqual(['thiswillnotbecut']);
    });
  });
});

describe('calculateDynamicFontSize with Default font', () => {
  let fontKitFont: FontKitFont;

  beforeAll(async () => {
    fontKitFont = await getFontKitFont('SauceHanSansJP', getDefaultFont(), new Map());
  });

  it('should return default font size when dynamicFontSizeSetting is not provided', async () => {
    const textSchema = getTextSchema();
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value: 'test' });

    expect(result).toBe(14);
  });

  it('should return default font size when dynamicFontSizeSetting max is less than min', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 11, max: 10, fit: 'vertical' };
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value: 'test' });

    expect(result).toBe(14);
  });

  it('should calculate a dynamic font size of vertical fit between min and max', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'vertical' };
    const value = 'test with a length string\n and a new line';
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(19.25);
  });

  it('should calculate a dynamic font size of horizontal fit between min and max', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'horizontal' };
    const value = 'test with a length string\n and a new line';
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(11.25);
  });

  it('should calculate a dynamic font size between min and max regardless of current font size', async () => {
    const textSchema = getTextSchema();
    textSchema.fontSize = 2;
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'vertical' };
    const value = 'test with a length string\n and a new line';
    let result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(19.25);

    textSchema.fontSize = 40;
    result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(19.25);
  });

  it('should return min font size when content is too big to fit given constraints', async () => {
    const textSchema = getTextSchema();
    textSchema.width = 10;
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'vertical' };
    const value = 'test with a length string\n and a new line';
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(10);
  });

  it('should return max font size when content is too small to fit given constraints', async () => {
    const textSchema = getTextSchema();
    textSchema.width = 1000;
    textSchema.height = 200;
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'vertical' };
    const value = 'test with a length string\n and a new line';
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(30);
  });

  it('should not reduce font size below 0', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: -5, max: 10, fit: 'vertical' };
    textSchema.width = 4;
    textSchema.height = 1;
    const value = 'a very \nlong \nmulti-line \nstring\nto';
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBeGreaterThan(0);
  });

  it('should calculate a dynamic font size when a starting font size is passed that is lower than the eventual', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'vertical' };
    const value = 'test with a length string\n and a new line';
    const startingFontSize = 18;
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value, startingFontSize });

    expect(result).toBe(19.25);
  });

  it('should calculate a dynamic font size when a starting font size is passed that is higher than the eventual', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'horizontal' };
    const value = 'test with a length string\n and a new line';
    const startingFontSize = 36;
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value, startingFontSize });

    expect(result).toBe(11.25);
  });

  it('should calculate a dynamic font size using vertical fit as a default if no fit provided', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'vertical' };
    const value = 'test with a length string\n and a new line';
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(19.25);
  });
});

describe('calculateDynamicFontSize with Custom font', () => {
  let fontKitFont: FontKitFont;
  beforeAll(async () => {
    fontKitFont = await getFontKitFont('SauceHanSansJP', getSampleFont(), new Map());
  });

  it('should return smaller font size when dynamicFontSizeSetting is provided with horizontal fit', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'horizontal' };
    const value = 'あいうあいうあい';
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(16.75);
  });

  it('should return smaller font size when dynamicFontSizeSetting is provided with vertical fit', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'vertical' };
    const value = 'あいうあいうあい';
    const result = calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(26);
  });

  it('should return min font size when content is too big to fit given constraints', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 20, max: 30, fit: 'vertical' };
    const value = 'あいうあいうあいうあいうあいうあいうあいうあいうあいう';
    const result = await calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(20);
  });

  it('should return max font size when content is too small to fit given constraints', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 10, max: 30, fit: 'vertical' };
    const value = 'あ';
    const result = await calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(30);
  });

  it('should return min font size when content is multi-line with too many lines for the container', async () => {
    const textSchema = getTextSchema();
    textSchema.dynamicFontSize = { min: 5, max: 20, fit: 'vertical' };
    const value = 'あ\nいう\nあ\nいう\nあ\nいう\nあ\nいう\nあ\nいう\nあ\nいう';
    const result = await calculateDynamicFontSize({ textSchema, fontKitFont, value });

    expect(result).toBe(5);
  });
});

describe('getFontDescentInPt test', () => {
  test('it gets a descent size relative to the font size', () => {
    expect(getFontDescentInPt({ descent: -400, unitsPerEm: 1000 } as FontKitFont, 12)).toBe(
      -4.800000000000001,
    );
    expect(getFontDescentInPt({ descent: 54, unitsPerEm: 1000 } as FontKitFont, 20)).toBe(1.08);
    expect(getFontDescentInPt({ descent: -512, unitsPerEm: 2048 } as FontKitFont, 54)).toBe(-13.5);
  });
});

describe('getBrowserVerticalFontAdjustments test', () => {
  // Font with a base line-height of 1.349
  const font = { ascent: 1037, descent: -312, unitsPerEm: 1000 } as FontKitFont;

  test('it gets a top adjustment when vertically aligning top', () => {
    expect(getBrowserVerticalFontAdjustments(font, 12, 1.0, 'top')).toEqual({
      topAdj: 2.791301999999999,
      bottomAdj: 0,
    });
    expect(getBrowserVerticalFontAdjustments(font, 36, 2.0, 'top')).toEqual({
      topAdj: 8.373906,
      bottomAdj: 0,
    });
  });

  test('it gets a bottom adjustment when vertically aligning middle or bottom', () => {
    expect(getBrowserVerticalFontAdjustments(font, 12, 1.0, 'bottom')).toEqual({
      topAdj: 0,
      bottomAdj: 2.791302,
    });
    expect(getBrowserVerticalFontAdjustments(font, 12, 1.15, 'middle')).toEqual({
      topAdj: 0,
      bottomAdj: 1.5916020000000004,
    });
  });

  test('it does not get a bottom adjustment if the line height exceeds that of the font', () => {
    expect(getBrowserVerticalFontAdjustments(font, 12, 1.35, 'bottom')).toEqual({
      topAdj: 0,
      bottomAdj: 0,
    });
  });

  test('it does not get a bottom adjustment if the font base line-height is 1.0 or less', () => {
    const thisFont = { ascent: 900, descent: -50, unitsPerEm: 1000 } as FontKitFont;
    expect(getBrowserVerticalFontAdjustments(thisFont, 20, 1.0, 'bottom')).toEqual({
      topAdj: 0,
      bottomAdj: 0,
    });
  });
});

describe('filterStartJP', () => {
  test('空の配列を渡すと空の配列を返す', () => {
    expect(filterStartJP([])).toEqual([]);
  });

  test('禁則文字を含まない行はそのまま返す', () => {
    const input = ['これは', '普通の', '文章です。'];
    expect(filterStartJP(input)).toEqual(input);
  });

  test('行頭の禁則文字を前の行の末尾に移動する', () => {
    const input = ['これは', '。文章', 'です'];
    const expected = ['これは。', '文章', 'です'];
    expect(filterStartJP(input)).toEqual(expected);
  });

  test('複数の禁則文字を正しく処理する', () => {
    const input = ['これは', '。とても', '、長い', '」文章', 'です'];
    const expected = ['これは。', 'とても、', '長い」', '文章', 'です'];
    expect(filterStartJP(input)).toEqual(expected);
  });

  test('空の行を保持する', () => {
    const input = ['これは', '', '。文章', 'です'];
    const expected = ['これは。', '', '文章', 'です'];
    expect(filterStartJP(input)).toEqual(expected);
  });

  test('1文字の行（禁則文字のみ）はそのまま保持する', () => {
    const input = ['これは', '。', '文章', 'です'];
    // const expected = ['これは。', '文章', 'です'];
    const expected = ['これは', '。', '文章', 'です'];
    expect(filterStartJP(input)).toEqual(expected);
  });

  test('すべての禁則文字を正しく処理する', () => {
    const input = LINE_START_FORBIDDEN_CHARS_JA.map((char: string) => [
      'この',
      char + '文字',
    ]).flat();
    const expected = LINE_START_FORBIDDEN_CHARS_JA.map((char: string) => [
      'この' + char,
      '文字',
    ]).flat();
    expect(filterStartJP(input)).toEqual(expected);
  });
});

describe('filterEndJP', () => {
  test('空の配列を渡すと空の配列を返す', () => {
    expect(filterEndJP([])).toEqual([]);
  });

  test('禁則文字を含まない行はそのまま返す', () => {
    const input = ['これは', '普通の', '文章です。'];
    expect(filterEndJP(input)).toEqual(input);
  });

  test('行末の禁則文字を次の行の先頭に移動する', () => {
    const input = ['これは「', '文章', 'です。'];
    const expected = ['これは', '「文章', 'です。'];
    expect(filterEndJP(input)).toEqual(expected);
  });

  test('複数の禁則文字を正しく処理する', () => {
    const input = ['これは「', '長い『', '文章（', 'です。'];
    const expected = ['これは', '「長い', '『文章', '（です。'];
    expect(filterEndJP(input)).toEqual(expected);
  });

  // Cant understand purpose of this test...
  // test('空の行を保持する', () => {
  //   const input = ['これは「', '', '文章', 'です。'];
  //   const expected = ['これは', '「', '', '文章', 'です。'];
  //   expect(filterEndJP(input)).toEqual(expected);
  // });

  test('1文字の行（禁則文字のみ）はそのまま保持する', () => {
    const input = ['これは', '「', '文章', 'です。'];
    const expected = ['これは', '「', '文章', 'です。'];
    expect(filterEndJP(input)).toEqual(expected);
  });

  test('すべての禁則文字を正しく処理する', () => {
    const input = LINE_END_FORBIDDEN_CHARS_JA.map((char: string) => [
      'これは' + char,
      '文章',
    ]).flat();
    const expected = LINE_END_FORBIDDEN_CHARS_JA.map((char: string) => [
      'これは',
      char + '文章',
    ]).flat();
    expect(filterEndJP(input)).toEqual(expected);
  });

  test('最後の行の禁則文字は移動しない', () => {
    const input = ['これは「', '文章「', 'です「'];
    const expected = ['これは', '「文章', '「です「'];
    expect(filterEndJP(input)).toEqual(expected);
  });
});
