import { degrees, rgb, Degrees } from '@pdfme/pdf-lib';
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

  let adjustedX = x;
  let adjustedY = y;

  if (rotate && rotate !== 0) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radian = (rotate * Math.PI) / 180;

    // オブジェクトの中心を原点にシフト
    const shiftedX = x - centerX;
    const shiftedY = y - centerY;

    // 回転
    const rotatedX = shiftedX * Math.cos(radian) - shiftedY * Math.sin(radian);
    const rotatedY = shiftedX * Math.sin(radian) + shiftedY * Math.cos(radian);

    // 元の位置に戻す（逆シフト）
    adjustedX = rotatedX + centerX;
    adjustedY = rotatedY + centerY;
  }

  return {
    position: {
      x: mm2pt(adjustedX),
      y: pageHeight - mm2pt(adjustedY) - mm2pt(height)
    },
    height: mm2pt(height),
    width: mm2pt(width),
    rotate: degrees(-(rotate ?? 0))
  };
};



export const getCacheKey = (schema: Schema, input: string) => `${schema.type}${input}`;
