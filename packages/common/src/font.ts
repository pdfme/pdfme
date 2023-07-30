import * as fontkit from 'fontkit';
import type { Font as FontkitFont } from 'fontkit';
import { Template, Schema, Font, isTextSchema, TextSchema } from './type';
import { Buffer } from 'buffer';
import {
  DEFAULT_FONT_VALUE,
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_SIZE,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_TOLERANCE,
  DEFAULT_FONT_SIZE_ADJUSTMENT,
  DEFAULT_PT_TO_MM_RATIO
} from './constants';
import { b64toUint8Array } from "."

export const getFallbackFontName = (font: Font) => {
  const initial = '';
  const fallbackFontName = Object.entries(font).reduce((acc, cur) => {
    const [fontName, fontValue] = cur;

    return !acc && fontValue.fallback ? fontName : acc;
  }, initial);
  if (fallbackFontName === initial) {
    throw Error(`fallback flag is not found in font. true fallback flag must be only one.`);
  }

  return fallbackFontName;
};

export const getDefaultFont = (): Font => ({
  [DEFAULT_FONT_NAME]: { data: b64toUint8Array(DEFAULT_FONT_VALUE), fallback: true },
});

const uniq = <T>(array: Array<T>) => Array.from(new Set(array));

const getFontNamesInSchemas = (schemas: { [key: string]: Schema }[]) =>
  uniq(
    schemas
      .map((s) => Object.values(s).map((v) => (isTextSchema(v) ? v.fontName : '')))
      .reduce((acc, cur) => acc.concat(cur), [] as (string | undefined)[])
      .filter(Boolean) as string[]
  );

export const checkFont = (arg: { font: Font; template: Template }) => {
  const {
    font,
    template: { schemas },
  } = arg;
  const fontValues = Object.values(font);
  const fallbackFontNum = fontValues.reduce((acc, cur) => (cur.fallback ? acc + 1 : acc), 0);
  if (fallbackFontNum === 0) {
    throw Error(`fallback flag is not found in font. true fallback flag must be only one.`);
  }
  if (fallbackFontNum > 1) {
    throw Error(
      `${fallbackFontNum} fallback flags found in font. true fallback flag must be only one.`
    );
  }

  const fontNamesInSchemas = getFontNamesInSchemas(schemas);
  const fontNames = Object.keys(font);
  if (fontNamesInSchemas.some((f) => !fontNames.includes(f))) {
    throw Error(
      `${fontNamesInSchemas
        .filter((f) => !fontNames.includes(f))
        .join()} of template.schemas is not found in font.`
    );
  }
};

export const heightOfFontAtSize = (fontKitFont: FontkitFont, size: number) => {
  let { ascent, descent, bbox, unitsPerEm } = fontKitFont;

  const scale = 1000 / unitsPerEm;
  const yTop = (ascent || bbox.maxY) * scale;
  const yBottom = (descent || bbox.minY) * scale;

  let height = yTop - yBottom;
  height -= Math.abs(descent * scale) || 0;

  return (height / 1000) * size;
};

const widthOfTextAtSize = (input: string, fontKitFont: FontkitFont, fontSize: number) => {
  const { glyphs } = fontKitFont.layout(input);
  const scale = 1000 / fontKitFont.unitsPerEm;
  return glyphs.reduce((totalWidth, glyph) => totalWidth + glyph.advanceWidth * scale, 0) * (fontSize / 1000);
}

const calculateCharacterSpacing = (
  textContent: string,
  textCharacterSpacing: number
) => {
  const numberOfCharacters = textContent.length;
  return (numberOfCharacters - 1) * textCharacterSpacing;
};

const calculateTextWidthInMm = (textContent: string, textWidth: number, textCharacterSpacing: number) =>
  (textWidth + calculateCharacterSpacing(textContent, textCharacterSpacing)) * DEFAULT_PT_TO_MM_RATIO;

const getLongestLine = (
  textContentRows: string[],
  fontKitFont: FontkitFont,
  fontSize: number,
  characterSpacingCount: number
) => {
  let longestLine = '';
  let maxLineWidth = 0;

  textContentRows.forEach((line) => {
    const textWidth = widthOfTextAtSize(line, fontKitFont, fontSize);
    const lineWidth = calculateTextWidthInMm(line, textWidth, characterSpacingCount);

    if (lineWidth > maxLineWidth) {
      longestLine = line;
      maxLineWidth = lineWidth;
    }
  });

  return longestLine;
};


const fontKitFontCache: { [fontName: string]: FontkitFont } = {};
const createFontKitFont = async (font: Font, fontName: string = DEFAULT_FONT_NAME) => {
  if (fontKitFontCache[fontName]) {
    return fontKitFontCache[fontName];
  }

  let fontData = font[fontName]?.data || DEFAULT_FONT_VALUE;
  if (typeof fontData === 'string') {
    fontData = fontData.startsWith('http') ? await fetch(fontData).then((res) => res.arrayBuffer()) : b64toUint8Array(fontData);
  }

  const fontKitFont = fontkit.create(fontData instanceof Buffer ? fontData : Buffer.from(fontData as string));
  fontKitFontCache[fontName] = fontKitFont

  return fontKitFont;
}

const getTextContent = (input: string, fontKitFont: FontkitFont, fontSize: number, characterSpacingCount: number): string => {
  const textContentRows = input.split('\n');
  return textContentRows.length > 1 ? getLongestLine(textContentRows, fontKitFont, fontSize, characterSpacingCount) : input;
}

export const calculateDynamicFontSize = async ({ textSchema, font, input }: { textSchema: TextSchema, font: Font, input: string }) => {
  const { fontName, fontSize: _fontSize, dynamicFontSize: dynamicFontSizeSetting, characterSpacing, width } = textSchema;
  const fontSize = _fontSize || DEFAULT_FONT_SIZE;
  if (!dynamicFontSizeSetting) return fontSize;

  const characterSpacingCount = characterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const fontKitFont = await createFontKitFont(font, fontName);
  const textContent = getTextContent(input, fontKitFont, fontSize, characterSpacingCount);
  const textWidth = widthOfTextAtSize(textContent, fontKitFont, fontSize);

  let dynamicFontSize = fontSize;
  let textWidthInMm = calculateTextWidthInMm(textContent, textWidth, characterSpacingCount);

  while (textWidthInMm > width - DEFAULT_TOLERANCE && dynamicFontSize > dynamicFontSizeSetting.min) {
    dynamicFontSize -= DEFAULT_FONT_SIZE_ADJUSTMENT;
    textWidthInMm = calculateTextWidthInMm(textContent, widthOfTextAtSize(textContent, fontKitFont, dynamicFontSize), characterSpacingCount);
  }

  while (textWidthInMm < width - DEFAULT_TOLERANCE && dynamicFontSize < dynamicFontSizeSetting.max) {
    dynamicFontSize += DEFAULT_FONT_SIZE_ADJUSTMENT;
    textWidthInMm = calculateTextWidthInMm(textContent, widthOfTextAtSize(textContent, fontKitFont, dynamicFontSize), characterSpacingCount);
  }

  return dynamicFontSize;
};