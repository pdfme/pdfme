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
  return numberOfCharacters <= 1 ? numberOfCharacters * textCharacterSpacing : (numberOfCharacters - 1) * textCharacterSpacing;
};

const calculateTextWidthInMm = (textContent: string, textWidth: number, textCharacterSpacing: number) =>
  (textWidth + calculateCharacterSpacing(textContent, textCharacterSpacing)) * DEFAULT_PT_TO_MM_RATIO;

const textContentRowMaxWidth = (
  textContentRows: string[],
  textWidth: number,
  characterSpacingCount: number
) => textContentRows.reduce((maxRow, line) => {
  const lineWidth = calculateTextWidthInMm(line, textWidth, characterSpacingCount);
  return lineWidth > calculateTextWidthInMm(maxRow, textWidth, characterSpacingCount) ? line : maxRow;
}, '');

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

export const calculateDynamicFontSize = async ({ textSchema, font, input }: { textSchema: TextSchema, font: Font, input: string }) => {
  const { fontName, fontSize, dynamicFontSize: dynamicFontSizeSetting, characterSpacing, width } = textSchema;
  if (!dynamicFontSizeSetting) return fontSize || DEFAULT_FONT_SIZE;

  const characterSpacingCount = characterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const fontKitFont = await createFontKitFont(font, fontName);
  const textWidth = widthOfTextAtSize(input, fontKitFont, fontSize || DEFAULT_FONT_SIZE);
  const textContentRows = input.split('\n');
  const textContent = textContentRows.length > 1 ? textContentRowMaxWidth(textContentRows, textWidth, characterSpacingCount) : input;

  let dynamicFontSize = fontSize ?? DEFAULT_FONT_SIZE;
  let textWidthInMm = calculateTextWidthInMm(textContent, textWidth, characterSpacingCount);

  while (textWidthInMm > width - DEFAULT_TOLERANCE && dynamicFontSize > (dynamicFontSizeSetting.min ?? fontSize ?? DEFAULT_FONT_SIZE)) {
    dynamicFontSize -= DEFAULT_FONT_SIZE_ADJUSTMENT;
    textWidthInMm = calculateTextWidthInMm(textContent, widthOfTextAtSize(input, fontKitFont, dynamicFontSize), characterSpacingCount);
  }

  while (textWidthInMm < width - DEFAULT_TOLERANCE && dynamicFontSize < (dynamicFontSizeSetting.max ?? fontSize ?? DEFAULT_FONT_SIZE)) {
    dynamicFontSize += DEFAULT_FONT_SIZE_ADJUSTMENT;
    textWidthInMm = calculateTextWidthInMm(textContent, widthOfTextAtSize(input, fontKitFont, dynamicFontSize), characterSpacingCount);
  }

  return dynamicFontSize;
};