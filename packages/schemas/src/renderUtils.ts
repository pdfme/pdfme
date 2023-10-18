import { PDFPage, degrees, rgb } from '@pdfme/pdf-lib';
import { Schema, mm2pt } from '@pdfme/common';

const hex2rgb = (hex: string) => {
  if (hex.slice(0, 1) === '#') hex = hex.slice(1);
  if (hex.length === 3)
    hex =
      hex.slice(0, 1) +
      hex.slice(0, 1) +
      hex.slice(1, 2) +
      hex.slice(1, 2) +
      hex.slice(2, 3) +
      hex.slice(2, 3);

  return [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((str) => parseInt(str, 16));
};

export const hex2RgbColor = (hexString: string | undefined) => {
  if (hexString) {
    const [r, g, b] = hex2rgb(hexString);

    return rgb(r / 255, g / 255, b / 255);
  }

  // eslint-disable-next-line no-undefined
  return undefined;
};

export const calcX = (
  x: number,
  alignment: 'left' | 'center' | 'right',
  boxWidth: number,
  textWidth: number
) => {
  let addition = 0;
  if (alignment === 'center') {
    addition = (boxWidth - textWidth) / 2;
  } else if (alignment === 'right') {
    addition = boxWidth - textWidth;
  }

  return mm2pt(x) + addition;
};

export const calcY = (y: number, pageHeight: number, itemHeight: number) =>
  pageHeight - mm2pt(y) - itemHeight;

export const renderBackgroundColor = (arg: {
  schema: Schema;
  page: PDFPage;
  pageHeight: number;
}) => {
  const { schema, page, pageHeight } = arg;
  if (!schema.backgroundColor) return;
  const { width, height } = convertSchemaDimensionsToPt(schema);
  const color = hex2RgbColor(schema.backgroundColor as string);
  page.drawRectangle({
    x: calcX(schema.position.x, 'left', width, width),
    y: calcY(schema.position.y, pageHeight, height),
    width,
    height,
    color,
  });
};

export const convertSchemaDimensionsToPt = (schema: Schema) => {
  const width = mm2pt(schema.width);
  const height = mm2pt(schema.height);
  const rotate = degrees(schema.rotate ? schema.rotate : 0);

  return { width, height, rotate };
};

export const getCacheKey = (schema: Schema, input: string) => `${schema.type}${input}`;
