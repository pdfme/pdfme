import type { Font as FontKitFont } from 'fontkit';
import type { Schema, BasePdf, CommonOptions } from '@pdfme/common';
import { mm2pt, pt2mm } from '@pdfme/common';
import type { TextSchema } from './types.js';
import { splitTextToSize, getFontKitFont, heightOfFontAtSize } from './helper.js';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
} from './constants.js';
import { parseRichText, HEADING_SIZE_MULTIPLIERS } from './richText/index.js';
import {
  CODE_FONT_SIZE_RATIO,
  BLOCKQUOTE_PADDING_LEFT,
  LIST_ITEM_SPACING,
  TABLE_CELL_PADDING,
} from './richText/constants.js';

/**
 * Calculate dynamic heights for text schema (per-line heights for page breaking).
 * Only calculates line-by-line heights when schema.richText is true.
 * @returns Array of line heights in mm
 */
export const getDynamicHeightsForText = async (
  value: string,
  args: {
    schema: Schema;
    basePdf: BasePdf;
    options: CommonOptions;
    _cache: Map<string | number, unknown>;
  },
): Promise<number[]> => {
  const schema = args.schema as TextSchema;

  if (!value || value.trim() === '') {
    return [schema.height];
  }

  if (!schema.richText) {
    return [schema.height];
  }

  const font = args.options.font;
  if (!font) {
    return [schema.height];
  }

  const fontKitFont = await getFontKitFont(
    schema.fontName,
    font,
    args._cache as Map<string | number, FontKitFont>,
  );

  const fontSize = schema.fontSize ?? DEFAULT_FONT_SIZE;
  const lineHeight = schema.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const boxWidthInPt = mm2pt(schema.width);

  const lineHeights = calculateRichTextLineHeights({
    value,
    fontKitFont,
    fontSize,
    lineHeight,
    characterSpacing,
    boxWidthInPt,
  });

  return lineHeights;
};

function calculateRichTextLineHeights(params: {
  value: string;
  fontKitFont: FontKitFont;
  fontSize: number;
  lineHeight: number;
  characterSpacing: number;
  boxWidthInPt: number;
}): number[] {
  const { value, fontKitFont, fontSize, lineHeight, characterSpacing, boxWidthInPt } = params;
  const blocks = parseRichText(value);
  const lineHeights: number[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const level = block.level ?? 1;
        const sizeMultiplier = HEADING_SIZE_MULTIPLIERS[level];
        const headingFontSize = fontSize * sizeMultiplier;
        const headingTextHeight = heightOfFontAtSize(fontKitFont, headingFontSize);
        const headingLineHeightInMm = pt2mm(headingTextHeight * lineHeight);

        const segments = block.lines[0]?.segments ?? [];
        const plainText = segments.map((s) => s.content).join('');

        const lines = splitTextToSize({
          value: plainText,
          characterSpacing,
          fontSize: headingFontSize,
          fontKitFont,
          boxWidthInPt,
        });

        for (let i = 0; i < lines.length; i++) {
          if (i === 0) {
            lineHeights.push(headingLineHeightInMm);
          } else {
            lineHeights.push(pt2mm(headingFontSize * lineHeight));
          }
        }

        lineHeights.push(pt2mm(fontSize * 0.3)); // spacing after heading
        break;
      }

      case 'code': {
        const codeFontSize = fontSize * CODE_FONT_SIZE_RATIO;
        const content = block.lines[0]?.segments[0]?.content ?? '';
        const codeLines = content.split('\n').filter((l) => l !== '');

        for (let i = 0; i < codeLines.length; i++) {
          // First line includes top padding
          const topPadding = i === 0 ? pt2mm(5) : 0;
          lineHeights.push(pt2mm(codeFontSize * lineHeight) + topPadding);
        }

        lineHeights.push(pt2mm(fontSize * 1.0) + pt2mm(5)); // spacing + bottom padding
        break;
      }

      case 'blockquote': {
        const segments = block.lines[0]?.segments ?? [];
        const plainText = segments.map((s) => s.content).join('');

        const lines = splitTextToSize({
          value: plainText,
          characterSpacing,
          fontSize,
          fontKitFont,
          boxWidthInPt: boxWidthInPt - mm2pt(pt2mm(BLOCKQUOTE_PADDING_LEFT)),
        });

        const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);

        for (let i = 0; i < lines.length; i++) {
          if (i === 0) {
            lineHeights.push(pt2mm(firstLineTextHeight * lineHeight));
          } else {
            lineHeights.push(pt2mm(fontSize * lineHeight));
          }
        }

        lineHeights.push(pt2mm(fontSize * 0.3)); // spacing after blockquote
        break;
      }

      case 'table': {
        const tableData = block.tableData;
        if (!tableData) break;

        const { headers, rows } = tableData;
        const rowHeight = fontSize * lineHeight + TABLE_CELL_PADDING * 2;
        const rowHeightInMm = pt2mm(rowHeight);

        if (headers.length > 0) {
          lineHeights.push(rowHeightInMm); // header row
        }

        for (let i = 0; i < rows.length; i++) {
          lineHeights.push(rowHeightInMm);
        }

        lineHeights.push(pt2mm(fontSize * 0.5)); // spacing after table
        break;
      }

      case 'list': {
        const listItems = block.listItems;
        if (!listItems || listItems.length === 0) break;

        const textHeight = heightOfFontAtSize(fontKitFont, fontSize);
        const itemHeightInMm = pt2mm(textHeight * lineHeight + LIST_ITEM_SPACING);

        for (let i = 0; i < listItems.length; i++) {
          lineHeights.push(itemHeightInMm);
        }

        lineHeights.push(pt2mm(fontSize * 0.3)); // spacing after list
        break;
      }

      case 'paragraph':
      default: {
        const segments = block.lines[0]?.segments ?? [];
        const plainText = segments.map((s) => s.content).join('');

        const lines = splitTextToSize({
          value: plainText,
          characterSpacing,
          fontSize,
          fontKitFont,
          boxWidthInPt,
        });

        const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);

        for (let i = 0; i < lines.length; i++) {
          if (i === 0) {
            lineHeights.push(pt2mm(firstLineTextHeight * lineHeight));
          } else {
            lineHeights.push(pt2mm(fontSize * lineHeight));
          }
        }

        lineHeights.push(pt2mm(fontSize * 0.3)); // spacing after paragraph
        break;
      }
    }
  }

  return lineHeights;
}
