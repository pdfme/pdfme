import { PDFFont, PDFDocument, rgb } from '@pdfme/pdf-lib';
import { PDFRenderProps, Font, getDefaultFont, getFallbackFontName, mm2pt } from '@pdfme/common';
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
import { convertForPdfLayoutProps, rotatePoint } from '../renderUtils';

const hex2rgb = (hex: string) => {
  if (hex.slice(0, 1) === '#') hex = hex.slice(1);
  if (hex.length === 3)
    hex =
      hex.slice(0, 1) +
      hex.slice(0, 1) +
      hex.slice(1, 2) +
      hex.slice(1, 2) +
      hex.slice(2, 3) +
      hex.slice(2, 3);

  return [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((str) => parseInt(str, 16));
};

const hex2RgbColor = (hexString: string | undefined) => {
  if (hexString) {
    const [r, g, b] = hex2rgb(hexString);

    return rgb(r / 255, g / 255, b / 255);
  }

  return undefined;
};

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
  const {
    width,
    height,
    rotate,
    position: { x, y },
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

  if (schema.backgroundColor) {
    const color = hex2RgbColor(schema.backgroundColor as string);
    page.drawRectangle({ x, y, width, height, rotate, color });
  }

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
  value.split(/\r|\n|\r\n/g).forEach((line: string) => {
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

  const pivotPoint = { x: x + width / 2, y: pageHeight - mm2pt(schema.position.y) - height / 2 };

  lines.forEach((line, rowIndex) => {
    const textWidth = widthOfTextAtSize(line, fontKitFont, fontSize, characterSpacing);
    const rowYOffset = lineHeight * fontSize * rowIndex;

    let xLine = x;
    if (alignment === 'center') {
      xLine += (width - textWidth) / 2;
    } else if (alignment === 'right') {
      xLine += width - textWidth;
    }

    let yLine = pageHeight - mm2pt(schema.position.y) - yOffset - rowYOffset;

    if (rotate.angle !== 0) {
      // As we draw each line individually from different points, we must translate each lines position
      // relative to the UI rotation pivot point. see comments in convertForPdfLayoutProps() for more info.
      const rotatedPoint = rotatePoint({ x: xLine, y: yLine }, pivotPoint, rotate.angle);
      xLine = rotatedPoint.x;
      yLine = rotatedPoint.y;
    }

    page.drawText(line, {
      x: xLine,
      y: yLine,
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
