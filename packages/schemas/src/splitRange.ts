import {
  createDynamicLayoutSplitRange,
  getDynamicLayoutSplitRange,
  type DynamicLayoutRange,
  type DynamicLayoutSplitRange,
  type Schema,
} from '@pdfme/common';

// Keep the common schema open for external plugin units while exposing the built-in units as
// typed constants for pdfme's bundled dynamic layout schemas.
export const BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS = {
  tableBody: 'tableBody',
  listItem: 'listItem',
  textLine: 'textLine',
} as const;

export type BuiltInDynamicLayoutSplitUnit =
  (typeof BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS)[keyof typeof BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS];

export const TABLE_BODY_SPLIT_UNIT = BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS.tableBody;
export const LIST_ITEM_SPLIT_UNIT = BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS.listItem;
export const TEXT_LINE_SPLIT_UNIT = BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS.textLine;

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
