import { PDFFont, rgb, Rotation } from '@pdfme/pdf-lib';
import type { Font as FontKitFont } from 'fontkit';
import type { PDFRenderProps } from '@pdfme/common';
import type { TextSchema, TextSegment, TextBlock } from '../types.js';
import {
  heightOfFontAtSize,
  widthOfTextAtSize,
  splitTextToSize,
} from '../helper.js';
import { rotatePoint, hex2PrintingColor } from '../../utils.js';
import { parseInlineStyles, HEADING_SIZE_MULTIPLIERS, stripRichText } from './index.js';
import {
  BOLD_STROKE_WIDTH_RATIO,
  CODE_BG_COLOR,
  CODE_FONT_SIZE_RATIO,
  BLOCKQUOTE_BORDER_COLOR,
  BLOCKQUOTE_TEXT_COLOR,
  BLOCKQUOTE_BORDER_WIDTH,
  BLOCKQUOTE_PADDING_LEFT,
  LIST_INDENT_PER_LEVEL,
  LIST_MARKER_WIDTH,
  LIST_BULLET_CHAR,
  LIST_ITEM_SPACING,
  TABLE_BORDER_COLOR,
  TABLE_HEADER_BG_COLOR,
  TABLE_BORDER_WIDTH,
  TABLE_CELL_PADDING,
} from './constants.js';

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
};

export const drawSegments = (params: {
  segments: TextSegment[];
  xStart: number;
  yLine: number;
  fontSize: number;
  textHeight: number;
  fontKitFont: FontKitFont;
  characterSpacing: number;
  lineHeight: number;
  color: ReturnType<typeof hex2PrintingColor>;
  pdfFontValue: PDFFont;
  page: PDFRenderProps<TextSchema>['page'];
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  opacity: number | undefined;
  colorOverride?: string;
}) => {
  const {
    segments,
    xStart,
    yLine,
    fontSize,
    textHeight,
    fontKitFont,
    characterSpacing,
    lineHeight,
    color,
    pdfFontValue,
    page,
    rotate,
    pivotPoint,
    opacity,
    colorOverride,
  } = params;

  let currentX = xStart;
  for (const segment of segments) {
    if (!segment.content) continue;

    const segmentFontSize = segment.code ? fontSize * CODE_FONT_SIZE_RATIO : fontSize;
    const segmentWidth = widthOfTextAtSize(
      segment.content,
      fontKitFont,
      segmentFontSize,
      characterSpacing,
    );

    if (segment.code) {
      const bgRgb = hexToRgb(CODE_BG_COLOR);
      if (bgRgb) {
        const bgColor = rgb(bgRgb.r, bgRgb.g, bgRgb.b);
        const bgY = yLine - textHeight * 0.15;
        const bgHeight = textHeight * 1.1;
        const padding = 2;
        if (rotate.angle !== 0) {
          const rotatedBgPoint = rotatePoint({ x: currentX - padding, y: bgY }, pivotPoint, rotate.angle);
          page.drawRectangle({
            x: rotatedBgPoint.x,
            y: rotatedBgPoint.y,
            width: segmentWidth + padding * 2,
            height: bgHeight,
            color: bgColor,
            rotate,
            opacity,
          });
        } else {
          page.drawRectangle({
            x: currentX - padding,
            y: bgY,
            width: segmentWidth + padding * 2,
            height: bgHeight,
            color: bgColor,
            opacity,
          });
        }
      }
    } else if (segment.backgroundColor) {
      const bgRgb = hexToRgb(segment.backgroundColor);
      if (bgRgb) {
        const bgColor = rgb(bgRgb.r, bgRgb.g, bgRgb.b);
        const bgY = yLine - textHeight * 0.2;
        const bgHeight = textHeight * 1.2;
        if (rotate.angle !== 0) {
          const rotatedBgPoint = rotatePoint({ x: currentX, y: bgY }, pivotPoint, rotate.angle);
          page.drawRectangle({
            x: rotatedBgPoint.x,
            y: rotatedBgPoint.y,
            width: segmentWidth,
            height: bgHeight,
            color: bgColor,
            rotate,
            opacity,
          });
        } else {
          page.drawRectangle({
            x: currentX,
            y: bgY,
            width: segmentWidth,
            height: bgHeight,
            color: bgColor,
            opacity,
          });
        }
      }
    }

    let segmentColor = color;
    if (colorOverride) {
      const overrideRgb = hexToRgb(colorOverride);
      if (overrideRgb) {
        segmentColor = rgb(overrideRgb.r, overrideRgb.g, overrideRgb.b);
      }
    } else if (segment.color) {
      const colorRgb = hexToRgb(segment.color);
      if (colorRgb) {
        segmentColor = rgb(colorRgb.r, colorRgb.g, colorRgb.b);
      }
    }

    page.drawText(segment.content, {
      x: currentX,
      y: yLine,
      rotate,
      size: segmentFontSize,
      color: segmentColor,
      lineHeight: lineHeight * fontSize,
      font: pdfFontValue,
      opacity,
    });

    if (segment.bold) {
      const strokeWidth = segmentFontSize * BOLD_STROKE_WIDTH_RATIO;
      page.drawText(segment.content, {
        x: currentX + strokeWidth * 0.5,
        y: yLine,
        rotate,
        size: segmentFontSize,
        color: segmentColor,
        lineHeight: lineHeight * fontSize,
        font: pdfFontValue,
        opacity,
      });
    }

    currentX += segmentWidth + characterSpacing;
  }
};

export interface RenderRichTextParams {
  blocks: TextBlock[];
  schema: TextSchema;
  page: PDFRenderProps<TextSchema>['page'];
  pdfLib: PDFRenderProps<TextSchema>['pdfLib'];
  fontKitFont: FontKitFont;
  pdfFontValue: PDFFont;
  baseFontSize: number;
  color: ReturnType<typeof hex2PrintingColor>;
  alignment: string;
  verticalAlignment: string;
  lineHeight: number;
  characterSpacing: number;
  x: number;
  width: number;
  pageHeight: number;
  schemaPositionY: number;
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  opacity: number | undefined;
}

export const renderRichTextBlocks = (params: RenderRichTextParams) => {
  const {
    blocks,
    schema,
    page,
    pdfLib,
    fontKitFont,
    pdfFontValue,
    baseFontSize,
    color,
    alignment,
    verticalAlignment,
    lineHeight,
    characterSpacing,
    x,
    width,
    pageHeight,
    schemaPositionY,
    rotate,
    pivotPoint,
    opacity,
  } = params;

  let currentY = pageHeight - schemaPositionY;
  const firstLineTextHeight = heightOfFontAtSize(fontKitFont, baseFontSize);
  const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * baseFontSize) / 2;

  if (verticalAlignment === 'top') {
    currentY -= firstLineTextHeight + halfLineHeightAdjustment;
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  const lineRange = schema.__lineRange;
  let globalLineIndex = 0;

  const shouldRenderLine = (index: number): boolean => {
    if (!lineRange) return true;
    return index >= lineRange.start && index <= lineRange.end;
  };

  const isBeyondRange = (index: number): boolean => {
    if (!lineRange) return false;
    return index > lineRange.end;
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        currentY = renderHeading({
          block,
          currentY,
          globalLineIndex,
          shouldRenderLine,
          isBeyondRange,
          baseFontSize,
          fontKitFont,
          pdfFontValue,
          characterSpacing,
          lineHeight,
          width,
          x,
          color,
          page,
          rotate,
          pivotPoint,
          opacity,
          alignment,
        });
        globalLineIndex += countHeadingLines(block, fontKitFont, baseFontSize, characterSpacing, width) + 1;
        break;

      case 'code':
        currentY = renderCodeBlock({
          block,
          currentY,
          globalLineIndex,
          shouldRenderLine,
          isBeyondRange,
          baseFontSize,
          fontKitFont,
          pdfFontValue,
          characterSpacing,
          lineHeight,
          width,
          x,
          color,
          page,
          pdfLib,
          rotate,
          pivotPoint,
          opacity,
        });
        globalLineIndex += countCodeLines(block) + 1;
        break;

      case 'blockquote':
        currentY = renderBlockquote({
          block,
          currentY,
          globalLineIndex,
          shouldRenderLine,
          isBeyondRange,
          baseFontSize,
          fontKitFont,
          pdfFontValue,
          characterSpacing,
          lineHeight,
          width,
          x,
          color,
          page,
          pdfLib,
          rotate,
          pivotPoint,
          opacity,
        });
        globalLineIndex += countBlockquoteLines(block, fontKitFont, baseFontSize, characterSpacing, width) + 1;
        break;

      case 'table':
        currentY = renderTable({
          block,
          currentY,
          globalLineIndex,
          shouldRenderLine,
          isBeyondRange,
          baseFontSize,
          fontKitFont,
          pdfFontValue,
          characterSpacing,
          lineHeight,
          width,
          x,
          color,
          page,
          pdfLib,
          rotate,
          pivotPoint,
          opacity,
        });
        globalLineIndex += countTableLines(block) + 1;
        break;

      case 'list':
        currentY = renderList({
          block,
          currentY,
          globalLineIndex,
          shouldRenderLine,
          isBeyondRange,
          baseFontSize,
          fontKitFont,
          pdfFontValue,
          characterSpacing,
          lineHeight,
          width,
          x,
          color,
          page,
          pdfLib,
          rotate,
          pivotPoint,
          opacity,
        });
        globalLineIndex += countListLines(block) + 1;
        break;

      case 'paragraph':
      default:
        currentY = renderParagraph({
          block,
          currentY,
          globalLineIndex,
          shouldRenderLine,
          isBeyondRange,
          baseFontSize,
          fontKitFont,
          pdfFontValue,
          characterSpacing,
          lineHeight,
          width,
          x,
          color,
          page,
          pdfLib,
          rotate,
          pivotPoint,
          opacity,
          alignment,
          segmenter,
        });
        globalLineIndex += countParagraphLines(block, fontKitFont, baseFontSize, characterSpacing, width) + 1;
        break;
    }
  }
};

const splitSegmentsIntoLines = (
  rawText: string,
  fontKitFont: FontKitFont,
  fontSize: number,
  characterSpacing: number,
  boxWidthInPt: number,
): TextSegment[][] => {
  const segments = parseInlineStyles(rawText);

  const result: TextSegment[][] = [];
  let currentLine: TextSegment[] = [];
  let currentLineWidth = 0;

  for (const segment of segments) {
    const content = segment.content;

    const parts = content.split('\n');

    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];

      if (partIndex > 0) {
        if (currentLine.length > 0) {
          result.push(currentLine);
        } else {
          result.push([{ content: '' }]);
        }
        currentLine = [];
        currentLineWidth = 0;
      }

      if (part.length === 0) continue;

      let remainingText = part;
      while (remainingText.length > 0) {
        const textWidth = widthOfTextAtSize(remainingText, fontKitFont, fontSize, characterSpacing);

        if (currentLineWidth + textWidth <= boxWidthInPt) {
          if (remainingText.trim().length > 0 || currentLine.length === 0) {
            currentLine.push({
              ...segment,
              content: remainingText,
            });
          }
          currentLineWidth += textWidth;
          remainingText = '';
        } else {
          let splitPos = 0;
          let lastBreakPos = 0;
          let testWidth = 0;

          for (let i = 0; i < remainingText.length; i++) {
            const char = remainingText[i];
            const charWidth = widthOfTextAtSize(char, fontKitFont, fontSize, characterSpacing);

            if (currentLineWidth + testWidth + charWidth > boxWidthInPt) {
              if (lastBreakPos > 0) {
                splitPos = lastBreakPos;
              } else if (splitPos === 0 && currentLine.length === 0) {
                splitPos = Math.max(1, i);
              } else {
                splitPos = i;
              }
              break;
            }

            testWidth += charWidth;
            splitPos = i + 1;

            if (char === ' ' || char === '-' || char === '　') {
              lastBreakPos = i + 1;
            }
          }

          if (splitPos === 0) splitPos = 1;

          const fitPart = remainingText.substring(0, splitPos).trimEnd();
          remainingText = remainingText.substring(splitPos).trimStart();

          if (fitPart.length > 0) {
            currentLine.push({
              ...segment,
              content: fitPart,
            });
          }

          if (currentLine.length > 0) {
            result.push(currentLine);
          }
          currentLine = [];
          currentLineWidth = 0;
        }
      }
    }
  }

  if (currentLine.length > 0) {
    result.push(currentLine);
  }

  if (result.length === 0) {
    result.push([{ content: '' }]);
  }

  return result;
};

const countHeadingLines = (
  block: TextBlock,
  fontKitFont: FontKitFont,
  baseFontSize: number,
  characterSpacing: number,
  width: number,
): number => {
  const level = block.level ?? 1;
  const sizeMultiplier = HEADING_SIZE_MULTIPLIERS[level];
  const headingFontSize = baseFontSize * sizeMultiplier;
  const segments = block.lines[0]?.segments ?? [];
  const plainText = segments.map((s) => s.content).join('');
  const lines = splitTextToSize({
    value: plainText,
    characterSpacing,
    fontSize: headingFontSize,
    fontKitFont,
    boxWidthInPt: width,
  });
  return lines.length;
};

const countCodeLines = (block: TextBlock): number => {
  const content = block.lines[0]?.segments[0]?.content ?? '';
  return content.split('\n').filter((l) => l !== '').length;
};

const countBlockquoteLines = (
  block: TextBlock,
  fontKitFont: FontKitFont,
  baseFontSize: number,
  characterSpacing: number,
  width: number,
): number => {
  const segments = block.lines[0]?.segments ?? [];
  const plainText = segments.map((s) => s.content).join('');
  const lines = splitTextToSize({
    value: plainText,
    characterSpacing,
    fontSize: baseFontSize,
    fontKitFont,
    boxWidthInPt: width - BLOCKQUOTE_PADDING_LEFT,
  });
  return lines.length;
};

const countParagraphLines = (
  block: TextBlock,
  fontKitFont: FontKitFont,
  baseFontSize: number,
  characterSpacing: number,
  width: number,
): number => {
  const rawText = block.rawText;
  const segments = block.lines[0]?.segments ?? [];
  const plainText = segments.map((s) => s.content).join('');
  // splitSegmentsIntoLinesと同じロジックで行数をカウント
  const segmentsByLine = splitSegmentsIntoLines(
    rawText ?? plainText,
    fontKitFont,
    baseFontSize,
    characterSpacing,
    width,
  );
  return segmentsByLine.length;
};

const countTableLines = (block: TextBlock): number => {
  const tableData = block.tableData;
  if (!tableData) return 0;
  return 1 + tableData.rows.length;
};

const countListLines = (block: TextBlock): number => {
  const listItems = block.listItems;
  if (!listItems) return 0;
  return listItems.length;
};

const renderHeading = (params: {
  block: TextBlock;
  currentY: number;
  globalLineIndex: number;
  shouldRenderLine: (index: number) => boolean;
  isBeyondRange: (index: number) => boolean;
  baseFontSize: number;
  fontKitFont: FontKitFont;
  pdfFontValue: PDFFont;
  characterSpacing: number;
  lineHeight: number;
  width: number;
  x: number;
  color: ReturnType<typeof hex2PrintingColor>;
  page: PDFRenderProps<TextSchema>['page'];
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  opacity: number | undefined;
  alignment: string;
}): number => {
  const {
    block,
    currentY: initialY,
    globalLineIndex: startLineIndex,
    shouldRenderLine,
    isBeyondRange,
    baseFontSize,
    fontKitFont,
    pdfFontValue,
    characterSpacing,
    lineHeight,
    width,
    x,
    color,
    page,
    rotate,
    pivotPoint,
    opacity,
    alignment,
  } = params;

  if (isBeyondRange(startLineIndex)) return initialY;

  let currentY = initialY;
  let lineIndex = startLineIndex;

  const level = block.level ?? 1;
  const sizeMultiplier = HEADING_SIZE_MULTIPLIERS[level];
  const headingFontSize = baseFontSize * sizeMultiplier;

  const segments = block.lines[0]?.segments ?? [];
  const plainText = segments.map((s) => s.content).join('');

  const lines = splitTextToSize({
    value: plainText,
    characterSpacing,
    fontSize: headingFontSize,
    fontKitFont,
    boxWidthInPt: width,
  });

  for (let i = 0; i < lines.length; i++) {
    const currentLineIndex = lineIndex;
    lineIndex++;

    if (!shouldRenderLine(currentLineIndex)) {
      continue;
    }

    const line = lines[i].replace('\n', '');
    if (!line) continue;

    const lineSegments = i === 0 ? segments : [{ content: line }];
    const lineTextWidth = widthOfTextAtSize(line, fontKitFont, headingFontSize, characterSpacing);

    let xLine = x;
    if (alignment === 'center') {
      xLine += (width - lineTextWidth) / 2;
    } else if (alignment === 'right') {
      xLine += width - lineTextWidth;
    }

    let finalX = xLine;
    let finalY = currentY;
    if (rotate.angle !== 0) {
      const rotatedPoint = rotatePoint({ x: xLine, y: currentY }, pivotPoint, rotate.angle);
      finalX = rotatedPoint.x;
      finalY = rotatedPoint.y;
    }

    for (const segment of lineSegments) {
      if (!segment.content) continue;
      const segmentWidth = widthOfTextAtSize(segment.content, fontKitFont, headingFontSize, characterSpacing);

      let segmentColor = color;
      if (segment.color) {
        const colorRgb = hexToRgb(segment.color);
        if (colorRgb) {
          segmentColor = rgb(colorRgb.r, colorRgb.g, colorRgb.b);
        }
      }

      page.drawText(segment.content, {
        x: finalX,
        y: finalY,
        rotate,
        size: headingFontSize,
        color: segmentColor,
        lineHeight: lineHeight * headingFontSize,
        font: pdfFontValue,
        opacity,
      });

      const strokeWidth = headingFontSize * BOLD_STROKE_WIDTH_RATIO;
      page.drawText(segment.content, {
        x: finalX + strokeWidth * 0.5,
        y: finalY,
        rotate,
        size: headingFontSize,
        color: segmentColor,
        lineHeight: lineHeight * headingFontSize,
        font: pdfFontValue,
        opacity,
      });

      finalX += segmentWidth + characterSpacing;
    }

    currentY -= lineHeight * headingFontSize;
  }

  if (shouldRenderLine(lineIndex)) {
    currentY -= baseFontSize * 0.3;
  }

  return currentY;
};

const renderCodeBlock = (params: {
  block: TextBlock;
  currentY: number;
  globalLineIndex: number;
  shouldRenderLine: (index: number) => boolean;
  isBeyondRange: (index: number) => boolean;
  baseFontSize: number;
  fontKitFont: FontKitFont;
  pdfFontValue: PDFFont;
  characterSpacing: number;
  lineHeight: number;
  width: number;
  x: number;
  color: ReturnType<typeof hex2PrintingColor>;
  page: PDFRenderProps<TextSchema>['page'];
  pdfLib: PDFRenderProps<TextSchema>['pdfLib'];
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  opacity: number | undefined;
}): number => {
  const {
    block,
    currentY: initialY,
    globalLineIndex: startLineIndex,
    shouldRenderLine,
    isBeyondRange,
    baseFontSize,
    fontKitFont,
    pdfFontValue,
    characterSpacing,
    lineHeight,
    width,
    x,
    color,
    page,
    pdfLib,
    rotate,
    pivotPoint,
    opacity,
  } = params;

  if (isBeyondRange(startLineIndex)) return initialY;

  let currentY = initialY;
  let lineIndex = startLineIndex;

  const codeFontSize = baseFontSize * CODE_FONT_SIZE_RATIO;
  const codeTextHeight = heightOfFontAtSize(fontKitFont, codeFontSize);
  const content = block.lines[0]?.segments[0]?.content ?? '';
  const codeLines = content.split('\n').filter((l) => l !== '');

  const linesToRender: { index: number; line: string; isFirst: boolean }[] = [];
  for (let i = 0; i < codeLines.length; i++) {
    const currentLineIndex = lineIndex;
    lineIndex++;
    if (shouldRenderLine(currentLineIndex)) {
      linesToRender.push({ index: currentLineIndex, line: codeLines[i], isFirst: i === 0 });
    }
  }

  if (linesToRender.length > 0) {
    const bgRgb = hexToRgb(CODE_BG_COLOR);
    if (bgRgb) {
      const bgColor = rgb(bgRgb.r, bgRgb.g, bgRgb.b);
      const bgHeight = linesToRender.length * lineHeight * codeFontSize + (linesToRender[0].isFirst ? 5 : 0) + 5;
      const bgY = currentY - bgHeight + codeTextHeight;
      if (rotate.angle !== 0) {
        const rotatedBgPoint = rotatePoint({ x, y: bgY }, pivotPoint, rotate.angle);
        page.drawRectangle({
          x: rotatedBgPoint.x,
          y: rotatedBgPoint.y,
          width,
          height: bgHeight,
          color: bgColor,
          rotate,
          opacity,
        });
      } else {
        page.drawRectangle({
          x,
          y: bgY,
          width,
          height: bgHeight,
          color: bgColor,
          opacity,
        });
      }
    }
  }

  const codePadding = 5;
  for (const renderLine of linesToRender) {
    const codeLine = renderLine.line;
    if (!codeLine) continue;

    let finalX = x + codePadding;
    let finalY = currentY;
    if (rotate.angle !== 0) {
      const rotatedPoint = rotatePoint({ x: finalX, y: currentY }, pivotPoint, rotate.angle);
      finalX = rotatedPoint.x;
      finalY = rotatedPoint.y;
    }

    page.pushOperators(pdfLib.setCharacterSpacing(characterSpacing));
    page.drawText(codeLine, {
      x: finalX,
      y: finalY,
      rotate,
      size: codeFontSize,
      color,
      lineHeight: lineHeight * codeFontSize,
      font: pdfFontValue,
      opacity,
    });

    currentY -= lineHeight * codeFontSize;
  }

  if (shouldRenderLine(lineIndex)) {
    currentY -= baseFontSize * 1.0;
  }

  return currentY;
};

const renderBlockquote = (params: {
  block: TextBlock;
  currentY: number;
  globalLineIndex: number;
  shouldRenderLine: (index: number) => boolean;
  isBeyondRange: (index: number) => boolean;
  baseFontSize: number;
  fontKitFont: FontKitFont;
  pdfFontValue: PDFFont;
  characterSpacing: number;
  lineHeight: number;
  width: number;
  x: number;
  color: ReturnType<typeof hex2PrintingColor>;
  page: PDFRenderProps<TextSchema>['page'];
  pdfLib: PDFRenderProps<TextSchema>['pdfLib'];
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  opacity: number | undefined;
}): number => {
  const {
    block,
    currentY: initialY,
    globalLineIndex: startLineIndex,
    shouldRenderLine,
    isBeyondRange,
    baseFontSize,
    fontKitFont,
    pdfFontValue,
    characterSpacing,
    lineHeight,
    width,
    x,
    page,
    pdfLib,
    rotate,
    pivotPoint,
    opacity,
  } = params;

  if (isBeyondRange(startLineIndex)) return initialY;

  let currentY = initialY;
  let lineIndex = startLineIndex;

  const segments = block.lines[0]?.segments ?? [];
  const plainText = segments.map((s) => s.content).join('');

  const lines = splitTextToSize({
    value: plainText,
    characterSpacing,
    fontSize: baseFontSize,
    fontKitFont,
    boxWidthInPt: width - BLOCKQUOTE_PADDING_LEFT,
  });

  const linesToRender: { index: number; line: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const currentLineIndex = lineIndex;
    lineIndex++;
    if (shouldRenderLine(currentLineIndex)) {
      linesToRender.push({ index: currentLineIndex, line: lines[i] });
    }
  }

  if (linesToRender.length > 0) {
    const borderRgb = hexToRgb(BLOCKQUOTE_BORDER_COLOR);
    if (borderRgb) {
      const borderColor = rgb(borderRgb.r, borderRgb.g, borderRgb.b);
      const quoteBlockHeight = linesToRender.length * lineHeight * baseFontSize;
      const borderStartY = currentY;
      const borderEndY = borderStartY - quoteBlockHeight + heightOfFontAtSize(fontKitFont, baseFontSize);

      if (rotate.angle !== 0) {
        const startPoint = rotatePoint({ x, y: borderStartY }, pivotPoint, rotate.angle);
        const endPoint = rotatePoint({ x, y: borderEndY }, pivotPoint, rotate.angle);
        page.drawLine({
          start: startPoint,
          end: endPoint,
          thickness: BLOCKQUOTE_BORDER_WIDTH,
          color: borderColor,
          opacity,
        });
      } else {
        page.drawLine({
          start: { x, y: borderStartY },
          end: { x, y: borderEndY },
          thickness: BLOCKQUOTE_BORDER_WIDTH,
          color: borderColor,
          opacity,
        });
      }
    }
  }

  const quoteColorRgb = hexToRgb(BLOCKQUOTE_TEXT_COLOR);
  const quoteColor = quoteColorRgb ? rgb(quoteColorRgb.r, quoteColorRgb.g, quoteColorRgb.b) : undefined;

  for (const renderLine of linesToRender) {
    const line = renderLine.line.replace('\n', '');
    if (!line) continue;

    let finalX = x + BLOCKQUOTE_PADDING_LEFT;
    let finalY = currentY;
    if (rotate.angle !== 0) {
      const rotatedPoint = rotatePoint({ x: finalX, y: currentY }, pivotPoint, rotate.angle);
      finalX = rotatedPoint.x;
      finalY = rotatedPoint.y;
    }

    page.pushOperators(pdfLib.setCharacterSpacing(characterSpacing));
    page.drawText(line, {
      x: finalX,
      y: finalY,
      rotate,
      size: baseFontSize,
      color: quoteColor,
      lineHeight: lineHeight * baseFontSize,
      font: pdfFontValue,
      opacity,
    });

    currentY -= lineHeight * baseFontSize;
  }

  if (shouldRenderLine(lineIndex)) {
    currentY -= baseFontSize * 0.3;
  }

  return currentY;
};

const renderParagraph = (params: {
  block: TextBlock;
  currentY: number;
  globalLineIndex: number;
  shouldRenderLine: (index: number) => boolean;
  isBeyondRange: (index: number) => boolean;
  baseFontSize: number;
  fontKitFont: FontKitFont;
  pdfFontValue: PDFFont;
  characterSpacing: number;
  lineHeight: number;
  width: number;
  x: number;
  color: ReturnType<typeof hex2PrintingColor>;
  page: PDFRenderProps<TextSchema>['page'];
  pdfLib: PDFRenderProps<TextSchema>['pdfLib'];
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  opacity: number | undefined;
  alignment: string;
  segmenter: Intl.Segmenter;
}): number => {
  const {
    block,
    currentY: initialY,
    globalLineIndex: startLineIndex,
    shouldRenderLine,
    isBeyondRange,
    baseFontSize,
    fontKitFont,
    pdfFontValue,
    characterSpacing,
    lineHeight,
    width,
    x,
    color,
    page,
    pdfLib,
    rotate,
    pivotPoint,
    opacity,
    alignment,
    segmenter,
  } = params;

  if (isBeyondRange(startLineIndex)) return initialY;

  let currentY = initialY;
  let lineIndex = startLineIndex;

  const textHeight = heightOfFontAtSize(fontKitFont, baseFontSize);
  const rawText = block.rawText;
  const segments = block.lines[0]?.segments ?? [];
  const plainText = segments.map((s) => s.content).join('');

  const segmentsByLine = splitSegmentsIntoLines(
    rawText ?? plainText,
    fontKitFont,
    baseFontSize,
    characterSpacing,
    width,
  );

  const linesToRender: { index: number; lineSegments: TextSegment[]; originalIndex: number }[] = [];
  for (let i = 0; i < segmentsByLine.length; i++) {
    const currentLineIndex = lineIndex;
    lineIndex++;
    if (shouldRenderLine(currentLineIndex)) {
      linesToRender.push({ index: currentLineIndex, lineSegments: segmentsByLine[i], originalIndex: i });
    }
  }

  for (const renderLine of linesToRender) {
    const lineSegments = renderLine.lineSegments;
    if (lineSegments.length === 0) continue;

    const lineTextForWidth = lineSegments.map((s) => s.content).join('');
    if (!lineTextForWidth) continue;

    const lineTextWidth = widthOfTextAtSize(lineTextForWidth, fontKitFont, baseFontSize, characterSpacing);

    let xLine = x;
    if (alignment === 'center') {
      xLine += (width - lineTextWidth) / 2;
    } else if (alignment === 'right') {
      xLine += width - lineTextWidth;
    }

    let finalX = xLine;
    let finalY = currentY;
    if (rotate.angle !== 0) {
      const rotatedPoint = rotatePoint({ x: xLine, y: currentY }, pivotPoint, rotate.angle);
      finalX = rotatedPoint.x;
      finalY = rotatedPoint.y;
    }

    let spacing = characterSpacing;
    const isLastLine = renderLine.originalIndex === segmentsByLine.length - 1;
    if (alignment === 'justify' && !isLastLine) {
      const iterator = segmenter.segment(lineTextForWidth)[Symbol.iterator]();
      const len = Array.from(iterator).length;
      if (len > 1) {
        spacing += (width - lineTextWidth) / (len - 1);
      }
    }
    page.pushOperators(pdfLib.setCharacterSpacing(spacing));

    drawSegments({
      segments: lineSegments,
      xStart: finalX,
      yLine: finalY,
      fontSize: baseFontSize,
      textHeight,
      fontKitFont,
      characterSpacing: spacing,
      lineHeight,
      color,
      pdfFontValue,
      page,
      rotate,
      pivotPoint,
      opacity,
    });

    currentY -= lineHeight * baseFontSize;
  }

  if (shouldRenderLine(lineIndex)) {
    currentY -= baseFontSize * 0.3;
  }

  return currentY;
};

const renderTable = (params: {
  block: TextBlock;
  currentY: number;
  globalLineIndex: number;
  shouldRenderLine: (index: number) => boolean;
  isBeyondRange: (index: number) => boolean;
  baseFontSize: number;
  fontKitFont: FontKitFont;
  pdfFontValue: PDFFont;
  characterSpacing: number;
  lineHeight: number;
  width: number;
  x: number;
  color: ReturnType<typeof hex2PrintingColor>;
  page: PDFRenderProps<TextSchema>['page'];
  pdfLib: PDFRenderProps<TextSchema>['pdfLib'];
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  opacity: number | undefined;
}): number => {
  const {
    block,
    currentY: initialY,
    globalLineIndex: startLineIndex,
    shouldRenderLine,
    isBeyondRange,
    baseFontSize,
    fontKitFont,
    pdfFontValue,
    characterSpacing,
    lineHeight,
    width,
    x,
    color,
    page,
    pdfLib,
    rotate,
    pivotPoint,
    opacity,
  } = params;

  if (isBeyondRange(startLineIndex)) return initialY;

  const tableData = block.tableData;
  if (!tableData) return initialY;

  let currentY = initialY;
  let lineIndex = startLineIndex;

  const { headers, rows } = tableData;
  const columnCount = headers.length;
  if (columnCount === 0) return initialY;

  const availableWidth = width - TABLE_CELL_PADDING * 2;
  const cellWidth = availableWidth / columnCount;
  const rowHeight = lineHeight * baseFontSize + TABLE_CELL_PADDING * 2;
  const textHeight = heightOfFontAtSize(fontKitFont, baseFontSize);

  const borderRgb = hexToRgb(TABLE_BORDER_COLOR);
  const borderColor = borderRgb ? rgb(borderRgb.r, borderRgb.g, borderRgb.b) : color;

  const headerBgRgb = hexToRgb(TABLE_HEADER_BG_COLOR);
  const headerBgColor = headerBgRgb ? rgb(headerBgRgb.r, headerBgRgb.g, headerBgRgb.b) : undefined;

  if (shouldRenderLine(lineIndex)) {
    const headerY = currentY;

    if (headerBgColor) {
      if (rotate.angle !== 0) {
        const rotatedBgPoint = rotatePoint({ x, y: headerY - rowHeight + textHeight }, pivotPoint, rotate.angle);
        page.drawRectangle({
          x: rotatedBgPoint.x,
          y: rotatedBgPoint.y,
          width: availableWidth,
          height: rowHeight,
          color: headerBgColor,
          rotate,
          opacity,
        });
      } else {
        page.drawRectangle({
          x,
          y: headerY - rowHeight + textHeight,
          width: availableWidth,
          height: rowHeight,
          color: headerBgColor,
          opacity,
        });
      }
    }

    for (let col = 0; col < columnCount; col++) {
      const cellX = x + col * cellWidth + TABLE_CELL_PADDING;
      const cellText = headers[col] || '';

      let finalX = cellX;
      let finalY = headerY;
      if (rotate.angle !== 0) {
        const rotatedPoint = rotatePoint({ x: cellX, y: headerY }, pivotPoint, rotate.angle);
        finalX = rotatedPoint.x;
        finalY = rotatedPoint.y;
      }

      page.pushOperators(pdfLib.setCharacterSpacing(characterSpacing));
      page.drawText(cellText, {
        x: finalX,
        y: finalY,
        rotate,
        size: baseFontSize,
        color,
        font: pdfFontValue,
        opacity,
      });

      const strokeWidth = baseFontSize * BOLD_STROKE_WIDTH_RATIO;
      page.drawText(cellText, {
        x: finalX + strokeWidth * 0.5,
        y: finalY,
        rotate,
        size: baseFontSize,
        color,
        font: pdfFontValue,
        opacity,
      });
    }

    const lineY = headerY - rowHeight + textHeight;
    if (rotate.angle !== 0) {
      const startPoint = rotatePoint({ x, y: lineY }, pivotPoint, rotate.angle);
      const endPoint = rotatePoint({ x: x + availableWidth, y: lineY }, pivotPoint, rotate.angle);
      page.drawLine({
        start: startPoint,
        end: endPoint,
        thickness: TABLE_BORDER_WIDTH,
        color: borderColor,
        opacity,
      });
    } else {
      page.drawLine({
        start: { x, y: lineY },
        end: { x: x + availableWidth, y: lineY },
        thickness: TABLE_BORDER_WIDTH,
        color: borderColor,
        opacity,
      });
    }

    currentY -= rowHeight;
  }
  lineIndex++;

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    if (!shouldRenderLine(lineIndex)) {
      lineIndex++;
      continue;
    }

    const row = rows[rowIdx];
    const rowY = currentY;

    for (let col = 0; col < columnCount; col++) {
      const cellX = x + col * cellWidth + TABLE_CELL_PADDING;
      const cellText = row[col] || '';

      const segments = parseInlineStyles(cellText);

      let finalX = cellX;
      let finalY = rowY;
      if (rotate.angle !== 0) {
        const rotatedPoint = rotatePoint({ x: cellX, y: rowY }, pivotPoint, rotate.angle);
        finalX = rotatedPoint.x;
        finalY = rotatedPoint.y;
      }

      page.pushOperators(pdfLib.setCharacterSpacing(characterSpacing));
      drawSegments({
        segments,
        xStart: finalX,
        yLine: finalY,
        fontSize: baseFontSize,
        textHeight,
        fontKitFont,
        characterSpacing,
        lineHeight,
        color,
        pdfFontValue,
        page,
        rotate,
        pivotPoint,
        opacity,
      });
    }

    const lineY = rowY - rowHeight + textHeight;
    if (rotate.angle !== 0) {
      const startPoint = rotatePoint({ x, y: lineY }, pivotPoint, rotate.angle);
      const endPoint = rotatePoint({ x: x + availableWidth, y: lineY }, pivotPoint, rotate.angle);
      page.drawLine({
        start: startPoint,
        end: endPoint,
        thickness: TABLE_BORDER_WIDTH,
        color: borderColor,
        opacity,
      });
    } else {
      page.drawLine({
        start: { x, y: lineY },
        end: { x: x + availableWidth, y: lineY },
        thickness: TABLE_BORDER_WIDTH,
        color: borderColor,
        opacity,
      });
    }

    currentY -= rowHeight;
    lineIndex++;
  }

  if (shouldRenderLine(lineIndex)) {
    currentY -= baseFontSize * 0.5;
  }

  return currentY;
};

const renderList = (params: {
  block: TextBlock;
  currentY: number;
  globalLineIndex: number;
  shouldRenderLine: (index: number) => boolean;
  isBeyondRange: (index: number) => boolean;
  baseFontSize: number;
  fontKitFont: FontKitFont;
  pdfFontValue: PDFFont;
  characterSpacing: number;
  lineHeight: number;
  width: number;
  x: number;
  color: ReturnType<typeof hex2PrintingColor>;
  page: PDFRenderProps<TextSchema>['page'];
  pdfLib: PDFRenderProps<TextSchema>['pdfLib'];
  rotate: Rotation;
  pivotPoint: { x: number; y: number };
  opacity: number | undefined;
}): number => {
  const {
    block,
    currentY: initialY,
    globalLineIndex: startLineIndex,
    shouldRenderLine,
    isBeyondRange,
    baseFontSize,
    fontKitFont,
    pdfFontValue,
    characterSpacing,
    lineHeight,
    width,
    x,
    color,
    page,
    pdfLib,
    rotate,
    pivotPoint,
    opacity,
  } = params;

  if (isBeyondRange(startLineIndex)) return initialY;

  const listItems = block.listItems;
  if (!listItems || listItems.length === 0) return initialY;

  let currentY = initialY;
  let lineIndex = startLineIndex;

  const textHeight = heightOfFontAtSize(fontKitFont, baseFontSize);

  for (const item of listItems) {
    if (!shouldRenderLine(lineIndex)) {
      lineIndex++;
      continue;
    }

    const indent = item.level * LIST_INDENT_PER_LEVEL;
    const markerX = x + indent;
    const textX = markerX + LIST_MARKER_WIDTH;

    let marker: string;
    if (item.ordered) {
      marker = `${item.orderNumber ?? 1}.`;
    } else {
      marker = LIST_BULLET_CHAR;
    }

    let finalMarkerX = markerX;
    let finalY = currentY;
    if (rotate.angle !== 0) {
      const rotatedPoint = rotatePoint({ x: markerX, y: currentY }, pivotPoint, rotate.angle);
      finalMarkerX = rotatedPoint.x;
      finalY = rotatedPoint.y;
    }

    page.pushOperators(pdfLib.setCharacterSpacing(characterSpacing));
    page.drawText(marker, {
      x: finalMarkerX,
      y: finalY,
      rotate,
      size: baseFontSize,
      color,
      font: pdfFontValue,
      opacity,
    });

    let finalTextX = textX;
    let finalTextY = currentY;
    if (rotate.angle !== 0) {
      const rotatedPoint = rotatePoint({ x: textX, y: currentY }, pivotPoint, rotate.angle);
      finalTextX = rotatedPoint.x;
      finalTextY = rotatedPoint.y;
    }

    drawSegments({
      segments: item.segments,
      xStart: finalTextX,
      yLine: finalTextY,
      fontSize: baseFontSize,
      textHeight,
      fontKitFont,
      characterSpacing,
      lineHeight,
      color,
      pdfFontValue,
      page,
      rotate,
      pivotPoint,
      opacity,
    });

    currentY -= lineHeight * baseFontSize + LIST_ITEM_SPACING;
    lineIndex++;
  }

  if (shouldRenderLine(lineIndex)) {
    currentY -= baseFontSize * 0.3;
  }

  return currentY;
};
