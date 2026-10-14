import type * as CSS from 'csstype';
import { UIRenderProps } from '@pdfme/common';
import type { BarcodeSchema } from './types.js';
import {
  validateBarcodeInput,
  createBarCode,
  createBarCodeSvg,
  ensureHexColorHash,
  isAspectRatioLockedBarcodeType,
} from './helper.js';
import { addAlphaToHex, isEditable, createErrorElm } from '../utils.js';

const fullSize = { width: '100%', height: '100%' };

const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const createBarcodeImage = async (schema: BarcodeSchema, value: string) => {
  const imageBuf = await createBarCode({
    ...schema,
    backgroundColor: undefined,
    input: value,
  });
  const barcodeData = new Blob([new Uint8Array(imageBuf)], { type: 'image/png' });
  const barcodeDataURL = await blobToDataURL(barcodeData);
  return barcodeDataURL;
};

const createBarcodeImageElm = async (schema: BarcodeSchema, value: string) => {
  const img = document.createElement('img');
  if (isAspectRatioLockedBarcodeType(schema.type)) {
    // Natural-size SVG letterboxed by the browser: crisp at any zoom and not
    // bounded by canvas size limits like a natural-size raster would be.
    const svg = createBarCodeSvg({
      ...schema,
      width: undefined,
      height: undefined,
      backgroundColor: undefined,
      input: value,
    });
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const imgStyle: CSS.Properties = { ...fullSize, objectFit: 'contain', borderRadius: 0 };
    Object.assign(img.style, imgStyle);
    return img;
  }

  const barcodeDataURL = await createBarcodeImage(schema, value);
  img.src = barcodeDataURL;
  const imgStyle: CSS.Properties = { ...fullSize, borderRadius: 0 };
  Object.assign(img.style, imgStyle);
  return img;
};

export const uiRender = async (arg: UIRenderProps<BarcodeSchema>) => {
  const { value, rootElement, mode, onChange, stopEditing, tabIndex, placeholder, schema, theme } =
    arg;

  const container = document.createElement('div');
  const containerStyle: CSS.Properties = {
    ...fullSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Open Sans', sans-serif",
    backgroundColor: ensureHexColorHash(schema.backgroundColor) || 'transparent',
  };
  Object.assign(container.style, containerStyle);
  rootElement.appendChild(container);
  const editable = isEditable(mode, schema);
  if (editable) {
    const input = document.createElement('input');
    const inputStyle: CSS.Properties = {
      width: '100%',
      position: 'absolute',
      textAlign: 'center',
      fontSize: '12pt',
      fontWeight: 'bold',
      color: theme.colorWhite,
      backgroundColor: editable || value ? addAlphaToHex('#000000', 80) : 'none',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
    };
    Object.assign(input.style, inputStyle);
    input.value = value;
    input.placeholder = placeholder || '';
    input.tabIndex = tabIndex || 0;
    input.addEventListener('change', (e: Event) => {
      if (onChange) onChange({ key: 'content', value: (e.target as HTMLInputElement).value });
    });
    input.addEventListener('blur', () => {
      if (stopEditing) stopEditing();
    });
    container.appendChild(input);
    input.setSelectionRange(value.length, value.length);
    if (mode === 'designer') {
      input.focus();
    }
  }

  if (!value) return;
  try {
    if (!validateBarcodeInput(schema.type, value))
      throw new Error('[@pdfme/schemas/barcodes] Invalid barcode input');
    const imgElm = await createBarcodeImageElm(schema, value);
    container.appendChild(imgElm);
  } catch (err) {
    console.error(`[@pdfme/ui] ${String(err)}`);
    container.appendChild(createErrorElm());
  }
};
