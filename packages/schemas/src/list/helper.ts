import { CommonOptions, getDefaultFont, mm2pt, pt2mm } from '@pdfme/common';
import {
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
} from '../text/constants.js';
import { getFontKitFont, splitTextToSize } from '../text/helper.js';
import type { ListItemLayout, ListLayout, ListSchema } from './types.js';
import {
  DEFAULT_ITEM_SPACING,
  DEFAULT_LIST_STYLE,
  DEFAULT_MARKER,
  DEFAULT_MARKER_GAP,
  DEFAULT_MARKER_WIDTH,
  DEFAULT_ORDERED_SUFFIX,
  DEFAULT_START_NUMBER,
  LIST_STYLE_ORDERED,
} from './constants.js';

export const normalizeListItems = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item));

  if (typeof value !== 'string') {
    return value == null ? [] : [String(value)];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    // Fall through to newline parsing.
  }

  return value.split(/\r\n|\r|\n/g);
};

export const getListMarker = (schema: ListSchema, absoluteIndex: number): string => {
  if ((schema.listStyle ?? DEFAULT_LIST_STYLE) === LIST_STYLE_ORDERED) {
    const startNumber = schema.startNumber ?? DEFAULT_START_NUMBER;
    const suffix = schema.orderedSuffix ?? DEFAULT_ORDERED_SUFFIX;
    return `${startNumber + absoluteIndex}${suffix}`;
  }

  return schema.marker || DEFAULT_MARKER;
};

export const calculateListLayout = async (arg: {
  schema: ListSchema;
  items: string[];
  startIndex: number;
  options: CommonOptions;
  _cache: Map<string | number, unknown>;
}): Promise<ListLayout> => {
  const { schema, items, startIndex, options, _cache } = arg;
  const markerWidth = schema.markerWidth ?? DEFAULT_MARKER_WIDTH;
  const markerGap = schema.markerGap ?? DEFAULT_MARKER_GAP;
  const bodyWidth = Math.max(schema.width - markerWidth - markerGap, 0);
  const font = options.font || getDefaultFont();
  const fontKitFont = await getFontKitFont(
    schema.fontName,
    font,
    _cache as Map<string | number, import('fontkit').Font>,
  );

  const fontSize = schema.fontSize ?? DEFAULT_FONT_SIZE;
  const lineHeight = schema.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const characterSpacing = schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING;
  const itemSpacing = schema.itemSpacing ?? DEFAULT_ITEM_SPACING;
  const lineHeightMm = pt2mm(fontSize * lineHeight);

  const layoutItems: ListItemLayout[] = items.map((item, index) => {
    const lines = splitTextToSize({
      value: item,
      characterSpacing,
      boxWidthInPt: mm2pt(Math.max(bodyWidth, 0.1)),
      fontSize,
      fontKitFont,
    });
    const height =
      Math.max(lines.length, 1) * lineHeightMm + (index === items.length - 1 ? 0 : itemSpacing);

    return {
      item,
      itemIndex: startIndex + index,
      marker: getListMarker(schema, startIndex + index),
      lines,
      height,
    };
  });

  return {
    items: layoutItems,
    totalHeight: layoutItems.reduce((sum, item) => sum + item.height, 0),
    markerWidth,
    markerGap,
    bodyWidth,
  };
};
