import type { PDFFont } from '@pdfme/pdf-lib';
import { calculateCharacterSpacing } from './calculateCharacterSpacing';
import { DEFAULT_PT_TO_MM_RATIO } from '../constants';

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
  const textContentWidthInPt =
    textFontFamily.widthOfTextAtSize(textContent, textFontSize) + characterSpacingWidth;
  const textContentWidthInMm = textContentWidthInPt * DEFAULT_PT_TO_MM_RATIO;

  return textContentWidthInMm;
};
