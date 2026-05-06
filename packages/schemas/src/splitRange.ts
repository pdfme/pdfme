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

type SchemaWithLegacyRange = Schema & {
  __bodyRange?: DynamicLayoutRange;
  __itemRange?: DynamicLayoutRange;
  __textLineRange?: DynamicLayoutRange;
};

export const createTableBodySplitRange = (start: number, end?: number): DynamicLayoutSplitRange =>
  createDynamicLayoutSplitRange(TABLE_BODY_SPLIT_UNIT, start, end);

export const createListItemSplitRange = (start: number, end?: number): DynamicLayoutSplitRange =>
  createDynamicLayoutSplitRange(LIST_ITEM_SPLIT_UNIT, start, end);

export const createTextLineSplitRange = (start: number, end?: number): DynamicLayoutSplitRange =>
  createDynamicLayoutSplitRange(TEXT_LINE_SPLIT_UNIT, start, end);

export const getTableBodyRange = (schema: SchemaWithLegacyRange) =>
  getDynamicLayoutSplitRange(schema, TABLE_BODY_SPLIT_UNIT, schema.__bodyRange);

export const getListItemRange = (schema: SchemaWithLegacyRange) =>
  getDynamicLayoutSplitRange(schema, LIST_ITEM_SPLIT_UNIT, schema.__itemRange);

export const getTextLineRange = (schema: SchemaWithLegacyRange) =>
  getDynamicLayoutSplitRange(schema, TEXT_LINE_SPLIT_UNIT, schema.__textLineRange);
