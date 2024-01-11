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
import { DEFAULT_BORDER_COLOR } from './constants';

export const getDefaultCellStyles = () => ({
  fontName: undefined,
  alignment: DEFAULT_ALIGNMENT,
  verticalAlignment: VERTICAL_ALIGN_MIDDLE,
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  characterSpacing: DEFAULT_CHARACTER_SPACING,
  fontColor: DEFAULT_FONT_COLOR,
  backgroundColor: '',
  borderColor: DEFAULT_BORDER_COLOR,
  borderWidth: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
  padding: { top: 3, bottom: 3, left: 3, right: 3 },
});

const getBoxDimensionProp = () => ({
  top: { title: 'Top', type: 'number', widget: 'inputNumber', props: { min: 0 }, span: 6 },
  right: { title: 'Right', type: 'number', widget: 'inputNumber', props: { min: 0 }, span: 6 },
  bottom: { title: 'Bottom', type: 'number', widget: 'inputNumber', props: { min: 0 }, span: 6 },
  left: { title: 'Left', type: 'number', widget: 'inputNumber', props: { min: 0 }, span: 6 },
});

export const getCellPropPanelSchema = ({
  i18n,
  fallbackFontName,
  fontNames,
}: {
  i18n: (key: string) => string;
  fallbackFontName: string;
  fontNames: string[];
}) => ({
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
  backgroundColor: {
    // TODO i18n
    title: 'backgroundColor',
    type: 'string',
    widget: 'color',
    rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
  },
  borderColor: {
    // TODO i18n
    title: 'borderColor',
    type: 'string',
    widget: 'color',
    rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
  },
  borderWidth: {
    // TODO i18n
    title: 'borderWidth',
    type: 'object',
    widget: 'SubInline',
    span: 24,
    properties: getBoxDimensionProp(),
  },
  padding: {
    // TODO i18n
    title: 'padding',
    type: 'object',
    widget: 'SubInline',
    span: 24,
    properties: getBoxDimensionProp(),
  },
});
