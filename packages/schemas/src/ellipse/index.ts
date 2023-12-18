import { Plugin, Schema, mm2pt } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { hex2RgbColor, convertForPdfLayoutProps } from '../pdfRenderUtils.js';

// TODO rectangleとほぼ同じなので共通化できるはず
// memo image, line等はindex.tsしかないのでディレクトリに分ける必要はない

interface Ellipse extends Schema {
  borderWidth: number;
  borderColor: string;
  color: string;
}

const schema: Plugin<Ellipse> = {
  ui: (arg) => {
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.boxSizing = 'border-box';
    // TODO 差分
    div.style.borderRadius = '50%';
    // 
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
    page.drawEllipse({
      x: x + borderWidth / 2,
      y: y + borderWidth / 2,
      // TODO 差分
      xScale: width,
      yScale: height,
      //
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
      type: 'ellipse',
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
