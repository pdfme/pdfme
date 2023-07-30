import { readFileSync } from 'fs';
import * as path from 'path';
import { calculateDynamicFontSize, checkFont, getDefaultFont } from "../src/font"
import { Font, TextSchema, Template } from '../src/type';
import { BLANK_PDF } from '../src';

const sansData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const serifData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: sansData },
  SauceHanSerifJP: { data: serifData },
});

const getTemplate = (): Template => ({
  basePdf: BLANK_PDF,
  schemas: [
    {
      a: {
        type: 'text',
        fontName: 'SauceHanSansJP',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
      b: {
        type: 'text',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    },
  ],
});

const getTextSchema = () => {
  const textSchema: TextSchema = {
    position: { x: 0, y: 0 }, type: 'text', fontSize: 14, characterSpacing: 1, width: 50, height: 50
  };
  return textSchema
}

describe('checkFont test', () => {
  test('success test: no fontName in Schemas', () => {
    const _getTemplate = (): Template => ({
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    });
    try {
      checkFont({ template: _getTemplate(), font: getSampleFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('success test: fontName in Schemas(fallback font)', () => {
    try {
      checkFont({ template: getTemplate(), font: getSampleFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('success test: fontName in Schemas(not fallback font)', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData },
      SauceHanSerifJP: { fallback: true, data: serifData },
    });

    try {
      checkFont({ template: getTemplate(), font: getFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('fail test: no fallback font', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData },
      SauceHanSerifJP: { data: serifData },
    });

    try {
      checkFont({ template: getTemplate(), font: getFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        'fallback flag is not found in font. true fallback flag must be only one.'
      );
    }
  });

  test('fail test: too many fallback font', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData, fallback: true },
      SauceHanSerifJP: { data: serifData, fallback: true },
    });

    try {
      checkFont({ template: getTemplate(), font: getFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        '2 fallback flags found in font. true fallback flag must be only one.'
      );
    }
  });

  test('fail test: fontName in Schemas not found in font(single)', () => {
    const _getTemplate = (): Template => ({
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            fontName: 'SauceHanSansJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    });

    try {
      checkFont({ template: _getTemplate(), font: getSampleFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual('SauceHanSansJP2 of template.schemas is not found in font.');
    }
  });

  test('fail test: fontName in Schemas not found in font(single)', () => {
    const _getTemplate = (): Template => ({
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            fontName: 'SauceHanSansJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            fontName: 'SauceHanSerifJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    });

    try {
      checkFont({ template: _getTemplate(), font: getSampleFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        'SauceHanSansJP2,SauceHanSerifJP2 of template.schemas is not found in font.'
      );
    }
  });
});

describe('calculateDynamicFontSize with Default font', () => {
  const font = getDefaultFont();
  it('should return default font size when dynamicFontSizeSetting is not provided', async () => {
    const textSchema = getTextSchema()
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'test' });

    expect(result).toBe(14);
  });

  it('should return smaller font size when dynamicFontSizeSetting is provided', async () => {
    const textSchema = Object.assign(getTextSchema(), { dynamicFontSize: { max: 20, min: 10 } });
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'testtesttesttesttest' });

    expect(result).toBe(14.25);
  });

  it('should return min font size when dynamicFontSizeSetting and long text are provided', async () => {
    const textSchema = Object.assign(getTextSchema(), { dynamicFontSize: { max: 20, min: 10 } });
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'testtesttesttesttesttesttesttesttesttesttest' });

    expect(result).toBe(10);
  });

  it('should return max font size when dynamicFontSizeSetting and short text are provided', async () => {
    const textSchema = Object.assign(getTextSchema(), { dynamicFontSize: { max: 20, min: 10 } });
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'a' });

    expect(result).toBe(20);
  });
});



describe('calculateDynamicFontSize with Custom font', () => {
  const font = getSampleFont();
  it('should return default font size when dynamicFontSizeSetting is not provided', async () => {
    const textSchema = getTextSchema()
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'あいう' });

    expect(result).toBe(14);
  });

  it('should return smaller font size when dynamicFontSizeSetting is provided', async () => {
    const textSchema = Object.assign(getTextSchema(), { dynamicFontSize: { max: 20, min: 10 } });
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'あいうあいうあい' });

    expect(result).toBe(16.5);
  });

  it('should return min font size when dynamicFontSizeSetting and long text are provided', async () => {
    const textSchema = Object.assign(getTextSchema(), { dynamicFontSize: { max: 20, min: 10 } });
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'あいうあいうあいうあいうあいうあいうあいうあいうあいう' });

    expect(result).toBe(10);
  });

  it('should return max font size when dynamicFontSizeSetting and short text are provided', async () => {
    const textSchema = Object.assign(getTextSchema(), { dynamicFontSize: { max: 20, min: 10 } });
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'あ' });

    expect(result).toBe(20);
  });
});

