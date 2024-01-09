import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types';
import {
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  ALIGN_RIGHT,
  ALIGN_CENTER,
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
} from '../text/constants';
import {
  DEFAULT_FONT_NAME,
  Schema,
  Plugin,
  PDFRenderProps,
  UIRenderProps,
  getFallbackFontName,
} from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';

const DEFAULT_BORDER_COLOR = '#000000';

interface BoxDimensions {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface CellSchema extends Schema {
  fontName?: string;
  alignment: ALIGNMENT;
  verticalAlignment: VERTICAL_ALIGNMENT;
  fontSize: number;
  lineHeight: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: BoxDimensions;
  padding: BoxDimensions;
}

const getBoxDimensionProp = () => ({
  top: { title: 'Top', type: 'number', widget: 'inputNumber', span: 6 },
  left: { title: 'Left', type: 'number', widget: 'inputNumber', span: 6 },
  bottom: { title: 'Bottom', type: 'number', widget: 'inputNumber', span: 6 },
  right: { title: 'Right', type: 'number', widget: 'inputNumber', span: 6 },
});

const cellSchema: Plugin<CellSchema> = {
  pdf: (arg: PDFRenderProps<CellSchema>) => {},
  ui: (arg: UIRenderProps<CellSchema>) => {
    // TODO ここから
  },
  propPanel: {
    schema: ({ options, activeSchema, i18n }) => {
      const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
      const fontNames = Object.keys(font);
      const fallbackFontName = getFallbackFontName(font);
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
          span: 6,
        },
        characterSpacing: {
          title: i18n('schemas.text.spacing'),
          type: 'number',
          widget: 'inputNumber',
          span: 6,
        },
        alignment: {
          title: i18n('schemas.text.textAlign'),
          type: 'string',
          widget: 'select',
          props: {
            options: [
              { label: i18n('schemas.left'), value: DEFAULT_ALIGNMENT },
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
          props: {
            step: 0.1,
          },
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
      };
    },
    defaultSchema: {
      type: 'cell',
      position: { x: 0, y: 0 },
      width: 50,
      height: 10,
      fontName: undefined,
      alignment: DEFAULT_ALIGNMENT,
      verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
      fontSize: DEFAULT_FONT_SIZE,
      lineHeight: DEFAULT_LINE_HEIGHT,
      characterSpacing: DEFAULT_CHARACTER_SPACING,
      fontColor: DEFAULT_FONT_COLOR,
      backgroundColor: '',
      borderColor: DEFAULT_BORDER_COLOR,
      borderWidth: { top: 0, bottom: 0, left: 0, right: 0 },
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    },
  },
};
export default cellSchema;
