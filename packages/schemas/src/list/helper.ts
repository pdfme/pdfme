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

const formatListItem = (item: ListItem): string =>
  `${'\t'.repeat(Math.max(0, item.level))}${item.text}`;

export const serializeListItems = (items: ListItem[]): string => {
  const lines = items.map(formatListItem);
  return JSON.stringify(lines);
};

export const getListMarkers = (schema: ListSchema, items: string[]): string[] => {
  if ((schema.listStyle ?? DEFAULT_LIST_STYLE) !== LIST_STYLE_ORDERED) {
    return items.map(() => DEFAULT_MARKER);
  }

  const counters = Array.from({ length: MAX_INDENT_LEVEL + 1 }, () => 0);
  return items.map((rawItem) => {
    const { level } = parseListItem(rawItem);
    counters[level] += 1;
    counters.fill(0, level + 1);
    return `${counters[level]}.`;
  });
};

export const calculateListLayout = async (arg: {
  schema: ListSchema;
  items: string[];
  markerItems?: string[];
  startIndex: number;
  options: CommonOptions;
  _cache: Map<string | number, unknown>;
}): Promise<ListLayout> => {
  const { schema, items, markerItems, startIndex, options, _cache } = arg;
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
  const markers = markerItems
    ? getListMarkers(schema, markerItems).slice(startIndex, startIndex + items.length)
    : getListMarkers(schema, items);

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
      marker: markers[index],
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
