import { getDefaultFont, mm2pt, pt2mm, type Font } from '@pdfme/common';
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

type MeasureTextHeightArgs = {
  value: string;
  schema: TextSchema;
  font?: Font;
  _cache?: Map<string | number, unknown>;
  ignoreDynamicFontSize?: boolean;
};

export const measureTextHeight = async ({
  value,
  schema,
  font = getDefaultFont(),
  _cache = new Map<string | number, unknown>(),
  ignoreDynamicFontSize = false,
}: MeasureTextHeightArgs): Promise<number> => {
  const fontSize = schema.fontSize ?? DEFAULT_FONT_SIZE;
  const lineHeight = schema.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const boxWidthInPt = mm2pt(schema.width);

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

    return measureRichTextLinesHeight(lines, resolvedFontSize, lineHeight);
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

  return measurePlainTextLinesHeight(lines, fontKitFont, resolvedFontSize, lineHeight);
};

const measurePlainTextLinesHeight = (
  lines: string[],
  fontKitFont: FontKitFont,
  fontSize: number,
  lineHeight: number,
) => {
  if (lines.length === 0) return 0;
  const firstLineHeight = heightOfFontAtSize(fontKitFont, fontSize) * lineHeight;
  const otherLinesHeight = fontSize * lineHeight * Math.max(0, lines.length - 1);
  return pt2mm(firstLineHeight + otherLinesHeight);
};

const measureRichTextLinesHeight = (
  lines: RichTextLine[],
  fontSize: number,
  lineHeight: number,
) => {
  if (lines.length === 0) return 0;
  return lines.reduce((height, line, index) => {
    if (index === 0) return height + pt2mm(getRichTextLineHeight(line, fontSize) * lineHeight);
    return height + pt2mm(fontSize * lineHeight);
  }, 0);
};

const getRichTextLineHeight = (line: RichTextLine, fontSize: number) => {
  if (line.runs.length === 0) return fontSize;
  return Math.max(...line.runs.map((run) => heightOfFontAtSize(run.fontKitFont, fontSize)));
};
