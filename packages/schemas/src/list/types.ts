import type { TextSchema } from '../text/types.js';

export type LIST_STYLE = 'bullet' | 'ordered';

export type ListRange = {
  start: number;
  end?: number;
};

export type ListSchema = TextSchema & {
  listStyle: LIST_STYLE;
  marker?: string;
  startNumber?: number;
  orderedSuffix?: string;
  markerWidth: number;
  markerGap: number;
  indentSize?: number;
  itemSpacing: number;
  __itemRange?: ListRange;
};

export type ListItem = {
  text: string;
  level: number;
};

export type ListItemLayout = {
  item: string;
  itemIndex: number;
  level: number;
  marker: string;
  lines: string[];
  height: number;
  markerX: number;
  bodyX: number;
  bodyWidth: number;
};

export type ListLayout = {
  items: ListItemLayout[];
  totalHeight: number;
  markerWidth: number;
  markerGap: number;
  indentSize: number;
};
