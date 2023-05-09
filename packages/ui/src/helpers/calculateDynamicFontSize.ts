import { PDFDocument, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { TextSchemaForUI } from '@pdfme/common';
import { calculateTextWidthInMm } from './calculateTextWidthInMm';

type DynamicFontSize = (
  activeSchema: TextSchemaForUI,
  fontData: {
    [fontName: string]: {
      data: string | ArrayBuffer | Uint8Array;
    };
  }
) => Promise<number>;

export const calculateDynamicFontSize: DynamicFontSize = async (activeSchema, fontData) => {
  const DEFAULT_FONT_SIZE_IN_PIXELS = 18;
  const DEFAULT_FONT_SIZE_SCALING_MIN = 100;
  const DEFAULT_FONT_SIZE_SCALING_MAX = 100;
  const DEFAULT_TOLERANCE = 3;
  const DEFAULT_FONT_SIZE_ADJUSTMENT = 0.5;

  const {
    data: text,
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

  if (fontName === 'Helvetica') {
    font = await doc.embedFont(StandardFonts.Helvetica);
  } else {
    const customFont = fontData[fontName as string].data;
    font = await doc.embedFont(customFont);
  }

  let schemaFontSize = baseFontSizeInPixels;
  let dynamicFontSize = baseFontSizeInPixels;
  let textWidthInMm = calculateTextWidthInMm(
    text,
    schemaFontSize,
    font,
    characterSpacing as number
  );

  while (textWidthInMm > width - DEFAULT_TOLERANCE && dynamicFontSize > minFontSize) {
    dynamicFontSize -= DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(text, dynamicFontSize, font, characterSpacing as number);
  }

  while (textWidthInMm < width - DEFAULT_TOLERANCE && dynamicFontSize < maxFontSize) {
    dynamicFontSize += DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(text, dynamicFontSize, font, characterSpacing as number);
  }

  if (dynamicFontSize > maxFontSize) {
    dynamicFontSize = maxFontSize;
  }

  if (dynamicFontSize < minFontSize) {
    dynamicFontSize = minFontSize;
  }

  return dynamicFontSize;
};
