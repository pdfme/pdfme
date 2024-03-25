import { Plugin, Schema, mm2pt } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { hex2PrintingColor, convertForPdfLayoutProps } from '../utils.js';

interface ShapeSchema extends Schema {
  type: 'ellipse' | 'rectangle';
  borderWidth: number;
  borderColor: string;
  color: string;
}

const shape: Plugin<ShapeSchema> = {
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
    const { schema, page, options } = arg;
    if (!schema.color && !schema.borderColor) return;
    const { colorType } = options;
    const pageHeight = page.getHeight();
    const cArg = { schema, pageHeight };
    const { position, width, height, rotate, opacity } = convertForPdfLayoutProps(cArg);
    const {
      position: { x: x4Ellipse, y: y4Ellipse },
    } = convertForPdfLayoutProps({ ...cArg, applyRotateTranslate: false });
    const borderWidth = schema.borderWidth ? mm2pt(schema.borderWidth) : 0;

    const drawOptions = {
      rotate,
      borderWidth,
      borderColor: hex2PrintingColor(schema.borderColor, colorType),
      color: hex2PrintingColor(schema.color, colorType),
      opacity,
      borderOpacity: opacity,
    };
    if (schema.type === 'ellipse') {
      page.drawEllipse({
        x: x4Ellipse + width / 2,
        y: y4Ellipse + height / 2,
        xScale: width / 2 - borderWidth / 2,
        yScale: height / 2 - borderWidth / 2,
        ...drawOptions,
      });
    } else if (schema.type === 'rectangle') {
      page.drawRectangle({
        x: position.x + borderWidth / 2,
        y: position.y + borderWidth / 2,
        width: width - borderWidth,
        height: height - borderWidth,
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
        props: { min: 0 },
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
    defaultSchema: {
      type: 'rectangle',
      position: { x: 0, y: 0 },
      width: 62.5,
      height: 37.5,
      rotate: 0,
      opacity: 1,
      borderWidth: 1,
      borderColor: '#000000',
      color: '',
      readOnly: true,
    },
  },
};

const rectangleIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>';
const ellipseIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>';

const getPropPanelSchema = (type: 'rectangle' | 'ellipse') => ({
  ...shape.propPanel,
  defaultSchema: {
    ...shape.propPanel.defaultSchema,
    type,
    icon: type === 'rectangle' ? rectangleIcon : ellipseIcon,
  },
});

export const rectangle = { ...shape, propPanel: getPropPanelSchema('rectangle') };

export const ellipse = { ...shape, propPanel: getPropPanelSchema('ellipse') };
