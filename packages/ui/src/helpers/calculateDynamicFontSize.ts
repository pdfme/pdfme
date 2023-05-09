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

// 03 - Resize Fonts to Fit Width
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

  // Shrink the font size until it fits the container width
  while (textWidthInMm > width - DEFAULT_TOLERANCE && dynamicFontSize > minFontSize) {
    dynamicFontSize -= DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(text, dynamicFontSize, font, characterSpacing as number);
  }

  // Increase the font size until it fills the container width
  while (textWidthInMm < width - DEFAULT_TOLERANCE && dynamicFontSize < maxFontSize) {
    dynamicFontSize += DEFAULT_FONT_SIZE_ADJUSTMENT;

    textWidthInMm = calculateTextWidthInMm(text, dynamicFontSize, font, characterSpacing as number);
  }

  // If the font size is still too large, shrink it down to the maximum size that fits
  if (dynamicFontSize > maxFontSize) {
    dynamicFontSize = maxFontSize;
  }

  // If the font size is still too small, enlarge it to the minimum size that fits
  if (dynamicFontSize < minFontSize) {
    dynamicFontSize = minFontSize;
  }

  return dynamicFontSize;
};
