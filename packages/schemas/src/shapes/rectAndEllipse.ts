import { Plugin, Schema, mm2pt } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { hex2RgbColor, convertForPdfLayoutProps } from '../pdfRenderUtils.js';

interface Shape extends Schema {
  type: 'ellipse' | 'rectangle';
  borderWidth: number;
  borderColor: string;
  color: string;
}

const shape: Plugin<Shape> = {
  ui: (arg) => {
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.boxSizing = 'border-box';
    if (schema.type === 'ellipse') {
      div.style.borderRadius = '50%';
    }
    div.style.borderWidth = `${schema.borderWidth ?? 0}mm`;
    div.style.borderStyle = schema.borderWidth && schema.borderColor ? 'solid' : 'none';
    div.style.borderColor = schema.borderColor ?? 'transparent';
    div.style.backgroundColor = schema.color ?? 'transparent';

    rootElement.appendChild(div);
  },
  pdf: (arg) => {
    const { schema, page } = arg;
    const pageHeight = page.getHeight();
    const layoutProps = convertForPdfLayoutProps({ schema, pageHeight });
    const borderWidth = schema.borderWidth ? mm2pt(schema.borderWidth) : 0;

    const drawOptions = {
      rotate: layoutProps.rotate,
      borderWidth,
      borderColor: hex2RgbColor(schema.borderColor),
      color: hex2RgbColor(schema.color),
      opacity: layoutProps.opacity,
      borderOpacity: layoutProps.opacity,
    };
    if (schema.type === 'ellipse') {
      page.drawEllipse({
        x: layoutProps.position.x + layoutProps.width / 2,
        y: layoutProps.position.y + layoutProps.height / 2,
        xScale: layoutProps.width / 2 - borderWidth / 2,
        yScale: layoutProps.height / 2 - borderWidth / 2,
        ...drawOptions,
      });
    } else if (schema.type === 'rectangle') {
      page.drawRectangle({
        x: layoutProps.position.x + borderWidth / 2,
        y: layoutProps.position.y + borderWidth / 2,
        width: layoutProps.width - borderWidth,
        height: layoutProps.height - borderWidth,
        ...drawOptions,
      });
    }
  },
  propPanel: {
    schema: ({ i18n }) => ({
      borderWidth: {
        title: i18n('schemas.borderWidth'),
        type: 'number',
        widget: 'inputNumber',
        min: 0,
        step: 1,
      },
      borderColor: {
        title: i18n('schemas.borderColor'),
        type: 'string',
        widget: 'color',
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
      },
      color: {
        title: i18n('schemas.color'),
        type: 'string',
        widget: 'color',
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('hexColorPrompt') }],
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

const getPropPanelSchema = (type: 'rectangle' | 'ellipse') => ({
  ...shape.propPanel,
  defaultSchema: { ...shape.propPanel.defaultSchema, type },
});

export const rectangle = { ...shape, propPanel: getPropPanelSchema('rectangle') };

export const ellipse = { ...shape, propPanel: getPropPanelSchema('ellipse') };
