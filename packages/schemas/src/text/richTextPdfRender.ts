import type { PDFFont, Rotation } from '@pdfme/pdf-lib';
import type { ColorType, Font, PDFRenderProps } from '@pdfme/common';
import { mm2pt } from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';
import {
  CODE_BACKGROUND_COLOR,
  CODE_HORIZONTAL_PADDING,
  SYNTHETIC_BOLD_PDF_EXTRA_DRAWS,
  SYNTHETIC_BOLD_OFFSET_RATIO,
  SYNTHETIC_ITALIC_SKEW_DEGREES,
  VERTICAL_ALIGN_BOTTOM,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_TOP,
} from './constants.js';
import { getFontDescentInPt, heightOfFontAtSize, widthOfTextAtSize } from './helper.js';
import { parseInlineMarkdown } from './inlineMarkdown.js';
import {
  countRichTextLineGraphemes,
  layoutRichTextLines,
  resolveRichTextRuns,
  type RichTextLineRun,
} from './richText.js';
import type { TextSchema } from './types.js';
import { hex2PrintingColor, rotatePoint } from '../utils.js';

type TextColor = ReturnType<typeof hex2PrintingColor>;

const getSyntheticBoldWidth = (run: RichTextLineRun, fontSize: number) =>
  run.syntheticBold ? fontSize * SYNTHETIC_BOLD_OFFSET_RATIO * SYNTHETIC_BOLD_PDF_EXTRA_DRAWS : 0;

const getRunWidth = (run: RichTextLineRun, fontSize: number, characterSpacing: number) =>
  widthOfTextAtSize(run.text, run.fontKitFont, fontSize, characterSpacing) +
  getSyntheticBoldWidth(run, fontSize);

const getPdfFont = (run: RichTextLineRun, pdfFontObj: Record<string, PDFFont>) => {
  const pdfFont = pdfFontObj[run.fontName];
  if (!pdfFont) {
    throw new Error(`[@pdfme/schemas] Missing embedded font "${run.fontName}".`);
  }
  return pdfFont;
};

const drawRun = (arg: {
  page: PDFRenderProps<TextSchema>['page'];
  pdfLib: PDFRenderProps<TextSchema>['pdfLib'];
  run: RichTextLineRun;
  pdfFont: PDFFont;
  x: number;
  y: number;
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  fontSize: number;
  lineHeight: number;
  color: TextColor;
  opacity: number | undefined;
  colorType: ColorType;
  characterSpacing: number;
  strikethrough: boolean;
  underline: boolean;
}) => {
  const {
    page,
    pdfLib,
    run,
    pdfFont,
    x,
    y,
    rotate,
    pivotPoint,
    fontSize,
    lineHeight,
    color,
    opacity,
    colorType,
    characterSpacing,
    strikethrough,
    underline,
  } = arg;
  const runWidth = getRunWidth(run, fontSize, characterSpacing);
  const textHeight = heightOfFontAtSize(run.fontKitFont, fontSize);

  if (run.code) {
    const padding = CODE_HORIZONTAL_PADDING;
    const bgX = x - padding;
    const bgY = y - textHeight * 0.2;
    const bgPoint =
      rotate.angle === 0
        ? { x: bgX, y: bgY }
        : rotatePoint({ x: bgX, y: bgY }, pivotPoint, rotate.angle);
    page.drawRectangle({
      x: bgPoint.x,
      y: bgPoint.y,
      width: runWidth + padding * 2,
      height: textHeight * 1.2,
      rotate,
      color: hex2PrintingColor(CODE_BACKGROUND_COLOR, colorType),
      opacity,
    });
  }

  if (strikethrough && runWidth > 0) {
    const yLine = y + textHeight / 3;
    page.drawLine({
      start: rotatePoint({ x, y: yLine }, pivotPoint, rotate.angle),
      end: rotatePoint({ x: x + runWidth, y: yLine }, pivotPoint, rotate.angle),
      thickness: (1 / 12) * fontSize,
      color,
      opacity,
    });
  }

  if (underline && runWidth > 0) {
    const yLine = y - textHeight / 12;
    page.drawLine({
      start: rotatePoint({ x, y: yLine }, pivotPoint, rotate.angle),
      end: rotatePoint({ x: x + runWidth, y: yLine }, pivotPoint, rotate.angle),
      thickness: (1 / 12) * fontSize,
      color,
      opacity,
    });
  }

  const drawAt = (drawX: number) => {
    const point =
      rotate.angle === 0 ? { x: drawX, y } : rotatePoint({ x: drawX, y }, pivotPoint, rotate.angle);
    page.drawText(run.text, {
      x: point.x,
      y: point.y,
      rotate,
      size: fontSize,
      color,
      lineHeight: lineHeight * fontSize,
      font: pdfFont,
      opacity,
      ...(run.syntheticItalic ? { xSkew: pdfLib.degrees(SYNTHETIC_ITALIC_SKEW_DEGREES) } : {}),
    });
  };

  drawAt(x);
  if (run.syntheticBold) {
    const offset = fontSize * SYNTHETIC_BOLD_OFFSET_RATIO;
    for (let i = 1; i <= SYNTHETIC_BOLD_PDF_EXTRA_DRAWS; i++) {
      drawAt(x + offset * i);
    }
  }
};

export const renderInlineMarkdownText = async (arg: {
  value: string;
  schema: TextSchema;
  font: Font;
  pdfFontObj: Record<string, PDFFont>;
  fontKitFont: FontKitFont;
  page: PDFRenderProps<TextSchema>['page'];
  pdfLib: PDFRenderProps<TextSchema>['pdfLib'];
  _cache: Map<string | number, unknown>;
  colorType: ColorType;
  fontSize: number;
  color: TextColor;
  alignment: string;
  verticalAlignment: string;
  lineHeight: number;
  characterSpacing: number;
  x: number;
  width: number;
  height: number;
  pageHeight: number;
  pivotPoint: { x: number; y: number };
  rotate: Rotation;
  opacity: number | undefined;
}) => {
  const {
    value,
    schema,
    font,
    pdfFontObj,
    fontKitFont,
    page,
    pdfLib,
    _cache,
    colorType,
    fontSize,
    color,
    alignment,
    verticalAlignment,
    lineHeight,
    characterSpacing,
    x,
    width,
    height,
    pageHeight,
    pivotPoint,
    rotate,
    opacity,
  } = arg;
  const richTextRuns = parseInlineMarkdown(value);
  const resolvedRuns = await resolveRichTextRuns({ runs: richTextRuns, schema, font, _cache });
  const lines = layoutRichTextLines({
    runs: resolvedRuns,
    fontSize,
    characterSpacing,
    boxWidthInPt: width,
  });

  const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);
  const descent = getFontDescentInPt(fontKitFont, fontSize);
  const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * fontSize) / 2;

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
    if (line.runs.length === 0) return;

    let textWidth = line.width;
    let spacing = characterSpacing;
    const shouldJustify = alignment === 'justify' && !line.hardBreak && rowIndex < lines.length - 1;

    if (shouldJustify) {
      const graphemeCount = countRichTextLineGraphemes(line);
      if (graphemeCount > 0) {
        spacing += (width - textWidth) / graphemeCount;
        textWidth = width;
      }
    }

    let xLine = x;
    if (alignment === 'center') {
      xLine += (width - textWidth) / 2;
    } else if (alignment === 'right') {
      xLine += width - textWidth;
    }

    const yLine =
      pageHeight - mm2pt(schema.position.y) - yOffset - lineHeight * fontSize * rowIndex;
    page.pushOperators(pdfLib.setCharacterSpacing(spacing));

    line.runs.reduce((currentX, run, runIndex) => {
      const runWidth = getRunWidth(run, fontSize, spacing);
      const pdfFont = getPdfFont(run, pdfFontObj);
      drawRun({
        page,
        pdfLib,
        run,
        pdfFont,
        x: currentX,
        y: yLine,
        rotate,
        pivotPoint,
        fontSize,
        lineHeight,
        color,
        opacity,
        colorType,
        characterSpacing: spacing,
        strikethrough: Boolean(schema.strikethrough) || Boolean(run.strikethrough),
        underline: Boolean(schema.underline),
      });

      return currentX + runWidth + (runIndex === line.runs.length - 1 ? 0 : spacing);
    }, xLine);
  });
};
