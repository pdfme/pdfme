import { PDFFont, PDFDocument } from '@pdfme/pdf-lib';
import { PDFRenderProps, Font, getDefaultFont, getFallbackFontName } from '@pdfme/common';
import type { TextSchema, FontWidthCalcValues } from './types';
import {
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
} from './constants';
import {
  calculateDynamicFontSize,
  heightOfFontAtSize,
  getFontDescentInPt,
  getFontKitFont,
  getSplittedLines,
  widthOfTextAtSize,
} from './helper';
import {
  hex2RgbColor,
  calcX,
  calcY,
  renderBackgroundColor,
  convertSchemaDimensionsToPt,
} from '../renderUtils';

const embedAndGetFontObjCache = new WeakMap();
const embedAndGetFontObj = async (arg: { pdfDoc: PDFDocument; font: Font }) => {
  const { pdfDoc, font } = arg;
  if (embedAndGetFontObjCache.has(pdfDoc)) {
    return embedAndGetFontObjCache.get(pdfDoc);
  }

  const fontValues = await Promise.all(
    Object.values(font).map(async (v) => {
      let fontData = v.data;
      if (typeof fontData === 'string' && fontData.startsWith('http')) {
        fontData = await fetch(fontData).then((res) => res.arrayBuffer());
      }
      return pdfDoc.embedFont(fontData, {
        subset: typeof v.subset === 'undefined' ? true : v.subset,
      });
    })
  );

  const fontObj = Object.keys(font).reduce(
    (acc, cur, i) => Object.assign(acc, { [cur]: fontValues[i] }),
    {} as { [key: string]: PDFFont }
  );

  embedAndGetFontObjCache.set(pdfDoc, fontObj);
  return fontObj;
};

const getFontProp = async ({
  value,
  font,
  schema,
}: {
  value: string;
  font: Font;
  schema: TextSchema;
}) => {
  const fontSize = schema.dynamicFontSize
    ? await calculateDynamicFontSize({ textSchema: schema, font, value })
    : schema.fontSize ?? DEFAULT_FONT_SIZE;
  const color = hex2RgbColor(schema.fontColor || DEFAULT_FONT_COLOR);

  return {
    alignment: schema.alignment ?? DEFAULT_ALIGNMENT,
    verticalAlignment: schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT,
    lineHeight: schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
    characterSpacing: schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING,
    fontSize,
    color,
  };
};

export const pdfRender = async (arg: PDFRenderProps<TextSchema>) => {
  const { value, pdfDoc, pdfLib, page, options, schema } = arg;

  const { font = getDefaultFont() } = options;

  const [pdfFontObj, fontKitFont, fontProp] = await Promise.all([
    embedAndGetFontObj({ pdfDoc, font }),
    getFontKitFont(schema, font),
    getFontProp({ value, font, schema }),
  ]);

  const { fontSize, color, alignment, verticalAlignment, lineHeight, characterSpacing } = fontProp;

  const fontName = (
    schema.fontName ? schema.fontName : getFallbackFontName(font)
  ) as keyof typeof pdfFontObj;
  const pdfFontValue = pdfFontObj[fontName];

  const pageHeight = page.getHeight();
  renderBackgroundColor({ schema, page, pageHeight });

  const { width, height, rotate } = convertSchemaDimensionsToPt(schema);

  page.pushOperators(pdfLib.setCharacterSpacing(characterSpacing ?? DEFAULT_CHARACTER_SPACING));

  const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);
  const descent = getFontDescentInPt(fontKitFont, fontSize);
  const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * fontSize) / 2;

  const fontWidthCalcValues: FontWidthCalcValues = {
    font: fontKitFont,
    fontSize,
    characterSpacing,
    boxWidthInPt: width,
  };

  let lines: string[] = [];
  value.split(/\r|\n|\r\n/g).forEach((line) => {
    lines = lines.concat(getSplittedLines(line, fontWidthCalcValues));
  });

  // Text lines are rendered from the bottom upwards, we need to adjust the position down
  let yOffset = 0;
  if (verticalAlignment === VERTICAL_ALIGN_TOP) {
    yOffset = firstLineTextHeight + halfLineHeightAdjustment;
  } else {
    const otherLinesHeight = lineHeight * fontSize * (lines.length - 1);

    if (verticalAlignment === VERTICAL_ALIGN_BOTTOM) {
      yOffset = height - otherLinesHeight + descent - halfLineHeightAdjustment;
    } else if (verticalAlignment === VERTICAL_ALIGN_MIDDLE) {
      yOffset =
        (height - otherLinesHeight - firstLineTextHeight + descent) / 2 + firstLineTextHeight;
    }
  }

  lines.forEach((line, rowIndex) => {
    const textWidth = widthOfTextAtSize(line, fontKitFont, fontSize, characterSpacing);
    const rowYOffset = lineHeight * fontSize * rowIndex;

    page.drawText(line, {
      x: calcX(schema.position.x, alignment, width, textWidth),
      y: calcY(schema.position.y, pageHeight, yOffset) - rowYOffset,
      rotate,
      size: fontSize,
      color,
      lineHeight: lineHeight * fontSize,
      maxWidth: width,
      font: pdfFontValue,
      wordBreaks: [''],
    });
  });
};
