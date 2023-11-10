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

const UseDynamicFontSize = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema } = props;

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
  label.innerText = 'Dynamic Font Size';
  label.style.cssText = 'display: flex; width: 100%;';
  label.appendChild(checkbox);
  rootElement.appendChild(label);
};

export const propPanel: PropPanel<TextSchema> = {
  schema: ({ options, activeSchema }) => {
    const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
    const fontNames = Object.keys(font);
    const fallbackFontName = getFallbackFontName(font);

    const enableDynamicFont = Boolean((activeSchema as any)?.dynamicFontSize);

    const textSchema: Record<string, PropPanelSchema> = {
      fontName: {
        title: 'Font Name',
        type: 'string',
        widget: 'select',
        default: fallbackFontName,
        props: { options: fontNames.map((name) => ({ label: name, value: name })) },
        span: 12,
      },
      fontSize: {
        title: 'Size',
        type: 'number',
        widget: 'inputNumber',
        span: 6,
        disabled: enableDynamicFont,
      },
      characterSpacing: { title: 'Spacing', type: 'number', widget: 'inputNumber', span: 6 },
      alignment: {
        title: 'Text Align',
        type: 'string',
        widget: 'select',
        props: {
          options: [
            { label: 'Left', value: DEFAULT_ALIGNMENT },
            { label: 'Center', value: ALIGN_CENTER },
            { label: 'Right', value: ALIGN_RIGHT },
          ],
        },
        span: 8,
      },
      verticalAlignment: {
        title: 'Vertical Align',
        type: 'string',
        widget: 'select',
        props: {
          options: [
            { label: 'Top', value: VERTICAL_ALIGN_TOP },
            { label: 'Middle', value: VERTICAL_ALIGN_MIDDLE },
            { label: 'Bottom', value: VERTICAL_ALIGN_BOTTOM },
          ],
        },
        span: 8,
      },
      lineHeight: { title: 'Line Height', type: 'number', widget: 'inputNumber', span: 8 },
      useDynamicFontSize: { type: 'boolean', widget: 'UseDynamicFontSize', bind: false },
      dynamicFontSize: {
        type: 'object',
        widget: 'card',
        column: 3,
        properties: {
          min: { title: 'Min', type: 'number', widget: 'inputNumber', hidden: !enableDynamicFont },
          max: { title: 'Max', type: 'number', widget: 'inputNumber', hidden: !enableDynamicFont },
          fit: {
            title: 'Fit',
            type: 'string',
            widget: 'select',
            hidden: !enableDynamicFont,
            props: {
              options: [
                { label: 'Horizontal', value: DYNAMIC_FIT_HORIZONTAL },
                { label: 'Vertical', value: DYNAMIC_FIT_VERTICAL },
              ],
            },
          },
        },
      },
      fontColor: { title: 'Font Color', type: 'string', widget: 'color' },
      backgroundColor: { title: 'Background', type: 'string', widget: 'color' },
    };

    return textSchema;
  },
  widgets: { UseDynamicFontSize },
  defaultValue: 'Type Something...',
  defaultSchema: {
    type: 'text',
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
  },
};
