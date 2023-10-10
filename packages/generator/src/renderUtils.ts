import { degrees, rgb } from '@pdfme/pdf-lib';
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

// FIXME ここから
export const convertForPdfLayoutProps = ({ schema, pageHeight }: { schema: Schema, pageHeight: number }) => {
  const { width, height, position, rotate } = schema;
  const { x, y } = position;

  // Step 1: Calculate the center
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  // Step 2: Translate to the center
  const translatedX = mm2pt(centerX);
  const translatedY = pageHeight - mm2pt(centerY);

  // Step 3: Apply rotation (handled externally, assume rotate is in degrees)
  const rotatedAngle = degrees(-(rotate ?? 0));

  // Step 4: Translate back to the original position
  const finalX = translatedX - mm2pt(width) / 2;
  const finalY = translatedY - mm2pt(height) / 2;

  return {
    position: {
      x: finalX,
      y: finalY
    },
    height: mm2pt(height),
    width: mm2pt(width),
    rotate: rotatedAngle
  };
};


export const getCacheKey = (schema: Schema, input: string) => `${schema.type}${input}`;
