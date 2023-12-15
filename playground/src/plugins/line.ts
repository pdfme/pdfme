import { rgb } from '@pdfme/pdf-lib';
import { Plugin, Schema, isHexValid } from '@pdfme/common';
import { convertForPdfLayoutProps } from '@pdfme/schemas';

const HEX_COLOR_PATTERN = '^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$';

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

const hex2RgbColor = (hexString: string | undefined) => {
  if (hexString) {
    const isValid = isHexValid(hexString);

    if (!isValid) {
      throw new Error(`Invalid hex color value ${hexString}`);
    }

    const [r, g, b] = hex2rgb(hexString);

    return rgb(r / 255, g / 255, b / 255);
  }

  return undefined;
};

// ---

interface Line extends Schema {
  color: string;
}

export const line: Plugin<Line> = {
  ui: async (props) => {
    const { schema, rootElement } = props;
    const div = document.createElement('div');
    div.style.backgroundColor = schema.color;
    div.style.width = '100%';
    div.style.height = '100%';
    rootElement.appendChild(div);
  },
  pdf: async (props) => {
    const { page, schema } = props;

    const pageHeight = page.getHeight();
    const {
      width,
      height,
      // TODO rotate implementation
      rotate,
      position: { x, y },
      opacity,
    } = convertForPdfLayoutProps({ schema, pageHeight });

    page.drawLine({
      start: { x, y: y + height / 2 },
      end: { x: x + width, y: y + height / 2 },
      thickness: height,
      color: hex2RgbColor(schema.color),
      opacity: opacity,
    });
  },
  propPanel: {
    schema: ({ i18n }) => {
      return {
        barColor: {
          // TODO i18n implementation
          title: 'Color',
          type: 'string',
          widget: 'color',
          rules: [
            {
              pattern: HEX_COLOR_PATTERN,
              message: 'Please enter a valid hex color code.',
            },
          ],
        },
      };
    },
    defaultValue: '-',
    defaultSchema: {
      type: 'line',
      position: { x: 0, y: 0 },
      width: 50,
      height: 1,
      rotate: 0,
      readOnly: true,
      color: '#000000',
    },
  },
};
