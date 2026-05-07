import { getDefaultFont, mm2pt, pt2mm, type DynamicLayoutRange, type Font } from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';
import { DEFAULT_CHARACTER_SPACING, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT } from './constants.js';
import {
  calculateDynamicFontSize,
  getFontKitFont,
  heightOfFontAtSize,
  splitTextToSize,
} from './helper.js';
import { parseInlineMarkdown } from './inlineMarkdown.js';
import {
  calculateDynamicRichTextFontSize,
  isInlineMarkdownTextSchema,
  layoutRichTextLines,
  resolveRichTextRuns,
  type RichTextLine,
} from './richText.js';
import type { TextSchema } from './types.js';
import { getTextLineRange } from '../splitRange.js';
import {
  getBoxContentArea,
  getBoxInsets,
  getBoxVerticalInset,
  getSplitBoxDimension,
  hasBoxDimension,
} from '../box.js';

type MeasureTextHeightArgs = {
  value: string;
  schema: TextSchema;
  font?: Font;
  _cache?: Map<string | number, unknown>;
  ignoreDynamicFontSize?: boolean;
};

type MeasureTextLinesResult = {
  lines: string[];
  lineHeights: number[];
};

export const applyTextLineRange = <T>(lines: T[], range?: DynamicLayoutRange) => {
  if (!range) return lines;
  return lines.slice(range.start, range.end ?? lines.length);
};

export const plainTextLinesToValue = (lines: string[]) =>
  lines.map((line) => line.replace(/[\r\n]+$/g, '')).join('\n');

const splitReplacementTextToLines = (value: string) => {
  const lines: string[] = [];
  let start = 0;

  for (let i = 0; i < value.length; i += 1) {
    const charCode = value.charCodeAt(i);
    if (charCode !== 10 && charCode !== 13) continue;

    lines.push(value.slice(start, i));
    if (charCode === 13 && value.charCodeAt(i + 1) === 10) i += 1;
    start = i + 1;
  }

  lines.push(value.slice(start));
  return lines;
};

export const measureTextLines = async ({
  value,
  schema,
  font = getDefaultFont(),
  _cache = new Map<string | number, unknown>(),
  ignoreDynamicFontSize = false,
}: MeasureTextHeightArgs): Promise<MeasureTextLinesResult> => {
  const fontSize = schema.fontSize ?? DEFAULT_FONT_SIZE;
  const lineHeight = schema.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const boxWidthInPt = mm2pt(getBoxContentArea(schema).width);

  if (isInlineMarkdownTextSchema(schema)) {
    const richTextRuns = parseInlineMarkdown(value);
    const resolvedRuns = await resolveRichTextRuns({ runs: richTextRuns, schema, font, _cache });
    const resolvedFontSize =
      schema.dynamicFontSize && schema.height > 0 && !ignoreDynamicFontSize
        ? await calculateDynamicRichTextFontSize({ value, schema, font, _cache })
        : fontSize;
    const lines = layoutRichTextLines({
      runs: resolvedRuns,
      fontSize: resolvedFontSize,
      characterSpacing,
      boxWidthInPt,
    });

    return {
      lines: lines.map((line) => line.runs.map((run) => run.text).join('')),
      lineHeights: measureRichTextLineHeights(lines, resolvedFontSize, lineHeight),
    };
  }

  const fontKitFont = await getFontKitFont(
    schema.fontName,
    font,
    _cache as Map<string, FontKitFont>,
  );
  const resolvedFontSize =
    schema.dynamicFontSize && schema.height > 0 && !ignoreDynamicFontSize
      ? calculateDynamicFontSize({ textSchema: schema, fontKitFont, value })
      : fontSize;
  const lines = splitTextToSize({
    value,
    characterSpacing,
    fontSize: resolvedFontSize,
    fontKitFont,
    boxWidthInPt,
  });

  return {
    lines,
    lineHeights: measurePlainTextLineHeights(lines, fontKitFont, resolvedFontSize, lineHeight),
  };
};

export const mergeTextLineRangeValue = async ({
  value,
  replacement,
  schema,
  font = getDefaultFont(),
  _cache = new Map<string | number, unknown>(),
}: {
  value: string;
  replacement: string;
  schema: TextSchema;
  font?: Font;
  _cache?: Map<string | number, unknown>;
}) => {
  const range = getTextLineRange(schema);
  if (!range) return replacement;

  const { lines } = await measureTextLines({
    value,
    schema,
    font,
    _cache,
    ignoreDynamicFontSize: true,
  });
  const { start, end = lines.length } = range;
  const nextLines = [...lines];
  nextLines.splice(start, end - start, ...splitReplacementTextToLines(replacement));
  return plainTextLinesToValue(nextLines);
};

export const measureTextHeight = async (args: MeasureTextHeightArgs): Promise<number> => {
  const { lineHeights } = await measureTextLines(args);
  return sumLineHeights(lineHeights) + getBoxVerticalInset(args.schema);
};

export const sumLineHeights = (lineHeights: number[]) =>
  lineHeights.reduce((sum, height) => sum + height, 0);

export const getTextLineHeightsWithBox = (lineHeights: number[], schema: TextSchema) =>
  lineHeights.map(
    (height, index) =>
      height +
      getTextBoxVerticalInsetForRange(schema, { start: index, end: index + 1 }, lineHeights.length),
  );

export const getTextSplitBoxStyle = (
  schema: TextSchema,
  range: DynamicLayoutRange,
  totalLines: number,
) => {
  const { borderWidth, padding } = getBoxInsets(schema);
  return {
    ...(hasBoxDimension(schema.borderWidth)
      ? { borderWidth: getSplitBoxDimension(borderWidth, range, totalLines) }
      : {}),
    ...(hasBoxDimension(schema.padding)
      ? { padding: getSplitBoxDimension(padding, range, totalLines) }
      : {}),
  };
};

export const getTextBoxVerticalInsetForRange = (
  schema: TextSchema,
  range: DynamicLayoutRange,
  totalLines: number,
) => {
  const { borderWidth, padding } = getBoxInsets(schema);
  const splitBorderWidth = getSplitBoxDimension(borderWidth, range, totalLines);
  const splitPadding = getSplitBoxDimension(padding, range, totalLines);
  return splitBorderWidth.top + splitBorderWidth.bottom + splitPadding.top + splitPadding.bottom;
};

const measurePlainTextLineHeights = (
  lines: string[],
  fontKitFont: FontKitFont,
  fontSize: number,
  lineHeight: number,
) => {
  if (lines.length === 0) return [];
  const firstLineHeight = heightOfFontAtSize(fontKitFont, fontSize) * lineHeight;
  const otherLineHeight = fontSize * lineHeight;
  return lines.map((_, index) => pt2mm(index === 0 ? firstLineHeight : otherLineHeight));
};

const measureRichTextLineHeights = (
  lines: RichTextLine[],
  fontSize: number,
  lineHeight: number,
) => {
  if (lines.length === 0) return [];
  return lines.map((line, index) =>
    pt2mm((index === 0 ? getRichTextLineHeight(line, fontSize) : fontSize) * lineHeight),
  );
};

const getRichTextLineHeight = (line: RichTextLine, fontSize: number) => {
  if (line.runs.length === 0) return fontSize;
  return Math.max(...line.runs.map((run) => heightOfFontAtSize(run.fontKitFont, fontSize)));
};
