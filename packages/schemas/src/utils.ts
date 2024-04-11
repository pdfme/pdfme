import type * as CSS from 'csstype';
import { cmyk, degrees, degreesToRadians, rgb } from '@pdfme/pdf-lib';
import { Schema, mm2pt, Mode, isHexValid, ColorType } from '@pdfme/common';

export const convertForPdfLayoutProps = ({
  schema,
  pageHeight,
  applyRotateTranslate = true,
}: {
  schema: Schema;
  pageHeight: number;
  applyRotateTranslate?: boolean;
}) => {
  const { width: mmWidth, height: mmHeight, position, rotate, opacity } = schema;
  const { x: mmX, y: mmY } = position;

  const rotateDegrees = rotate ? -rotate : 0;
  const width = mm2pt(mmWidth);
  const height = mm2pt(mmHeight);
  let x = mm2pt(mmX);
  // PDF coordinate system is from bottom left, UI is top left, so we need to flip the y axis
  let y = pageHeight - mm2pt(mmY) - height;

  if (rotateDegrees && applyRotateTranslate) {
    // If rotating we must pivot around the same point as the UI performs its rotation.
    // The UI performs rotation around the objects center point (the pivot point below),
    // pdflib rotates around the bottom left corner of the object.
    // We must therefore adjust the X and Y by rotating the bottom left corner by this pivot point.
    const pivotPoint = { x: x + width / 2, y: pageHeight - mm2pt(mmY) - height / 2 };
    const rotatedPoint = rotatePoint({ x, y }, pivotPoint, rotateDegrees);
    x = rotatedPoint.x;
    y = rotatedPoint.y;
  }

  return {
    position: { x, y },
    height: height,
    width: width,
    rotate: degrees(rotateDegrees),
    opacity,
  };
};

export const rotatePoint = (
  point: { x: number; y: number },
  pivot: { x: number; y: number },
  angleDegrees: number
): { x: number; y: number } => {
  const angleRadians = degreesToRadians(angleDegrees);

  const x =
    Math.cos(angleRadians) * (point.x - pivot.x) -
    Math.sin(angleRadians) * (point.y - pivot.y) +
    pivot.x;
  const y =
    Math.sin(angleRadians) * (point.x - pivot.x) +
    Math.cos(angleRadians) * (point.y - pivot.y) +
    pivot.y;

  return { x, y };
};

export const addAlphaToHex = (hex: string, alphaPercentage: number) => {
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(hex)) {
    throw new Error('Invalid HEX color code');
  }
  const alphaValue = Math.round((alphaPercentage / 100) * 255);
  let alphaHex = alphaValue.toString(16);
  if (alphaHex.length === 1) alphaHex = '0' + alphaHex;
  return hex + alphaHex;
};

export const isEditable = (mode: Mode, schema: Schema) =>
  mode === 'designer' || (mode === 'form' && schema.readOnly !== true);

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
    const isValid = isHexValid(hexString);

    if (!isValid) {
      throw new Error(`Invalid hex color value ${hexString}`);
    }

    const [r, g, b] = hex2rgb(hexString);

    return rgb(r / 255, g / 255, b / 255);
  }

  return undefined;
};

export const hex2CmykColor = (hexString: string | undefined) => {
  if (hexString) {
    const isValid = isHexValid(hexString);

    if (!isValid) {
      throw new Error(`Invalid hex color value ${hexString}`);
    }

    // Remove the # if it's present
    hexString = hexString.replace('#', '');

    // Extract the hexadecimal color code and the opacity
    const hexColor = hexString.substring(0, 6);
    const opacityColor = hexString.substring(6, 8);
    const opacity = opacityColor ? parseInt(opacityColor, 16) / 255 : 1;

    // Convert the hex values to decimal
    let r = parseInt(hexColor.substring(0, 2), 16) / 255;
    let g = parseInt(hexColor.substring(2, 4), 16) / 255;
    let b = parseInt(hexColor.substring(4, 6), 16) / 255;

    // Apply the opacity
    r = r * opacity + (1 - opacity);
    g = g * opacity + (1 - opacity);
    b = b * opacity + (1 - opacity);

    // Calculate the CMYK values
    const k = 1 - Math.max(r, g, b);
    const c = r === 0 ? 0 : (1 - r - k) / (1 - k);
    const m = g === 0 ? 0 : (1 - g - k) / (1 - k);
    const y = b === 0 ? 0 : (1 - b - k) / (1 - k);

    return cmyk(c, m, y, k);
  }

  return undefined;
};

export const hex2PrintingColor = (hexString: string | undefined, colorType?: ColorType) => {
  return colorType?.toLocaleLowerCase() == 'cmyk'
    ? hex2CmykColor(hexString)
    : hex2RgbColor(hexString);
};

export const readFile = (input: File | FileList | null): Promise<string | ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result);
      }
    };

    fileReader.onerror = (e) => {
      reject(new Error('[@pdfme/schemas] File reading failed'));
    };

    let file: File | null = null;
    if (input instanceof FileList && input.length > 0) {
      file = input[0];
    } else if (input instanceof File) {
      file = input;
    }

    if (file) {
      fileReader.readAsDataURL(file);
    } else {
      reject(new Error('[@pdfme/schemas] No files provided'));
    }
  });

export const createErrorElm = () => {
  const container = document.createElement('div');
  const containerStyle: CSS.Properties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  };
  Object.assign(container.style, containerStyle);

  const span = document.createElement('span');
  const spanStyle: CSS.Properties = {
    color: 'white',
    background: 'red',
    padding: '0.25rem',
    fontSize: '12pt',
    fontWeight: 'bold',
    borderRadius: '2px',
    fontFamily: "'Open Sans', sans-serif",
  };
  Object.assign(span.style, spanStyle);

  span.textContent = 'ERROR';
  container.appendChild(span);

  return container;
};
export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));
