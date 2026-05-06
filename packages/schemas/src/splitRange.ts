import {
  createDynamicLayoutSplitRange,
  getDynamicLayoutSplitRange,
  type DynamicLayoutRange,
  type DynamicLayoutSplitRange,
  type Schema,
} from '@pdfme/common';

export const TABLE_BODY_SPLIT_UNIT = 'tableBody';
export const LIST_ITEM_SPLIT_UNIT = 'listItem';
export const TEXT_LINE_SPLIT_UNIT = 'textLine';

export const createTableBodySplitRange = (start: number, end?: number): DynamicLayoutSplitRange =>
  createDynamicLayoutSplitRange(TABLE_BODY_SPLIT_UNIT, start, end);

export const createListItemSplitRange = (start: number, end?: number): DynamicLayoutSplitRange =>
  createDynamicLayoutSplitRange(LIST_ITEM_SPLIT_UNIT, start, end);

export const createTextLineSplitRange = (start: number, end?: number): DynamicLayoutSplitRange =>
  createDynamicLayoutSplitRange(TEXT_LINE_SPLIT_UNIT, start, end);

export const getTableBodyRange = (schema: Schema): DynamicLayoutRange | undefined =>
  getDynamicLayoutSplitRange(schema, TABLE_BODY_SPLIT_UNIT);

export const getListItemRange = (schema: Schema): DynamicLayoutRange | undefined =>
  getDynamicLayoutSplitRange(schema, LIST_ITEM_SPLIT_UNIT);

export const getTextLineRange = (schema: Schema): DynamicLayoutRange | undefined =>
  getDynamicLayoutSplitRange(schema, TEXT_LINE_SPLIT_UNIT);
