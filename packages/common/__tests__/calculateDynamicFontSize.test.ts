import { readFileSync } from 'fs';
import * as path from 'path';
import { calculateDynamicFontSize } from "../src/calculateDynamicFontSize"
import { Font, TextSchema } from '../src/type';
import { getDefaultFont } from "../src/helper"

const sansData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const serifData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: sansData },
  SauceHanSerifJP: { data: serifData },
});

const getTextSchema = () => {
  const textSchema: TextSchema = {
    position: { x: 0, y: 0 }, type: 'text', fontSize: 14, characterSpacing: 1, width: 50, height: 50
  };
  return textSchema
}

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
    const result = await calculateDynamicFontSize({ textSchema, font, input: 'あいうあいうあいうあいうあいうあいう' });

    expect(result).toBe(15.5);
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

