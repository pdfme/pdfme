import { DEFAULT_FONT_NAME, Plugin, PDFRenderProps, getFallbackFontName } from '@pdfme/common';
import { uiRender as textUiRender } from '../text/uiRender.js';
import { pdfRender as textPdfRender } from '../text/pdfRender.js';
import line from '../shapes/line.js';
import { rectangle } from '../shapes/rectAndEllipse.js';
import imagePlugin, { type ImageSchema } from '../graphics/image.js';
import type { CellSchema } from './types.js';
import { getCellPropPanelSchema, getDefaultCellStyles } from './helper.js';
import { createBoxDimension, getBoxContentArea } from '../box.js';
import { getTableImageObjectPosition, resolveImageDimension } from './imageCell.js';
const imagePdfRender = imagePlugin.pdf;
const linePdfRender = line.pdf;
const rectanglePdfRender = rectangle.pdf;

const renderLine = async (
  arg: PDFRenderProps<CellSchema>,
  schema: CellSchema,
  position: { x: number; y: number },
  width: number,
  height: number,
) =>
  linePdfRender({
    ...arg,
    schema: { ...schema, type: 'line', position, width, height, color: schema.borderColor },
  });

const createTextDiv = (schema: CellSchema) => {
  const contentArea = getBoxContentArea(schema);
  const textDiv = document.createElement('div');
  textDiv.style.position = 'absolute';
  textDiv.style.zIndex = '1';
  textDiv.style.width = `${contentArea.width}mm`;
  textDiv.style.height = `${contentArea.height}mm`;
  textDiv.style.top = `${contentArea.topInset}mm`;
  textDiv.style.left = `${contentArea.leftInset}mm`;
  return textDiv;
};

const createLineDiv = (
  width: string,
  height: string,
  top: string | null,
  right: string | null,
  bottom: string | null,
  left: string | null,
  borderColor: string,
) => {
  const div = document.createElement('div');
  div.style.width = width;
  div.style.height = height;
  div.style.position = 'absolute';
  if (top !== null) div.style.top = top;
  if (right !== null) div.style.right = right;
  if (bottom !== null) div.style.bottom = bottom;
  if (left !== null) div.style.left = left;
  div.style.backgroundColor = borderColor;
  return div;
};

const cellSchema: Plugin<CellSchema> = {
  pdf: async (arg) => {
    const { schema } = arg;
    const { position, width, height, borderWidth } = schema;
    const contentArea = getBoxContentArea(schema);

    await Promise.all([
      // BACKGROUND
      rectanglePdfRender({
        ...arg,
        schema: {
          ...schema,
          type: 'rectangle',
          width: schema.width,
          height: schema.height,
          borderWidth: 0,
          borderColor: '',
          color: schema.backgroundColor,
        },
      }),
      // TOP
      renderLine(arg, schema, { x: position.x, y: position.y }, width, borderWidth.top),
      // RIGHT
      renderLine(
        arg,
        schema,
        { x: position.x + width - borderWidth.right, y: position.y },
        borderWidth.right,
        height,
      ),
      // BOTTOM
      renderLine(
        arg,
        schema,
        { x: position.x, y: position.y + height - borderWidth.bottom },
        width,
        borderWidth.bottom,
      ),
      // LEFT
      renderLine(arg, schema, { x: position.x, y: position.y }, borderWidth.left, height),
    ]);
    if (schema.cellType === 'image') {
      // Broken base64 must not throw; only a resolved PNG/JPEG is painted.
      if (arg.value && resolveImageDimension(arg.value, arg._cache)) {
        const imageSchema: ImageSchema = {
          name: schema.name,
          type: 'image',
          content: arg.value,
          position: contentArea.position,
          width: contentArea.width,
          height: contentArea.height,
          rotate: 0,
          opacity: 1,
          objectFit: 'contain',
          objectPosition: getTableImageObjectPosition(schema.alignment, schema.verticalAlignment),
        };
        await imagePdfRender({ ...arg, value: arg.value, schema: imageSchema });
      }
      return;
    }
    // TEXT
    await textPdfRender({
      ...arg,
      schema: {
        ...schema,
        type: 'text',
        backgroundColor: '',
        borderColor: '',
        borderWidth: createBoxDimension(0),
        padding: createBoxDimension(0),
        position: contentArea.position,
        width: contentArea.width,
        height: contentArea.height,
      },
    });
  },
  ui: async (arg) => {
    const { schema, rootElement } = arg;
    const { borderWidth, width, height, borderColor, backgroundColor } = schema;
    rootElement.style.backgroundColor = backgroundColor;

    if (schema.cellType === 'image') {
      const dimension = arg.value ? resolveImageDimension(arg.value, arg._cache) : undefined;
      if (dimension) {
        const imageFrame = createTextDiv(schema);
        const img = document.createElement('img');
        img.alt = '';
        img.src = arg.value;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.objectPosition = getTableImageObjectPosition(
          schema.alignment,
          schema.verticalAlignment,
        );
        imageFrame.appendChild(img);
        rootElement.appendChild(imageFrame);
      }
    } else {
      const textDiv = createTextDiv(schema);
      await textUiRender({
        ...arg,
        schema: {
          ...schema,
          backgroundColor: '',
          borderColor: '',
          borderWidth: createBoxDimension(0),
          padding: createBoxDimension(0),
        },
        rootElement: textDiv,
      });
      rootElement.appendChild(textDiv);
    }

    const lines = [
      createLineDiv(`${width}mm`, `${borderWidth.top}mm`, '0mm', null, null, '0mm', borderColor),
      createLineDiv(`${width}mm`, `${borderWidth.bottom}mm`, null, null, '0mm', '0mm', borderColor),
      createLineDiv(`${borderWidth.left}mm`, `${height}mm`, '0mm', null, null, '0mm', borderColor),
      createLineDiv(`${borderWidth.right}mm`, `${height}mm`, '0mm', '0mm', null, null, borderColor),
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
      name: '',
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
