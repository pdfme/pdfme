import { Plugin, Schema } from '@pdfme/common';
// TMP
const HEX_COLOR_PATTERN = '^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$';
// ---

interface Rectangle extends Schema {
  borderWidth: number;
  borderColor: string;
  borderOpacity: number;
  color: string;
}

export const rectangle: Plugin<Rectangle> = {
  ui: async (arg) => {
    // TODO IMPL
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.borderWidth = `${schema.borderWidth}px`;
    div.style.borderColor = schema.borderColor;
    // div.style.opacity = `${schema.borderOpacity}`; ??
    div.style.backgroundColor = schema.color;

    rootElement.appendChild(div);
  },
  pdf: async (arg) => {
    // TODO IMPL
    // https://pdf-lib.js.org/docs/api/classes/pdfpage#drawrectangle
  },
  propPanel: {
    schema: ({ i18n }) => ({
      borderWidth: {
        title: 'borderWidth', // TODO i18n
        type: 'number',
        widget: 'inputNumber',
        min: 0,
        max: 100,
        step: 1,
      },
      borderColor: {
        title: 'borderColor', // TODO i18n
        type: 'string',
        widget: 'color',
        rules: [
          {
            pattern: HEX_COLOR_PATTERN,
            message: i18n('hexColorPrompt'),
          },
        ],
      },
      borderOpacity: {
        title: 'borderOpacity', // TODO i18n
        type: 'number',
        widget: 'inputNumber',
        min: 0,
        max: 1,
        step: 0.05,
      },
      color: {
        title: 'color', // TODO i18n
        type: 'string',
        widget: 'color',
        rules: [
          {
            pattern: HEX_COLOR_PATTERN,
            message: i18n('hexColorPrompt'),
          },
        ],
      },
    }),
    defaultValue: '',
    defaultSchema: {
      type: 'rectangle',
      position: { x: 0, y: 0 },
      width: 62.5,
      height: 37.5,
      rotate: 0,
      opacity: 1,
      borderWidth: 5,
      borderColor: '#000000',
      borderOpacity: 1,
      color: '#ffffff',
      readOnly: true,
    },
  },
};
