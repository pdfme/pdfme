import { PDFDocument, StandardFonts } from '@pdfme/pdf-lib';
import * as fontkit from 'fontkit';
import { TextSchemaWithData } from '../type';
import { calculateTextWidthInMm } from './calculateTextWidthInMm';
import {
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_SIZE_IN_PIXELS,
  DEFAULT_FONT_SIZE_SCALING_MIN,
  DEFAULT_FONT_SIZE_SCALING_MAX,
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

  const baseFontSizeInPixels = fontSize ?? DEFAULT_FONT_SIZE_IN_PIXELS;
  const minSizePercentage = fontSizeScalingMin ?? DEFAULT_FONT_SIZE_SCALING_MIN;
  const maxSizePercentage = fontSizeScalingMax ?? DEFAULT_FONT_SIZE_SCALING_MAX;
  const minFontSize = (minSizePercentage * baseFontSizeInPixels) / 100;
  const maxFontSize = (maxSizePercentage * baseFontSizeInPixels) / 100;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  let font;

  if (fontName === DEFAULT_FONT_NAME) {
    font = await doc.embedFont(StandardFonts.Helvetica);
  } else {
    const customFont = fontData[fontName as string].data;
    font = await doc.embedFont(customFont);
  }

  let schemaFontSize = baseFontSizeInPixels;
  let dynamicFontSize = baseFontSizeInPixels;
  let textWidthInMm = calculateTextWidthInMm(
    data,
    schemaFontSize,
    font,
    characterSpacing as number
  );

  while (textWidthInMm > width - DEFAULT_TOLERANCE && dynamicFontSize > minFontSize) {
    dynamicFontSize -= DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(data, dynamicFontSize, font, characterSpacing as number);
  }

  while (textWidthInMm < width - DEFAULT_TOLERANCE && dynamicFontSize < maxFontSize) {
    dynamicFontSize += DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(data, dynamicFontSize, font, characterSpacing as number);
  }

  if (dynamicFontSize > maxFontSize) {
    dynamicFontSize = maxFontSize;
  }

  if (dynamicFontSize < minFontSize) {
    dynamicFontSize = minFontSize;
  }

  return dynamicFontSize;
};
