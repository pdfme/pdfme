import { Plugin, Schema, mm2pt } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { hex2RgbColor, convertForPdfLayoutProps } from '../pdfRenderUtils.js';

interface Rectangle extends Schema {
  borderWidth: number;
  borderColor: string;
  color: string;
}

const schema: Plugin<Rectangle> = {
  ui: (arg) => {
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.boxSizing = 'border-box';
    div.style.borderWidth = `${schema.borderWidth ?? 0}mm`;
    div.style.borderStyle = schema.borderWidth && schema.borderColor ? 'solid' : 'none';
    div.style.borderColor = schema.borderColor ?? 'transparent';
    div.style.backgroundColor = schema.color ?? 'transparent';

    rootElement.appendChild(div);
  },
  pdf: (arg) => {
    const { schema, page } = arg;
    const pageHeight = page.getHeight();
    const {
      width,
      height,
      rotate,
      position: { x, y },
      opacity,
    } = convertForPdfLayoutProps({ schema, pageHeight });

    const borderWidth = schema.borderWidth ? mm2pt(schema.borderWidth) : 0;
    page.drawRectangle({
      x: x + borderWidth / 2,
      y: y + borderWidth / 2,
      width: width - borderWidth,
      height: height - borderWidth,
      rotate,
      borderWidth,
      borderColor: hex2RgbColor(schema.borderColor),
      color: hex2RgbColor(schema.color),
      opacity: opacity,
      borderOpacity: opacity,
    });
  },
  propPanel: {
    schema: ({ i18n }) => ({
      borderWidth: {
        title: 'borderWidth(mm)', // TODO i18n
        type: 'number',
        widget: 'inputNumber',
        min: 0,
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
      color: '#ffffff',
      readOnly: true,
    },
  },
};
export default schema;
