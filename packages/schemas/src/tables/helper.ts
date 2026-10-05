import {
  DEFAULT_ALIGNMENT,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  ALIGN_RIGHT,
  ALIGN_CENTER,
  ALIGN_LEFT,
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
} from '../text/constants.js';
import { HEX_COLOR_PATTERN } from '../constants.js';
import type { TableSchema } from './types.js';
import { getTableBodyRange } from '../splitRange.js';
import type { DynamicLayoutRange } from '@pdfme/common';
import { createBoxDimension, getBoxDimensionPropPanelSchema } from '../box.js';

export const getDefaultCellStyles = () => ({
  fontName: undefined,
  alignment: DEFAULT_ALIGNMENT,
  verticalAlignment: VERTICAL_ALIGN_MIDDLE,
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  characterSpacing: DEFAULT_CHARACTER_SPACING,
  fontColor: DEFAULT_FONT_COLOR,
  backgroundColor: '',
  borderColor: '#888888',
  borderWidth: createBoxDimension(0.1),
  padding: createBoxDimension(5),
});

export const getCellPropPanelSchema = (arg: {
  i18n: (key: string) => string;
  fallbackFontName: string;
  fontNames: string[];
  isBody?: boolean;
}) => {
  const { i18n, fallbackFontName, fontNames, isBody } = arg;

  return {
    fontName: {
      title: i18n('schemas.text.fontName'),
      type: 'string',
      widget: 'select',
      default: fallbackFontName,
      placeholder: fallbackFontName,
      props: { options: fontNames.map((name) => ({ label: name, value: name })) },
      span: 12,
    },
    fontSize: {
      title: i18n('schemas.text.size'),
      type: 'number',
      widget: 'inputNumber',
      props: { min: 0 },
      span: 6,
    },
    characterSpacing: {
      title: i18n('schemas.text.spacing'),
      type: 'number',
      widget: 'inputNumber',
      props: { min: 0 },
      span: 6,
    },
    alignment: {
      title: i18n('schemas.text.textAlign'),
      type: 'string',
      widget: 'select',
      props: {
        options: [
          { label: i18n('schemas.left'), value: ALIGN_LEFT },
          { label: i18n('schemas.center'), value: ALIGN_CENTER },
          { label: i18n('schemas.right'), value: ALIGN_RIGHT },
        ],
      },
      span: 8,
    },
    verticalAlignment: {
      title: i18n('schemas.text.verticalAlign'),
      type: 'string',
      widget: 'select',
      props: {
        options: [
          { label: i18n('schemas.top'), value: VERTICAL_ALIGN_TOP },
          { label: i18n('schemas.middle'), value: VERTICAL_ALIGN_MIDDLE },
          { label: i18n('schemas.bottom'), value: VERTICAL_ALIGN_BOTTOM },
        ],
      },
      span: 8,
    },
    lineHeight: {
      title: i18n('schemas.text.lineHeight'),
      type: 'number',
      widget: 'inputNumber',
      props: { step: 0.1, min: 0 },
      span: 8,
    },
    fontColor: {
      title: i18n('schemas.textColor'),
      type: 'string',
      widget: 'color',
      rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
    },
    borderColor: {
      title: i18n('schemas.borderColor'),
      type: 'string',
      widget: 'color',
      rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
    },
    backgroundColor: {
      title: i18n('schemas.backgroundColor'),
      type: 'string',
      widget: 'color',
      rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
    },
    ...(isBody
      ? {
          alternateBackgroundColor: {
            title: i18n('schemas.table.alternateBackgroundColor'),
            type: 'string',
            widget: 'color',
            rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
          },
        }
      : {}),
    '-': { type: 'void', widget: 'Divider' },
    borderWidth: {
      title: i18n('schemas.borderWidth'),
      type: 'object',
      widget: 'lineTitle',
      span: 24,
      properties: getBoxDimensionPropPanelSchema(0.1),
    },
    '--': { type: 'void', widget: 'Divider' },
    padding: {
      title: i18n('schemas.padding'),
      type: 'object',
      widget: 'lineTitle',
      span: 24,
      properties: getBoxDimensionPropPanelSchema(),
    },
  };
};

export const getColumnStylesPropPanelSchema = ({
  head,
  i18n,
}: {
  head: string[];
  i18n: (key: string) => string;
}) => ({
  alignment: {
    type: 'object',
    widget: 'lineTitle',
    title: i18n('schemas.text.textAlign'),
    column: 3,
    properties: head.reduce(
      (acc, cur, i) =>
        Object.assign(acc, {
          [i]: {
            title: cur || 'Column ' + String(i + 1),
            type: 'string',
            widget: 'select',
            props: {
              options: [
                { label: i18n('schemas.left'), value: ALIGN_LEFT },
                { label: i18n('schemas.center'), value: ALIGN_CENTER },
                { label: i18n('schemas.right'), value: ALIGN_RIGHT },
              ],
            },
          },
        }),
      {},
    ),
  },
});

export const getBody = (value: string | string[][]): string[][] => {
  if (typeof value === 'string') {
    return JSON.parse(value || '[]') as string[][];
  }
  return value || [];
};

export const getBodyWithRange = (value: string | string[][], range?: DynamicLayoutRange) => {
  const body = getBody(value);
  if (!range) return body;
  return body.slice(range.start, range.end);
};

export const getBodyWithSchemaRange = (
  value: string | string[][],
  schema: TableSchema,
  range = getTableBodyRange(schema),
) => getBodyWithRange(value, range);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

// Column indexes are canonical decimal keys ("0", "1", "10"), not "01" or "1.5".
const columnIndexFromKey = (key: string): number | undefined => {
  if (!/^(0|[1-9]\d*)$/.test(key)) return undefined;
  const index = Number(key);
  return Number.isSafeInteger(index) ? index : undefined;
};

// Treat a value as a per-column map only when every key is a column index.
// A map that mixes in any non-numeric key is left unchanged.
const isColumnIndexMap = (value: unknown): value is Record<string, unknown> => {
  if (!isPlainObject(value)) return false;
  return Object.keys(value).every((key) => columnIndexFromKey(key) !== undefined);
};

const remapColumnIndexMap = (
  columnMap: Record<string, unknown>,
  removedIndex: number,
): Record<string, unknown> => {
  const remapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(columnMap)) {
    const columnIndex = columnIndexFromKey(key);
    if (columnIndex === undefined || columnIndex === removedIndex) continue;
    const nextIndex = columnIndex > removedIndex ? columnIndex - 1 : columnIndex;
    remapped[nextIndex] = value;
  }
  return remapped;
};

// Per-column style maps are keyed by column index. Every map on columnStyles
// — including keys this version does not define, such as fontName or image
// cell settings — must drop the removed column and close the gap. Values that
// are not column-index maps are preserved unchanged.
export const remapColumnStylesOnRemove = (
  columnStyles: TableSchema['columnStyles'] | null | undefined,
  removedIndex: number,
): TableSchema['columnStyles'] => {
  if (columnStyles == null) return {};
  const source = columnStyles as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [styleKey, styleValue] of Object.entries(source)) {
    next[styleKey] = isColumnIndexMap(styleValue)
      ? remapColumnIndexMap(styleValue, removedIndex)
      : styleValue;
  }
  return next as TableSchema['columnStyles'];
};
