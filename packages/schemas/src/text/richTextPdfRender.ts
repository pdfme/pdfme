import type { PDFFont, Rotation } from '@pdfme/pdf-lib';
import type { ColorType, Font, PDFRenderProps } from '@pdfme/common';
import { getInternalLinkTarget, registerInternalLinkAnnotation } from '@pdfme/common';
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
import { addUriLinkAnnotation, type LinkAnnotationRect } from './linkAnnotation.js';
import { parseInlineMarkdown } from './inlineMarkdown.js';
import { applyTextLineRange } from './measure.js';
import {
  countRichTextLineGraphemes,
  layoutRichTextLines,
  resolveRichTextRuns,
  type RichTextLineRun,
} from './richText.js';
import type { TextSchema } from './types.js';
import { hex2PrintingColor, rotatePoint } from '../utils.js';
import { getTextLineRange } from '../splitRange.js';

type TextColor = ReturnType<typeof hex2PrintingColor>;

const getSyntheticBoldWidth = (run: RichTextLineRun, fontSize: number) =>
  run.syntheticBold ? fontSize * SYNTHETIC_BOLD_OFFSET_RATIO * SYNTHETIC_BOLD_PDF_EXTRA_DRAWS : 0;

const getSyntheticItalicWidth = (run: RichTextLineRun, fontSize: number) =>
  run.syntheticItalic
    ? heightOfFontAtSize(run.fontKitFont, fontSize) *
      Math.tan((SYNTHETIC_ITALIC_SKEW_DEGREES * Math.PI) / 180)
    : 0;

const getRunWidth = (run: RichTextLineRun, fontSize: number, characterSpacing: number) =>
  widthOfTextAtSize(run.text, run.fontKitFont, fontSize, characterSpacing) +
  getSyntheticBoldWidth(run, fontSize) +
  getSyntheticItalicWidth(run, fontSize) +
  (run.code ? CODE_HORIZONTAL_PADDING * 2 : 0);

const getPdfFontFromObj = (run: RichTextLineRun, pdfFontObj: Record<string, PDFFont>) => {
  const pdfFont = pdfFontObj[run.fontName];
  if (!pdfFont) {
    throw new Error(`[@pdfme/schemas] Missing embedded font "${run.fontName}".`);
  }
  return pdfFont;
};

const embedFontsForRuns = async (
  runs: RichTextLineRun[],
  embedPdfFont: (fontName: string) => Promise<PDFFont>,
) => {
  const fontNames = Array.from(new Set(runs.map((run) => run.fontName)));
  const pdfFonts = await Promise.all(
    fontNames.map(async (fontName) => [fontName, await embedPdfFont(fontName)] as const),
  );
  return Object.fromEntries(pdfFonts);
};

const drawDecorationLine = (arg: {
  page: PDFRenderProps<TextSchema>['page'];
  x: number;
  y: number;
  width: number;
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  fontSize: number;
  color: TextColor;
  opacity: number | undefined;
}) => {
  const { page, x, y, width, rotate, pivotPoint, fontSize, color, opacity } = arg;
  if (width <= 0) return;

  page.drawLine({
    start: rotatePoint({ x, y }, pivotPoint, rotate.angle),
    end: rotatePoint({ x: x + width, y }, pivotPoint, rotate.angle),
    thickness: (1 / 12) * fontSize,
    color,
    opacity,
  });
};

const getAxisAlignedRect = (arg: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
}): LinkAnnotationRect => {
  const { x, y, width, height, rotate, pivotPoint } = arg;
  if (rotate.angle === 0) return { x, y, width, height };

  const points = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].map((point) => rotatePoint(point, pivotPoint, rotate.angle));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
};

const getLinkAnnotationRect = (arg: {
  run: RichTextLineRun;
  x: number;
  y: number;
  width: number;
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  fontSize: number;
}): LinkAnnotationRect => {
  const { run, x, y, width, rotate, pivotPoint, fontSize } = arg;
  const textHeight = heightOfFontAtSize(run.fontKitFont, fontSize);
  const descent = getFontDescentInPt(run.fontKitFont, fontSize);
  const rectY = y + descent;
  const rectHeight = textHeight - descent;

  return getAxisAlignedRect({
    x,
    y: rectY,
    width,
    height: rectHeight,
    rotate,
    pivotPoint,
  });
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
  const codePadding = run.code ? CODE_HORIZONTAL_PADDING : 0;
  const textX = x + codePadding;
  const textWidth = runWidth - codePadding * 2;
  const textHeight = heightOfFontAtSize(run.fontKitFont, fontSize);

  if (run.code) {
    const bgX = x;
    const bgY = y - textHeight * 0.2;
    const bgPoint =
      rotate.angle === 0
        ? { x: bgX, y: bgY }
        : rotatePoint({ x: bgX, y: bgY }, pivotPoint, rotate.angle);
    page.drawRectangle({
      x: bgPoint.x,
      y: bgPoint.y,
      width: runWidth,
      height: textHeight * 1.2,
      rotate,
      color: hex2PrintingColor(CODE_BACKGROUND_COLOR, colorType),
      opacity,
    });
  }

  if (strikethrough && runWidth > 0) {
    drawDecorationLine({
      page,
      x: textX,
      y: y + textHeight / 3,
      width: textWidth,
      rotate,
      pivotPoint,
      fontSize,
      color,
      opacity,
    });
  }

  if (underline && runWidth > 0) {
    drawDecorationLine({
      page,
      x: textX,
      y: y - textHeight / 12,
      width: textWidth,
      rotate,
      pivotPoint,
      fontSize,
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
      ...(run.syntheticItalic ? { ySkew: pdfLib.degrees(SYNTHETIC_ITALIC_SKEW_DEGREES) } : {}),
    });
  };

  drawAt(textX);
  if (run.syntheticBold) {
    const offset = fontSize * SYNTHETIC_BOLD_OFFSET_RATIO;
    for (let i = 1; i <= SYNTHETIC_BOLD_PDF_EXTRA_DRAWS; i++) {
      drawAt(textX + offset * i);
    }
  }
};

export const renderInlineMarkdownText = async (arg: {
  value: string;
  schema: TextSchema;
  font: Font;
  embedPdfFont: (fontName: string) => Promise<PDFFont>;
  fontKitFont: FontKitFont;
  pdfDoc: PDFRenderProps<TextSchema>['pdfDoc'];
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
  y: number;
  width: number;
  height: number;
  pivotPoint: { x: number; y: number };
  rotate: Rotation;
  opacity: number | undefined;
}) => {
  const {
    value,
    schema,
    font,
    embedPdfFont,
    fontKitFont,
    pdfDoc,
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
    y,
    width,
    height,
    pivotPoint,
    rotate,
    opacity,
  } = arg;
  const richTextRuns = parseInlineMarkdown(value);
  const resolvedRuns = await resolveRichTextRuns({ runs: richTextRuns, schema, font, _cache });
  const allLines = layoutRichTextLines({
    runs: resolvedRuns,
    fontSize,
    characterSpacing,
    boxWidthInPt: width,
  });
  const lineRange = getTextLineRange(schema);
  const lines = applyTextLineRange(allLines, lineRange);
  const lineRangeStart = lineRange?.start ?? 0;
  const pdfFontObj = await embedFontsForRuns(
    lines.flatMap((line) => line.runs),
    embedPdfFont,
  );

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
    const shouldJustify =
      alignment === 'justify' && !line.hardBreak && lineRangeStart + rowIndex < allLines.length - 1;

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

    const yLine = y + height - yOffset - lineHeight * fontSize * rowIndex;
    page.pushOperators(pdfLib.setCharacterSpacing(spacing));

    if (schema.strikethrough || schema.underline) {
      const textHeight = Math.max(
        ...line.runs.map((run) => heightOfFontAtSize(run.fontKitFont, fontSize)),
      );
      if (schema.strikethrough) {
        drawDecorationLine({
          page,
          x: xLine,
          y: yLine + textHeight / 3,
          width: textWidth,
          rotate,
          pivotPoint,
          fontSize,
          color,
          opacity,
        });
      }
      if (schema.underline) {
        drawDecorationLine({
          page,
          x: xLine,
          y: yLine - textHeight / 12,
          width: textWidth,
          rotate,
          pivotPoint,
          fontSize,
          color,
          opacity,
        });
      }
    }

    line.runs.reduce((currentX, run, runIndex) => {
      const runWidth = getRunWidth(run, fontSize, spacing);
      const pdfFont = getPdfFontFromObj(run, pdfFontObj);
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
        strikethrough: Boolean(run.strikethrough),
        underline: Boolean(run.href) && !schema.underline,
      });
      if (run.href) {
        const rect = getLinkAnnotationRect({
          run,
          x: currentX,
          y: yLine,
          width: runWidth,
          rotate,
          pivotPoint,
          fontSize,
        });
        const targetName = getInternalLinkTarget(run.href);
        if (targetName) {
          registerInternalLinkAnnotation({ _cache, page, targetName, rect });
        } else {
          addUriLinkAnnotation({ pdfDoc, page, uri: run.href, rect });
        }
      }

      return currentX + runWidth + (runIndex === line.runs.length - 1 ? 0 : spacing);
    }, xLine);
  });
};
