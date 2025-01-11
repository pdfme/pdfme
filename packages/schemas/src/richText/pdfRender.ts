import { PDFFont, PDFDocument } from '@pdfme/pdf-lib';
import type { RichTextLetter, RichTextSchema } from './types';
import {
  PDFRenderProps,
  ColorType,
  Font,
  getDefaultFont,
  getFallbackFontName,
  mm2pt,
} from '@pdfme/common';
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
} from './constants.js';
import {
  calculateDynamicFontSize,
  heightOfFontAtSize,
  getFontDescentInPt,
  getFontKitFont,
  widthOfTextAtSize,
  content2RichTextLetters,
  splitRichTextLettersToLines,
} from './helper.js';
import { convertForPdfLayoutProps, rotatePoint, hex2PrintingColor } from '../utils.js';

const embedAndGetFontObj = async (arg: {
  pdfDoc: PDFDocument;
  font: Font;
  _cache: Map<any, any>;
}) => {
  const { pdfDoc, font, _cache } = arg;
  if (_cache.has(pdfDoc)) {
    return _cache.get(pdfDoc) as { [key: string]: PDFFont };
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

  _cache.set(pdfDoc, fontObj);
  return fontObj;
};

const getFontProp = async ({
  value,
  font,
  schema,
  colorType,
  _cache,
}: {
  value: string;
  font: Font;
  colorType?: ColorType;
  schema: RichTextSchema;
  _cache: Map<any, any>;
}) => {
  const fontSize = schema.dynamicFontSize
    ? await calculateDynamicFontSize({ textSchema: schema, font, value, _cache })
    : schema.fontSize ?? DEFAULT_FONT_SIZE;
  const color = hex2PrintingColor(schema.fontColor || DEFAULT_FONT_COLOR, colorType);

  return {
    alignment: schema.alignment ?? DEFAULT_ALIGNMENT,
    verticalAlignment: schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT,
    lineHeight: schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
    characterSpacing: schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING,
    fontSize,
    color,
  };
};

const getMaxLineHeight = async (arg: {
  line: RichTextLetter[];
  font: Font;
  orignalSchema: RichTextSchema;
  _cache: Map<any, any>;
}): Promise<{
  maxLineHeight: number;
  maxFirstLineTextHeight: number;
  minDescent: number;
  lineWidth: number;
  maxLineHeightXFontSize: number;
}> => {
  const { line, font, orignalSchema, _cache } = arg;

  const cacheKey = JSON.stringify({
    line: line.map((l) => ({ letter: l.letter, style: l.style })),
    schema: orignalSchema,
  });

  const cachedResult = _cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  let maxLineHeight = 0;
  let maxFirstLineTextHeight = 0;
  let minDescent = 0;
  let lineWidth = 0;
  let maxLineHeightXFontSize = 0;

  for (const letter of line) {
    let schema = { ...orignalSchema, ...letter.style, value: letter.letter };
    const fontKitFont = await getFontKitFont(letter.style.fontName, font, _cache);
    const fontProp = await getFontProp({ value: letter.letter, font, schema, _cache });
    const { fontSize, lineHeight } = fontProp;
    maxFirstLineTextHeight = Math.max(
      maxFirstLineTextHeight,
      heightOfFontAtSize(fontKitFont, fontSize)
    );
    minDescent = Math.min(minDescent, getFontDescentInPt(fontKitFont, fontSize));
    lineWidth += widthOfTextAtSize(letter.letter, fontKitFont, fontSize, schema.characterSpacing);
    maxLineHeightXFontSize = Math.max(maxLineHeightXFontSize, lineHeight * fontSize);
    maxLineHeight = Math.max(maxLineHeight, lineHeight);
  }

  const result = {
    maxLineHeight,
    maxLineHeightXFontSize,
    maxFirstLineTextHeight,
    minDescent,
    lineWidth,
  };

  _cache.set(cacheKey, result);

  return result;
};

const getOtherLinesHeight = async (arg: {
  lines: RichTextLetter[][];
  font: Font;
  orignalSchema: RichTextSchema;
  _cache: Map<any, any>;
}) => {
  const { lines, font, orignalSchema, _cache } = arg;
  let otherLineFirstLineTextHeight = 0;
  let otherLinesHeightXFontSize = 0;
  for (const [lIdx, line] of lines.entries()) {
    const { maxFirstLineTextHeight, maxLineHeightXFontSize } = await getMaxLineHeight({
      line,
      font,
      orignalSchema,
      _cache,
    });
    otherLineFirstLineTextHeight += maxFirstLineTextHeight;
    otherLinesHeightXFontSize += maxLineHeightXFontSize;
  }
  return { otherLineFirstLineTextHeight, otherLinesHeightXFontSize };
};

export const pdfRender = async (arg: PDFRenderProps<RichTextSchema>) => {
  const { value, pdfDoc, pdfLib, page, options, schema: orignalSchema, _cache } = arg;
  if (!value) return;

  const { font = getDefaultFont(), colorType } = options;

  const richTextLetters = content2RichTextLetters(value);
  const richTextLettersLines = await splitRichTextLettersToLines(
    richTextLetters,
    orignalSchema,
    font,
    _cache
  );

  let lineYOffset = 0;
  const { otherLineFirstLineTextHeight, otherLinesHeightXFontSize } = await getOtherLinesHeight({
    lines: richTextLettersLines,
    font,
    orignalSchema,
    _cache,
  });

  for (const [lIdx, line] of richTextLettersLines.entries()) {
    let offsetX = 0;
    let offsetY = 0;

    const { maxFirstLineTextHeight, minDescent, lineWidth, maxLineHeightXFontSize } =
      await getMaxLineHeight({
        line,
        font,
        orignalSchema,
        _cache,
      });

    for (const [cIdx, char] of line.entries()) {
      let schema = { ...orignalSchema, ...char.style, value: char.letter };

      const [pdfFontObj, fontKitFont, fontProp] = await Promise.all([
        embedAndGetFontObj({ pdfDoc, font, _cache }),
        getFontKitFont(schema.fontName, font, _cache),
        getFontProp({ value, font, schema, _cache, colorType }),
      ]);

      const { fontSize, color, alignment, verticalAlignment, lineHeight, characterSpacing } =
        fontProp;

      const fontName = (
        schema.fontName ? schema.fontName : getFallbackFontName(font)
      ) as keyof typeof pdfFontObj;
      const pdfFontValue = pdfFontObj && pdfFontObj[fontName];

      const pageHeight = page.getHeight();
      const {
        width,
        height,
        rotate,
        position: { x, y },
        opacity,
      } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

      if (orignalSchema.backgroundColor && lIdx === 0 && cIdx === 0) {
        const color = hex2PrintingColor(orignalSchema.backgroundColor, colorType);
        page.drawRectangle({ x, y, width, height, rotate, color });
      }

      page.pushOperators(pdfLib.setCharacterSpacing(characterSpacing ?? DEFAULT_CHARACTER_SPACING));

      // this max as to set regardless of the font size to have the lowest point as the line for text
      const firstLineTextHeight = maxFirstLineTextHeight;
      // descent might be issue for vertical align issue
      const descent = minDescent;
      const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * fontSize) / 2;

      let yOffset = 0;
      if (verticalAlignment === VERTICAL_ALIGN_TOP) {
        yOffset = firstLineTextHeight + halfLineHeightAdjustment;
      } else {
        const otherLinesHeight = otherLinesHeightXFontSize - maxLineHeightXFontSize;

        if (verticalAlignment === VERTICAL_ALIGN_BOTTOM) {
          yOffset = height - otherLinesHeight + descent - halfLineHeightAdjustment;
        } else if (verticalAlignment === VERTICAL_ALIGN_MIDDLE) {
          yOffset =
            (height - otherLinesHeight - firstLineTextHeight + descent) / 2 + firstLineTextHeight;
        }
      }

      const pivotPoint = {
        x: x + width / 2,
        y: pageHeight - mm2pt(schema.position.y) - height / 2,
      };

      const textWidth = widthOfTextAtSize(char.letter, fontKitFont, fontSize, characterSpacing);
      const textHeight = heightOfFontAtSize(fontKitFont, fontSize);
      const rowYOffset = lineYOffset;

      let xLine = x;
      xLine += offsetX;
      if (alignment === 'center') {
        xLine += (width - lineWidth) / 2;
      } else if (alignment === 'right') {
        xLine += width - lineWidth;
      }
      offsetX += textWidth;

      let yLine = pageHeight - mm2pt(schema.position.y) - yOffset - rowYOffset;

      if (schema.strikethrough && textWidth > 0) {
        const _x = xLine + textWidth + 1;
        const _y = yLine + textHeight / 3;
        page.drawLine({
          start: rotatePoint({ x: xLine, y: _y }, pivotPoint, rotate.angle),
          end: rotatePoint({ x: _x, y: _y }, pivotPoint, rotate.angle),
          thickness: (1 / 12) * fontSize,
          color: color,
          opacity,
        });
      }

      if (schema.underline && textWidth > 0) {
        const _x = xLine + textWidth + 1;
        const _y = yLine - textHeight / 12;
        page.drawLine({
          start: rotatePoint({ x: xLine, y: _y }, pivotPoint, rotate.angle),
          end: rotatePoint({ x: _x, y: _y }, pivotPoint, rotate.angle),
          thickness: (1 / 12) * fontSize,
          color: color,
          opacity,
        });
      }

      if (rotate.angle !== 0) {
        const rotatedPoint = rotatePoint({ x: xLine, y: yLine }, pivotPoint, rotate.angle);
        xLine = rotatedPoint.x;
        yLine = rotatedPoint.y;
      }

      if (schema.backgroundColor) {
        const color = hex2PrintingColor(schema.backgroundColor, colorType);
        page.drawRectangle({
          x: xLine,
          y: yLine + descent,
          width: textWidth,
          height: textHeight - descent,
          rotate,
          color,
        });
      }

      page.drawText(char.letter, {
        x: xLine,
        y: yLine,
        rotate,
        size: fontSize,
        color,
        lineHeight: lineHeight * fontSize,
        font: pdfFontValue,
        opacity,
      });
    }
    lineYOffset += maxLineHeightXFontSize;
  }
};
