import { DEFAULT_FONT_NAME, Plugin, PDFRenderProps, getFallbackFontName } from '@pdfme/common';
import { uiRender as textUiRender } from '../text/uiRender.js';
import { pdfRender as textPdfRender } from '../text/pdfRender.js';
import line from '../shapes/line.js';
import { rectangle } from '../shapes/rectAndEllipse.js';
import type { CellSchema } from './types.js';
import { getCellPropPanelSchema, getDefaultCellStyles } from './helper.js';
import barcodes from '../barcodes/index.js';

const linePdfRender = line.pdf;
const rectanglePdfRender = rectangle.pdf;

// QR Code minimum size in mm (to ensure readability)
const QR_MIN_SIZE = 26;

// Barcode horizontal padding in mm (left and right margins)
const BARCODE_HORIZONTAL_PADDING = 2;

// Supported barcode types for table cells
const SUPPORTED_BARCODE_TYPES = ['qrcode', 'code128'] as const;

// QR code is square and should maintain aspect ratio
const isQRCode = (type: string) => type === 'qrcode';

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

/**
 * Calculate available space after borders and padding
 */
const calculateAvailableSpace = (schema: CellSchema) => {
  const { borderWidth: bw, width, height, padding: pd } = schema;
  return {
    width: width - bw.left - bw.right - pd.left - pd.right,
    height: height - bw.top - bw.bottom - pd.top - pd.bottom,
  };
};

/**
 * Calculate barcode dimensions based on available space and barcode type
 */
const calculateBarcodeDimensions = (
  availableWidth: number,
  availableHeight: number,
  barcodeType: string,
  enforceMinSize = false,
) => {
  if (isQRCode(barcodeType)) {
    // QR codes are square and centered
    let size = Math.min(availableWidth, availableHeight);
    if (enforceMinSize) {
      size = Math.max(size, QR_MIN_SIZE);
    }
    const offsetX = (availableWidth - size) / 2;
    const offsetY = (availableHeight - size) / 2;
    return { width: size, height: size, offsetX, offsetY };
  } else {
    // Linear barcodes (code128) with horizontal padding
    const barcodeWidth = Math.max(0, availableWidth - BARCODE_HORIZONTAL_PADDING * 2);
    const offsetX = BARCODE_HORIZONTAL_PADDING;
    return { width: barcodeWidth, height: availableHeight, offsetX, offsetY: 0 };
  }
};

const createTextDiv = (schema: CellSchema) => {
  const { borderWidth: bw, padding: pd } = schema;
  const { width, height } = calculateAvailableSpace(schema);
  const textDiv = document.createElement('div');
  textDiv.style.position = 'absolute';
  textDiv.style.zIndex = '1';
  textDiv.style.width = `${width}mm`;
  textDiv.style.height = `${height}mm`;
  textDiv.style.top = `${bw.top + pd.top}mm`;
  textDiv.style.left = `${bw.left + pd.left}mm`;
  return textDiv;
};

const createBarcodeDiv = (schema: CellSchema, barcodeType: string) => {
  const { borderWidth: bw, padding: pd } = schema;
  const { width: availableWidth, height: availableHeight } = calculateAvailableSpace(schema);
  const { width, height, offsetX, offsetY } = calculateBarcodeDimensions(
    availableWidth,
    availableHeight,
    barcodeType,
    true, // Enforce minimum size for QR codes
  );

  const barcodeDiv = document.createElement('div');
  barcodeDiv.style.position = 'absolute';
  barcodeDiv.style.zIndex = '1';
  barcodeDiv.style.width = `${width}mm`;
  barcodeDiv.style.height = `${height}mm`;
  barcodeDiv.style.top = `${bw.top + pd.top + offsetY}mm`;
  barcodeDiv.style.left = `${bw.left + pd.left + offsetX}mm`;
  return barcodeDiv;
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

type RenderContent = {
  type: string;
  content: string;
};

/**
 * Determine render content type and value
 * Priority: columnType > JSON parsed type > default to text
 */
const getRenderContent = (
  value: string,
  columnType?: 'text' | import('../barcodes/types.js').BarcodeTypes,
): RenderContent => {
  // If column type is explicitly specified, use it
  if (columnType && columnType !== 'text') {
    return { type: columnType, content: value };
  }

  // Try to parse as JSON for barcode data
  try {
    const parsed = JSON.parse(value) as { type?: string; content?: string };
    if (
      parsed.type &&
      parsed.content &&
      (SUPPORTED_BARCODE_TYPES as readonly string[]).includes(parsed.type)
    ) {
      return { type: parsed.type, content: parsed.content };
    }
  } catch {
    // Not valid JSON, treat as text
  }

  return { type: 'text', content: value };
};

/**
 * Check if content type is a supported barcode
 */
const isSupportedBarcode = (type: string): boolean => {
  return (SUPPORTED_BARCODE_TYPES as readonly string[]).includes(type);
};

const cellSchema: Plugin<CellSchema> = {
  pdf: async (arg) => {
    const { schema, value } = arg;
    const { position, width, height, borderWidth, padding } = schema;

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

    const renderContent = getRenderContent(value || schema.content || '', schema.columnType);
    const { width: availableWidth, height: availableHeight } = calculateAvailableSpace(schema);

    const baseContentSchema = {
      ...schema,
      type: renderContent.type,
      backgroundColor: '',
      barColor: schema.fontColor,
      position: {
        x: position.x + borderWidth.left + padding.left,
        y: position.y + borderWidth.top + padding.top,
      },
      width: availableWidth,
      height: availableHeight,
    };

    if (isSupportedBarcode(renderContent.type)) {
      // Render barcode (qrcode or code128)
      const {
        width: barcodeWidth,
        height: barcodeHeight,
        offsetX,
        offsetY,
      } = calculateBarcodeDimensions(availableWidth, availableHeight, renderContent.type, true);

      const barcodeType = renderContent.type as keyof typeof barcodes;
      const barcodeSchema = {
        ...baseContentSchema,
        type: barcodeType,
        position: {
          x: position.x + borderWidth.left + padding.left + offsetX,
          y: position.y + borderWidth.top + padding.top + offsetY,
        },
        width: barcodeWidth,
        height: barcodeHeight,
      };

      await barcodes[barcodeType].pdf({
        ...arg,
        value: renderContent.content,
        schema: barcodeSchema,
      });
    } else {
      // Render text
      await textPdfRender({
        ...arg,
        schema: baseContentSchema,
      });
    }
  },
  ui: async (arg) => {
    const { schema, rootElement, value } = arg;
    const { borderWidth, width, height, borderColor, backgroundColor } = schema;
    rootElement.style.backgroundColor = backgroundColor;

    const renderContent = getRenderContent(value || schema.content || '', schema.columnType);
    const isBarcode = isSupportedBarcode(renderContent.type);

    // Create content container div
    const contentDiv = isBarcode
      ? createBarcodeDiv(schema, renderContent.type)
      : createTextDiv(schema);

    if (isBarcode) {
      // Render barcode (qrcode or code128)
      const { width: availableWidth, height: availableHeight } = calculateAvailableSpace(schema);
      const { width: barcodeWidth, height: barcodeHeight } = calculateBarcodeDimensions(
        availableWidth,
        availableHeight,
        renderContent.type,
        true, // Enforce minimum size for QR codes in UI as well
      );

      const barcodeType = renderContent.type as keyof typeof barcodes;
      await barcodes[barcodeType].ui({
        ...arg,
        value: renderContent.content,
        schema: {
          ...schema,
          type: barcodeType,
          backgroundColor: '',
          barColor: schema.fontColor,
          width: barcodeWidth,
          height: barcodeHeight,
        },
        rootElement: contentDiv,
      });
    } else {
      // Render text
      await textUiRender({
        ...arg,
        schema: { ...schema, backgroundColor: '' },
        rootElement: contentDiv,
      });
    }
    rootElement.appendChild(contentDiv);

    // Render borders
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
