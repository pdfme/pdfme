import { CommonOptions, getDefaultFont, mm2pt, pt2mm } from '@pdfme/common';
import {
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
} from '../text/constants.js';
import { getFontKitFont, splitTextToSize } from '../text/helper.js';
import type { ListItem, ListItemLayout, ListLayout, ListSchema } from './types.js';
import {
  DEFAULT_INDENT_SIZE,
  DEFAULT_ITEM_SPACING,
  DEFAULT_LIST_STYLE,
  DEFAULT_MARKER,
  DEFAULT_MARKER_GAP,
  DEFAULT_MARKER_WIDTH,
  DEFAULT_ORDERED_SUFFIX,
  DEFAULT_START_NUMBER,
  LIST_STYLE_ORDERED,
  MAX_INDENT_LEVEL,
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

export const parseListItem = (value: string): ListItem => {
  const indent = value.match(/^\t+/)?.[0].length ?? 0;
  return {
    level: Math.min(indent, MAX_INDENT_LEVEL),
    text: value.slice(indent),
  };
};

export const normalizeListItemEntries = (value: unknown): ListItem[] =>
  normalizeListItems(value).map(parseListItem);

export const serializeListItems = (items: ListItem[]): string =>
  items.map((item) => `${'\t'.repeat(Math.max(0, item.level))}${item.text}`).join('\n');

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
  const indentSize = schema.indentSize ?? DEFAULT_INDENT_SIZE;
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

  const layoutItems: ListItemLayout[] = items.map((rawItem, index) => {
    const item = parseListItem(rawItem);
    const markerX = item.level * indentSize;
    const bodyX = markerX + markerWidth + markerGap;
    const bodyWidth = Math.max(schema.width - bodyX, 0);
    const lines = splitTextToSize({
      value: item.text,
      characterSpacing,
      boxWidthInPt: mm2pt(Math.max(bodyWidth, 0.1)),
      fontSize,
      fontKitFont,
    });
    const height =
      Math.max(lines.length, 1) * lineHeightMm + (index === items.length - 1 ? 0 : itemSpacing);

    return {
      item: item.text,
      itemIndex: startIndex + index,
      level: item.level,
      marker: getListMarker(schema, startIndex + index),
      lines,
      height,
      markerX,
      bodyX,
      bodyWidth,
    };
  });

  return {
    items: layoutItems,
    totalHeight: layoutItems.reduce((sum, item) => sum + item.height, 0),
    markerWidth,
    markerGap,
    indentSize,
  };
};
