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
  itemSpacing: number;
  __itemRange?: ListRange;
};

export type ListItemLayout = {
  item: string;
  itemIndex: number;
  marker: string;
  lines: string[];
  height: number;
};

export type ListLayout = {
  items: ListItemLayout[];
  totalHeight: number;
  markerWidth: number;
  markerGap: number;
  bodyWidth: number;
};
