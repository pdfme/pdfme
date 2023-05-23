import { PDFFont } from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import { calculateCharacterSpacing } from './calculateCharacterSpacing';
import { DEFAULT_PT_TO_MM_RATIO } from '../constants';

type CalculateTextWidthInMm = (
  textContent: string,
  textFontSize: number,
  textFontFamily: PDFFont,
  textCharacterSpacing: number
  // textFontData?: ArrayBufferLike
) => number;

export const calculateTextWidthInMm: CalculateTextWidthInMm = (
  textContent,
  textFontSize,
  textFontFamily,
  textCharacterSpacing
  // textFontData
) => {
  const characterSpacingWidth = calculateCharacterSpacing(textContent, textCharacterSpacing);
  const textContentWidthInPt =
    textFontFamily.widthOfTextAtSize(textContent, textFontSize) + characterSpacingWidth;
  const textContentWidthInMm = textContentWidthInPt * DEFAULT_PT_TO_MM_RATIO;

  // Calculate Text Width using Fontkit
  // if (textFontData) {
  //   let font = fontkit.create(new Uint8Array(textFontData));

  //   console.log(font, font.familyName);

  //   // Set the font size
  //   const fontSizeTest = 16;
  //   const fontText = 'Hello, World! Hello, World!';
  //   let widthTest = 0;

  //   for (let character of fontText) {
  //     const glyph = font.glyphForCodePoint(character.codePointAt(0));
  //     widthTest += (glyph.advanceWidth / font.unitsPerEm) * fontSizeTest;
  //   }

  //   console.log(`Width of "${fontText}": ${widthTest} in pts`);
  // }

  return textContentWidthInMm;
};
