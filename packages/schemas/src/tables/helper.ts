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
} from '../text/constants';
import { HEX_COLOR_PATTERN } from '../constants.js';

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
  borderWidth: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 },
  padding: { top: 5, bottom: 5, left: 5, right: 5 },
});

const getBoxDimensionProp = (step = 1) => {
  const getCommonProp = () => ({
    type: 'number',
    widget: 'inputNumber',
    props: { min: 0, step },
    span: 6,
  });
  return {
    top: { title: 'Top', ...getCommonProp() },
    right: { title: 'Right', ...getCommonProp() },
    bottom: { title: 'Bottom', ...getCommonProp() },
    left: { title: 'Left', ...getCommonProp() },
  };
};

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
      rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
    },
    borderColor: {
      title: i18n('schemas.borderColor'),
      type: 'string',
      widget: 'color',
      rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
    },
    backgroundColor: {
      title: i18n('schemas.backgroundColor'),
      type: 'string',
      widget: 'color',
      rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
    },
    ...(isBody
      ? {
          alternateBackgroundColor: {
            title: i18n('schemas.table.alternateBackgroundColor'),
            type: 'string',
            widget: 'color',
            rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
          },
        }
      : {}),
    '-': { type: 'void', widget: 'Divider' },
    borderWidth: {
      title: i18n('schemas.borderWidth'),
      type: 'object',
      widget: 'lineTitle',
      span: 24,
      properties: getBoxDimensionProp(0.1),
    },
    '--': { type: 'void', widget: 'Divider' },
    padding: {
      title: i18n('schemas.padding'),
      type: 'object',
      widget: 'lineTitle',
      span: 24,
      properties: getBoxDimensionProp(),
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
      {}
    ),
  },
});

export const getBody = (value: string) => JSON.parse(value || '[]') as string[][];

export const getBodyWithRange = (
  value: string,
  range?: { start: number; end?: number | undefined }
) => {
  const body = getBody(value);
  if (!range) return body;
  return body.slice(range.start, range.end);
};
