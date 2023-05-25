import { PDFDocument, PDFFont, StandardFonts } from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import { TextSchemaWithData } from '../type';
import { calculateTextWidthInMm } from './calculateTextWidthInMm';
import {
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_SIZE,
  DEFAULT_TOLERANCE,
  DEFAULT_FONT_SIZE_ADJUSTMENT,
} from '../constants';

type DynamicFontSize = (
  activeSchema: TextSchemaWithData,
  fontData: {
    [fontName: string]: {
      data: string | ArrayBuffer | Uint8Array;
    };
  }
) => Promise<number>;

export const calculateDynamicFontSize: DynamicFontSize = async (activeSchema, fontData) => {
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
  const minFontSize = fontSizeScalingMin ?? DEFAULT_FONT_SIZE;
  const maxFontSize = fontSizeScalingMax ?? DEFAULT_FONT_SIZE;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  let font: PDFFont;

  if (fontName === DEFAULT_FONT_NAME) {
    font = await doc.embedFont(StandardFonts.Helvetica);
  } else {
    const customFont = fontData[fontName as string].data;
    font = await doc.embedFont(customFont);
  }

  let textWidthInMm;
  let textContent;
  let schemaFontSize = baseFontSize;
  let dynamicFontSize = baseFontSize;
  const textContentRows = data.split('\n');

  const textContentRowMaxWidth = (
    textContentRows: string[],
    schemaFontSize: number,
    font: PDFFont,
    characterSpacing: number
  ) => {
    let textContentLargestRow = '';
    let maxWidth = 0;

    textContentRows.forEach((line) => {
      const lineWidth = calculateTextWidthInMm(line, schemaFontSize, font, characterSpacing);

      if (lineWidth > maxWidth) {
        maxWidth = lineWidth;
        textContentLargestRow = line;
      }
    });

    return textContentLargestRow;
  };

  if (textContentRows.length > 1) {
    const textContentLargestRow = textContentRowMaxWidth(
      textContentRows,
      schemaFontSize,
      font,
      characterSpacing as number
    );

    textWidthInMm = calculateTextWidthInMm(
      textContentLargestRow,
      schemaFontSize,
      font,
      characterSpacing as number
    );

    textContent = textContentLargestRow;
  } else {
    textWidthInMm = calculateTextWidthInMm(data, schemaFontSize, font, characterSpacing as number);

    textContent = data;
  }

  while (textWidthInMm > width - DEFAULT_TOLERANCE && dynamicFontSize > minFontSize) {
    dynamicFontSize -= DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(
      textContent,
      dynamicFontSize,
      font,
      characterSpacing as number
    );
  }

  while (textWidthInMm < width - DEFAULT_TOLERANCE && dynamicFontSize < maxFontSize) {
    dynamicFontSize += DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(
      textContent,
      dynamicFontSize,
      font,
      characterSpacing as number
    );
  }

  if (dynamicFontSize > maxFontSize) {
    dynamicFontSize = maxFontSize;
  }

  if (dynamicFontSize < minFontSize) {
    dynamicFontSize = minFontSize;
  }

  return dynamicFontSize;
};
