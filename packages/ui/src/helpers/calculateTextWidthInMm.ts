import { PDFFont } from 'pdf-lib';
import { calculateCharacterSpacing } from './calculateCharacterSpacing';

type CalculateTextWidthInMm = (
  textContent: string,
  textFontSize: number,
  textFontFamily: PDFFont,
  textCharacterSpacing: number
) => number;

export const calculateTextWidthInMm: CalculateTextWidthInMm = (
  textContent,
  textFontSize,
  textFontFamily,
  textCharacterSpacing
) => {
  const characterSpacingWidth = calculateCharacterSpacing(textContent, textCharacterSpacing);
  const textContentWidthInPt = textFontFamily.widthOfTextAtSize(textContent, textFontSize) + characterSpacingWidth;
  const textContentWidthInMm = textContentWidthInPt * 0.352778;

  return textContentWidthInMm;
};
