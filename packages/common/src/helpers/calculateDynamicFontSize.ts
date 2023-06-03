import { PDFDocument, PDFFont } from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import { TextSchemaWithData, Font } from '../type';
import { calculateTextWidthInMm } from './calculateTextWidthInMm';
import {
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_SIZE,
  DEFAULT_TOLERANCE,
  DEFAULT_FONT_SIZE_ADJUSTMENT,
} from '../constants';

type DynamicFontSize = (
  activeSchema: TextSchemaWithData,
  font: Font | PDFFont
) => Promise<number>;

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

const pdfFontCache: { [fontName: string]: PDFFont } = {};

export const calculateDynamicFontSize: DynamicFontSize = async (activeSchema, font) => {
  const {
    data,
    fontName,
    fontSize,
    fontSizeScalingMax,
    fontSizeScalingMin,
    characterSpacing,
    width,
  } = activeSchema;

  const baseFontSize = fontSize ?? DEFAULT_FONT_SIZE;
  const minFontSize = fontSizeScalingMin ?? fontSize ?? DEFAULT_FONT_SIZE;
  const maxFontSize = fontSizeScalingMax ?? fontSize ?? DEFAULT_FONT_SIZE;
  const characterSpacingCount = characterSpacing ?? 0;

  let pdfFont: PDFFont;
  if (font instanceof PDFFont) {
    pdfFont = font;
  } else {
    if (!pdfFontCache[fontName || DEFAULT_FONT_NAME]) {
      let fontData = font[fontName || DEFAULT_FONT_NAME].data;
      if (typeof fontData === 'string' && fontData.startsWith('http')) {
        fontData = await fetch(fontData).then((res) => res.arrayBuffer());
      }

      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit);
      pdfFontCache[fontName || DEFAULT_FONT_NAME] = await doc.embedFont(fontData);
    }
    pdfFont = pdfFontCache[fontName || DEFAULT_FONT_NAME];
  }

  let textWidthInMm;
  let textContent;
  let schemaFontSize = baseFontSize;
  let dynamicFontSize = baseFontSize;
  const textContentRows = data.split('\n');



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
      data,
      schemaFontSize,
      pdfFont,
      characterSpacingCount as number
    );

    textContent = data;
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
