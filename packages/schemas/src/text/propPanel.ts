import {
  DEFAULT_FONT_NAME,
  PropPanel,
  PropPanelWidgetProps,
  PropPanelSchema,
  getFallbackFontName,
} from '@pdfme/common';
import type { TextSchema } from './types';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_LINE_HEIGHT,
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
  DEFAULT_FONT_COLOR,
  DYNAMIC_FIT_VERTICAL,
  DYNAMIC_FIT_HORIZONTAL,
  DEFAULT_DYNAMIC_FIT,
  DEFAULT_DYNAMIC_MIN_FONT_SIZE,
  DEFAULT_DYNAMIC_MAX_FONT_SIZE,
  ALIGN_RIGHT,
  ALIGN_CENTER,
} from './constants.js';
import { DEFAULT_OPACITY, HEX_COLOR_PATTERN } from '../constants.js';

const UseDynamicFontSize = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema, i18n } = props;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean((activeSchema as any)?.dynamicFontSize);
  checkbox.onchange = (e: any) => {
    const val = e.target.checked
      ? {
          min: DEFAULT_DYNAMIC_MIN_FONT_SIZE,
          max: DEFAULT_DYNAMIC_MAX_FONT_SIZE,
          fit: DEFAULT_DYNAMIC_FIT,
        }
      : undefined;
    changeSchemas([{ key: 'dynamicFontSize', value: val, schemaId: activeSchema.id }]);
  };
  const label = document.createElement('label');
  label.innerText = i18n('schemas.text.dynamicFontSize') || '';
  label.style.cssText = 'display: flex; width: 100%;';
  label.appendChild(checkbox);
  rootElement.appendChild(label);
};

export const propPanel: PropPanel<TextSchema> = {
  schema: ({ options, activeSchema, i18n }) => {
    const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
    const fontNames = Object.keys(font);
    const fallbackFontName = getFallbackFontName(font);

    const enableDynamicFont = Boolean((activeSchema as any)?.dynamicFontSize);

    const textSchema: Record<string, PropPanelSchema> = {
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
        disabled: enableDynamicFont,
        props: { min: 0 },
      },
      characterSpacing: {
        title: i18n('schemas.text.spacing'),
        type: 'number',
        widget: 'inputNumber',
        span: 6,
        props: { min: 0 },
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
        props: { step: 0.1, min: 0 },
        span: 8,
      },
      useDynamicFontSize: { type: 'boolean', widget: 'UseDynamicFontSize', bind: false, span: 16 },
      dynamicFontSize: {
        type: 'object',
        widget: 'card',
        column: 3,
        properties: {
          min: {
            title: i18n('schemas.text.min'),
            type: 'number',
            widget: 'inputNumber',
            hidden: !enableDynamicFont,
            props: { min: 0 },
          },
          max: {
            title: i18n('schemas.text.max'),
            type: 'number',
            widget: 'inputNumber',
            hidden: !enableDynamicFont,
            props: { min: 0 },
          },
          fit: {
            title: i18n('schemas.text.fit'),
            type: 'string',
            widget: 'select',
            hidden: !enableDynamicFont,
            props: {
              options: [
                { label: i18n('schemas.horizontal'), value: DYNAMIC_FIT_HORIZONTAL },
                { label: i18n('schemas.vertical'), value: DYNAMIC_FIT_VERTICAL },
              ],
            },
          },
        },
      },
      fontColor: {
        title: i18n('schemas.textColor'),
        type: 'string',
        widget: 'color',
        rules: [
          {
            pattern: HEX_COLOR_PATTERN,
            message: i18n('hexColorPrompt'),
          },
        ],
      },
      backgroundColor: {
        title: i18n('schemas.bgColor'),
        type: 'string',
        widget: 'color',
        rules: [
          {
            pattern: HEX_COLOR_PATTERN,
            message: i18n('hexColorPrompt'),
          },
        ],
      },
    };

    return textSchema;
  },
  widgets: { UseDynamicFontSize },
  defaultSchema: {
    type: 'text',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-text-cursor-input"><path d="M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1 3-3h1"/><path d="M13 20h-1a3 3 0 0 1-3-3 3 3 0 0 1-3 3H5"/><path d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"/><path d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"/><path d="M9 7v10"/></svg>',
    content: 'Type Something...',
    position: { x: 0, y: 0 },
    width: 45,
    height: 10,
    // If the value of "rotate" is set to undefined or not set at all, rotation will be disabled in the UI.
    // Check this document: https://pdfme.com//docs/custom-schemas#learning-how-to-create-from-pdfmeschemas-code
    rotate: 0,
    alignment: DEFAULT_ALIGNMENT,
    verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
    fontSize: DEFAULT_FONT_SIZE,
    lineHeight: DEFAULT_LINE_HEIGHT,
    characterSpacing: DEFAULT_CHARACTER_SPACING,
    dynamicFontSize: undefined,
    fontColor: DEFAULT_FONT_COLOR,
    fontName: undefined,
    backgroundColor: '',
    opacity: DEFAULT_OPACITY,
  },
};
