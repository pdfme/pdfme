import * as fontkit from 'fontkit';
import { TextSchema, Font } from './type';
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

const widthOfTextAtSize = (input: string, fontKitFont: fontkit.Font, fontSize: number) => {
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
    fontKitFont: fontkit.Font,
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
  

const fontKitFontCache: { [fontName: string]: fontkit.Font } = {};
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

const getTextContent = (input: string, fontKitFont: fontkit.Font, fontSize: number, characterSpacingCount: number): string => {
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