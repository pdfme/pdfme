import { mm2pt, Plugin, Schema } from '@pdfme/common';
import { Circle } from 'lucide';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { convertForPdfLayoutProps, createSvgStr, hex2PrintingColor, isEditable } from '../utils.js';

export interface CircleMarkSchema extends Schema {
  color: string;
  borderWidth: number;
}

const HEX_COLOR_REGEXP = new RegExp(HEX_COLOR_PATTERN);

const isSelected = (value: unknown) => value === 'true';

const hasRenderableStyle = (schema: CircleMarkSchema) =>
  schema.width > 0 &&
  schema.height > 0 &&
  schema.borderWidth > 0 &&
  typeof schema.color === 'string' &&
  HEX_COLOR_REGEXP.test(schema.color);

const circleMark: Plugin<CircleMarkSchema> = {
  ui: (arg) => {
    const { schema, value, onChange, rootElement, mode } = arg;
    const selected = isSelected(value);
    const editable = isEditable(mode, schema);
    const shouldRenderMark = selected && hasRenderableStyle(schema);
    if (!editable && !shouldRenderMark) return;

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.boxSizing = 'border-box';

    if (editable) {
      container.style.cursor = 'pointer';
      container.addEventListener('click', () => {
        if (onChange) onChange({ key: 'content', value: selected ? 'false' : 'true' });
      });
    }

    if (shouldRenderMark) {
      const mark = document.createElement('div');
      mark.style.width = '100%';
      mark.style.height = '100%';
      mark.style.boxSizing = 'border-box';
      mark.style.borderRadius = '50%';
      mark.style.borderWidth = `${schema.borderWidth}mm`;
      mark.style.borderStyle = 'solid';
      mark.style.borderColor = schema.color;
      mark.style.pointerEvents = 'none';
      container.appendChild(mark);
    }

    rootElement.appendChild(container);
  },
  pdf: (arg) => {
    const { schema, value, page, options } = arg;
    if (!isSelected(value) || !hasRenderableStyle(schema)) return;

    const borderWidth = mm2pt(schema.borderWidth);
    const pageHeight = page.getHeight();
    const cArg = { schema, pageHeight };
    const { width, height, rotate, opacity } = convertForPdfLayoutProps(cArg);
    const {
      position: { x, y },
    } = convertForPdfLayoutProps({ ...cArg, applyRotateTranslate: false });

    const xScale = width / 2 - borderWidth / 2;
    const yScale = height / 2 - borderWidth / 2;
    if (xScale <= 0 || yScale <= 0) return;

    page.drawEllipse({
      x: x + width / 2,
      y: y + height / 2,
      xScale,
      yScale,
      rotate,
      borderWidth,
      borderColor: hex2PrintingColor(schema.color, options.colorType),
      borderOpacity: opacity,
    });
  },
  propPanel: {
    schema: ({ i18n }) => ({
      color: {
        title: i18n('schemas.color'),
        type: 'string',
        widget: 'color',
        props: {
          disabledAlpha: true,
        },
        required: true,
        rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
      },
      borderWidth: {
        title: i18n('schemas.borderWidth'),
        type: 'number',
        widget: 'inputNumber',
        props: { min: 0, step: 1 },
        required: true,
      },
    }),
    defaultSchema: {
      name: '',
      type: 'circleMark',
      content: 'false',
      position: { x: 0, y: 0 },
      width: 10,
      height: 10,
      rotate: 0,
      opacity: 1,
      color: '#000000',
      borderWidth: 1,
    },
  },
  icon: createSvgStr(Circle),
};

export default circleMark;
