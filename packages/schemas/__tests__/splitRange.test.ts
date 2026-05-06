import { describe, expect, test } from 'vitest';
import {
  BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS,
  LIST_ITEM_SPLIT_UNIT,
  TABLE_BODY_SPLIT_UNIT,
  TEXT_LINE_SPLIT_UNIT,
  createListItemSplitRange,
  createTableBodySplitRange,
  createTextLineSplitRange,
  getListItemRange,
  getTableBodyRange,
  getTextLineRange,
} from '../src/splitRange.js';

const getSchema = (__splitRange: ReturnType<typeof createTextLineSplitRange>) => ({
  name: 'field',
  type: 'text',
  content: '',
  position: { x: 0, y: 0 },
  width: 10,
  height: 10,
  __splitRange,
});

describe('schema split range helpers', () => {
  test('exposes typed built-in split units', () => {
    expect(BUILT_IN_DYNAMIC_LAYOUT_SPLIT_UNITS).toEqual({
      tableBody: TABLE_BODY_SPLIT_UNIT,
      listItem: LIST_ITEM_SPLIT_UNIT,
      textLine: TEXT_LINE_SPLIT_UNIT,
    });
  });

  test('creates split ranges with schema-specific units', () => {
    expect(createTableBodySplitRange(1, 3)).toEqual({
      unit: TABLE_BODY_SPLIT_UNIT,
      start: 1,
      end: 3,
    });
    expect(createListItemSplitRange(2, 4)).toEqual({
      unit: LIST_ITEM_SPLIT_UNIT,
      start: 2,
      end: 4,
    });
    expect(createTextLineSplitRange(5)).toEqual({
      unit: TEXT_LINE_SPLIT_UNIT,
      start: 5,
    });
  });

  test('reads only matching split range units', () => {
    const tableSchema = getSchema(createTableBodySplitRange(1, 3));
    const listSchema = getSchema(createListItemSplitRange(2, 4));
    const textSchema = getSchema(createTextLineSplitRange(5, 8));

    expect(getTableBodyRange(tableSchema)).toEqual({ start: 1, end: 3 });
    expect(getListItemRange(listSchema)).toEqual({ start: 2, end: 4 });
    expect(getTextLineRange(textSchema)).toEqual({ start: 5, end: 8 });
    expect(getTableBodyRange(textSchema)).toBeUndefined();
    expect(getTextLineRange(listSchema)).toBeUndefined();
  });
});
