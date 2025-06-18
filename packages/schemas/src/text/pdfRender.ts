import { PDFFont, PDFDocument } from '@pdfme/pdf-lib';
import type { Font as FontKitFont } from 'fontkit';
import type { TextSchema } from './types.js';
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
  splitTextToSize,
  processTextValue,
} from './helper.js';
import {
  convertForPdfLayoutProps,
  renderBorder,
  rotatePoint,
  hex2PrintingColor,
} from '../utils.js';

const embedAndGetFontObj = async (arg: {
  pdfDoc: PDFDocument;
  font: Font;
  _cache: Map<PDFDocument, { [key: string]: PDFFont }>;
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
    }),
  );

  const fontObj = Object.keys(font).reduce(
    (acc, cur, i) => Object.assign(acc, { [cur]: fontValues[i] }),
    {} as { [key: string]: PDFFont },
  );

  _cache.set(pdfDoc, fontObj);
  return fontObj;
};

const getFontProp = ({
  value,
  fontKitFont,
  schema,
  colorType,
}: {
  value: string;
  fontKitFont: FontKitFont;
  colorType?: ColorType;
  schema: TextSchema;
}) => {
  const processedValue = processTextValue(value);

  const fontSize = schema.dynamicFontSize
    ? calculateDynamicFontSize({ textSchema: schema, fontKitFont, value: processedValue })
    : (schema.fontSize ?? DEFAULT_FONT_SIZE);
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

export const pdfRender = async (arg: PDFRenderProps<TextSchema>) => {
  const { value, pdfDoc, pdfLib, page, options, schema, _cache } = arg;
  if (!value) return;

  const { font = getDefaultFont(), colorType } = options;

  const [pdfFontObj, fontKitFont] = await Promise.all([
    embedAndGetFontObj({
      pdfDoc,
      font,
      _cache: _cache as unknown as Map<PDFDocument, { [key: string]: PDFFont }>,
    }),
    getFontKitFont(schema.fontName, font, _cache as Map<string, FontKitFont>),
  ]);
  const fontProp = getFontProp({ value, fontKitFont, schema, colorType });

  const { fontSize, color, alignment, verticalAlignment, lineHeight, characterSpacing } = fontProp;

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
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: true });

  // Get border and padding values
  const borderWidth = schema.borderWidth || { top: 0, right: 0, bottom: 0, left: 0 };
  const padding = schema.padding || { top: 0, right: 0, bottom: 0, left: 0 };

  if (schema.backgroundColor) {
    const color = hex2PrintingColor(schema.backgroundColor, colorType);
    page.drawRectangle({ x, y, width, height, rotate, color });
  }

  // For border positioning, we need the original unrotated coordinates
  const {
    position: { x: borderX, y: borderY },
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

  // Render borders if defined
  if (schema.borderWidth && schema.borderColor) {
    renderBorder(
      page,
      borderX,
      borderY,
      width,
      height,
      borderWidth,
      schema.borderColor,
      rotate,
      opacity || 1,
      pageHeight,
      schema,
      colorType,
    );
  }

  const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);
  const descent = getFontDescentInPt(fontKitFont, fontSize);
  const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * fontSize) / 2;

  // For text positioning, we need the original unrotated coordinates
  const {
    position: { x: originalX },
  } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

  // Calculate text area dimensions accounting for borders and padding
  const textAreaWidth =
    width - mm2pt(borderWidth.left + borderWidth.right + padding.left + padding.right);
  const textAreaHeight =
    height - mm2pt(borderWidth.top + borderWidth.bottom + padding.top + padding.bottom);
  const textAreaX = originalX + mm2pt(borderWidth.left + padding.left);

  const processedValue = processTextValue(value);
  const lines = splitTextToSize({
    value: processedValue,
    characterSpacing,
    fontSize,
    fontKitFont,
    boxWidthInPt: textAreaWidth,
  });

  // Text lines are rendered from the bottom upwards, we need to adjust the position down
  let yOffset = 0;
  if (verticalAlignment === VERTICAL_ALIGN_TOP) {
    yOffset = firstLineTextHeight + halfLineHeightAdjustment;
  } else {
    const otherLinesHeight = lineHeight * fontSize * (lines.length - 1);

    if (verticalAlignment === VERTICAL_ALIGN_BOTTOM) {
      yOffset = textAreaHeight - otherLinesHeight + descent - halfLineHeightAdjustment;
    } else if (verticalAlignment === VERTICAL_ALIGN_MIDDLE) {
      yOffset =
        (textAreaHeight - otherLinesHeight - firstLineTextHeight + descent) / 2 +
        firstLineTextHeight;
    }
  }

  const pivotPoint = {
    x: originalX + width / 2,
    y: pageHeight - mm2pt(schema.position.y) - height / 2,
  };
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  lines.forEach((line, rowIndex) => {
    const trimmed = line.replace('\n', '');
    const textWidth = widthOfTextAtSize(trimmed, fontKitFont, fontSize, characterSpacing);
    const textHeight = heightOfFontAtSize(fontKitFont, fontSize);
    const rowYOffset = lineHeight * fontSize * rowIndex;

    // Adobe Acrobat Reader shows an error if `drawText` is called with an empty text
    if (line === '') {
      // return; // this also works
      line = '\r\n';
    }

    let xLine = textAreaX;
    if (alignment === 'center') {
      xLine += (textAreaWidth - textWidth) / 2;
    } else if (alignment === 'right') {
      xLine += textAreaWidth - textWidth;
    }

    let yLine =
      pageHeight -
      mm2pt(schema.position.y) -
      mm2pt(borderWidth.top + padding.top) -
      yOffset -
      rowYOffset;

    // draw strikethrough
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

    // draw underline
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
      // As we draw each line individually from different points, we must translate each lines position
      // relative to the UI rotation pivot point. see comments in convertForPdfLayoutProps() for more info.
      const rotatedPoint = rotatePoint({ x: xLine, y: yLine }, pivotPoint, rotate.angle);
      xLine = rotatedPoint.x;
      yLine = rotatedPoint.y;
    }

    let spacing = characterSpacing;
    if (alignment === 'justify' && line.slice(-1) !== '\n') {
      // if alignment is `justify` but the end of line is not newline, then adjust the spacing
      const iterator = segmenter.segment(trimmed)[Symbol.iterator]();
      const len = Array.from(iterator).length;
      spacing += (textAreaWidth - textWidth) / len;
    }
    page.pushOperators(pdfLib.setCharacterSpacing(spacing));

    page.drawText(trimmed, {
      x: xLine,
      y: yLine,
      rotate,
      size: fontSize,
      color,
      lineHeight: lineHeight * fontSize,
      font: pdfFontValue,
      opacity,
    });
  });
};
