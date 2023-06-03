import { PDFDocument, PDFFont } from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import { TextSchema, Font } from '../type';
import { calculateTextWidthInMm } from './calculateTextWidthInMm';
import {
  DEFAULT_FONT_VALUE,
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_SIZE,
  DEFAULT_TOLERANCE,
  DEFAULT_FONT_SIZE_ADJUSTMENT,
} from '../constants';



const textContentRowMaxWidth = (
  textContentRows: string[],
  schemaFontSize: number,
  pdfFont: PDFFont,
  characterSpacingCount: number
) => {
  let textContentLargestRow = '';
  let maxWidth = 0;

  textContentRows.forEach((line) => {
    const lineWidth = calculateTextWidthInMm(line, schemaFontSize, pdfFont, characterSpacingCount);

    if (lineWidth > maxWidth) {
      maxWidth = lineWidth;
      textContentLargestRow = line;
    }
  });

  return textContentLargestRow;
};

const pdfFontCache: { [fontName: string]: PDFFont } = {
};

export const calculateDynamicFontSize = async ({ textSchema, font, input }: {
  textSchema: TextSchema,
  font: Font | PDFFont,
  input: string,
}
) => {
  const {
    fontName,
    fontSize,
    dynamicFontSize: dynamicFontSizeSetting,
    characterSpacing,
    width,
  } = textSchema;

  if (!dynamicFontSizeSetting) {
    return fontSize || DEFAULT_FONT_SIZE;
  }

  const baseFontSize = fontSize ?? DEFAULT_FONT_SIZE;
  const minFontSize = dynamicFontSizeSetting.min ?? fontSize ?? DEFAULT_FONT_SIZE;
  const maxFontSize = dynamicFontSizeSetting.max ?? fontSize ?? DEFAULT_FONT_SIZE;
  const characterSpacingCount = characterSpacing ?? 0;

  let pdfFont: PDFFont;
  if (font instanceof PDFFont) {
    pdfFont = font;
  } else {
    const fontNameToUse = fontName || DEFAULT_FONT_NAME;

    if (!pdfFontCache[fontNameToUse]) {
      let fontData = font[fontNameToUse] ? font[fontNameToUse].data : DEFAULT_FONT_VALUE;
      if (typeof fontData === 'string' && fontData.startsWith('http')) {
        fontData = await fetch(fontData).then((res) => res.arrayBuffer());
      }

      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit);
      pdfFontCache[fontNameToUse] = await doc.embedFont(fontData);
    }
    pdfFont = pdfFontCache[fontNameToUse];
  }

  let textWidthInMm;
  let textContent;
  let schemaFontSize = baseFontSize;
  let dynamicFontSize = baseFontSize;
  const textContentRows = input.split('\n');



  if (textContentRows.length > 1) {
    const textContentLargestRow = textContentRowMaxWidth(
      textContentRows,
      schemaFontSize,
      pdfFont,
      characterSpacingCount as number
    );

    textWidthInMm = calculateTextWidthInMm(
      textContentLargestRow,
      schemaFontSize,
      pdfFont,
      characterSpacingCount as number
    );

    textContent = textContentLargestRow;
  } else {
    textWidthInMm = calculateTextWidthInMm(
      input,
      schemaFontSize,
      pdfFont,
      characterSpacingCount as number
    );

    textContent = input;
  }

  while (textWidthInMm > width - DEFAULT_TOLERANCE && dynamicFontSize > minFontSize) {
    dynamicFontSize -= DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(
      textContent,
      dynamicFontSize,
      pdfFont,
      characterSpacingCount as number
    );
  }

  while (textWidthInMm < width - DEFAULT_TOLERANCE && dynamicFontSize < maxFontSize) {
    dynamicFontSize += DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(
      textContent,
      dynamicFontSize,
      pdfFont,
      characterSpacingCount as number
    );
  }

  return dynamicFontSize;
};
