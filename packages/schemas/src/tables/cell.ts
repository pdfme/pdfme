import {
  DEFAULT_FONT_NAME,
  Plugin,
  PDFRenderProps,
  UIRenderProps,
  getFallbackFontName,
} from '@pdfme/common';
import { uiRender as textUiRender } from '../text/uiRender.js';
import { pdfRender as textPdfRender } from '../text/pdfRender.js';
import line from '../shapes/line.js';
import { rectangle } from '../shapes/rectAndEllipse.js';
import type { CellSchema } from './types';
import { getCellPropPanelSchema, getDefaultCellStyles } from './helper.js';
const linePdfRender = line.pdf;
const rectanglePdfRender = rectangle.pdf;

const cellSchema: Plugin<CellSchema> = {
  pdf: async (arg: PDFRenderProps<CellSchema>) => {
    const { schema } = arg;
    const { position, width, height, borderWidth, padding } = schema;
    const renderLine = async (
      schema: CellSchema,
      position: { x: number; y: number },
      width: number,
      height: number
    ) =>
      linePdfRender({
        ...arg,
        schema: { ...schema, type: 'line', position, width, height, color: schema.borderColor },
      });
    // render frame
    await Promise.all([
      rectanglePdfRender({
        ...arg,
        schema: {
          ...schema,
          type: 'rectangle',
          position: { x: schema.position.x, y: schema.position.y },
          width: schema.width,
          height: schema.height,
          color: schema.backgroundColor,
          borderWidth: 0,
        },
      }),
      // TOP
      renderLine(schema, { x: position.x, y: position.y }, width, borderWidth.top),
      // RIGHT
      renderLine(
        schema,
        { x: position.x + width - borderWidth.right, y: position.y },
        borderWidth.right,
        height
      ),
      // BOTTOM
      renderLine(
        schema,
        { x: position.x, y: position.y + height - borderWidth.bottom },
        width,
        borderWidth.bottom
      ),
      // LEFT
      renderLine(schema, { x: position.x, y: position.y }, borderWidth.left, height),
    ]);
    // render text
    await textPdfRender({
      ...arg,
      schema: {
        ...schema,
        type: 'text',
        backgroundColor: '',
        position: {
          x: position.x + borderWidth.left + padding.left,
          y: position.y + borderWidth.top + padding.top,
        },
        width: width - borderWidth.left - borderWidth.right - padding.left - padding.right,
        height: height - borderWidth.top - borderWidth.bottom - padding.top - padding.bottom,
      },
    });
  },
  ui: async (arg: UIRenderProps<CellSchema>) => {
    const { schema, rootElement } = arg;
    const { borderWidth, width, height } = schema;
    rootElement.style.backgroundColor = schema.backgroundColor;

    const createTextDiv = (schema: CellSchema) => {
      const { borderWidth, width, height, padding } = schema;
      const textDiv = document.createElement('div');
      textDiv.id = 'textDiv';
      textDiv.style.position = 'absolute';
      textDiv.style.zIndex = '1';
      textDiv.style.width = `${
        width - borderWidth.left - borderWidth.right - padding.left - padding.right
      }mm`;
      textDiv.style.height = `${
        height - borderWidth.top - borderWidth.bottom - padding.top - padding.bottom
      }mm`;
      textDiv.style.top = `${borderWidth.top + padding.top}mm`;
      textDiv.style.left = `${borderWidth.left + padding.left}mm`;
      return textDiv;
    };

    const createLineDiv = (
      width: string,
      height: string,
      top: string | null,
      right: string | null,
      bottom: string | null,
      left: string | null
    ) => {
      const div = document.createElement('div');
      div.style.width = width;
      div.style.height = height;
      div.style.position = 'absolute';
      if (top !== null) div.style.top = top;
      if (right !== null) div.style.right = right;
      if (bottom !== null) div.style.bottom = bottom;
      if (left !== null) div.style.left = left;
      div.style.backgroundColor = schema.borderColor;
      return div;
    };

    const textDiv = createTextDiv(schema);
    // TODO これでレンダリングしたtextが編集モードに入れない
    await textUiRender({
      ...arg,
      schema: { ...schema, backgroundColor: '' },
      rootElement: textDiv,
    });
    rootElement.appendChild(textDiv);

    const lines = [
      createLineDiv(`${width}mm`, `${borderWidth.top}mm`, '0mm', null, null, '0mm'),
      createLineDiv(`${width}mm`, `${borderWidth.bottom}mm`, null, null, '0mm', '0mm'),
      createLineDiv(`${borderWidth.left}mm`, `${height}mm`, '0mm', null, null, '0mm'),
      createLineDiv(`${borderWidth.right}mm`, `${height}mm`, '0mm', '0mm', null, null),
    ];

    lines.forEach((line) => rootElement.appendChild(line));
  },
  propPanel: {
    schema: ({ options, i18n }) => {
      const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
      const fontNames = Object.keys(font);
      const fallbackFontName = getFallbackFontName(font);
      return getCellPropPanelSchema({ i18n, fontNames, fallbackFontName });
    },
    defaultSchema: {
      type: 'cell',
      content: 'Type Something...',
      position: { x: 0, y: 0 },
      width: 50,
      height: 15,
      ...getDefaultCellStyles(),
    },
  },
};
export default cellSchema;
