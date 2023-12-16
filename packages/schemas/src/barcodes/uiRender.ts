import type * as CSS from 'csstype';
import { UIRenderProps } from '@pdfme/common';
import type { BarcodeSchema } from './types';
import { validateBarcodeInput, createBarCode } from './helper.js';
import { addAlphaToHex, isEditable } from '../renderUtils.js';

const fullSize = { width: '100%', height: '100%' };

const createErrorBarcodeElm = () => {
  const container = document.createElement('div');
  const containerStyle: CSS.Properties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...fullSize,
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
  };
  Object.assign(span.style, spanStyle);

  span.textContent = 'ERROR';
  container.appendChild(span);

  return container;
};

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
    input: value,
  });
  const barcodeData = new Blob([new Uint8Array(imageBuf)], { type: 'image/png' });
  const barcodeDataURL = await blobToDataURL(barcodeData);
  return barcodeDataURL;
};

const createBarcodeImageElm = async (schema: BarcodeSchema, value: string) => {
  const barcodeDataURL = await createBarcodeImage(schema, value);
  const img = document.createElement('img');
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
    opacity: schema.opacity,
  };
  Object.assign(container.style, containerStyle);
  rootElement.appendChild(container);
  const editable = isEditable(mode);
  if (editable) {
    const input = document.createElement('input');
    const inputStyle: CSS.Properties = {
      ...fullSize,
      position: 'absolute',
      textAlign: 'center',
      fontSize: '1rem',
      color: '#000',
      backgroundColor: editable || value ? addAlphaToHex(theme.colorPrimaryBg, 30) : 'none',
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
      onChange && onChange((e.target as HTMLInputElement).value);
    });
    input.addEventListener('blur', () => {
      stopEditing && stopEditing();
    });
    container.appendChild(input);
    input.setSelectionRange(value.length, value.length);
    input.focus();
  }

  if (!value) return;
  try {
    if (!validateBarcodeInput(schema.type, value))
      throw new Error('[@pdfme/schemas] Invalid barcode input');
    const imgElm = await createBarcodeImageElm(schema, value);
    container.appendChild(imgElm);
  } catch (err) {
    console.error(`[@pdfme/ui] ${err}`);
    const errorBarcodeElm = createErrorBarcodeElm();
    container.appendChild(errorBarcodeElm);
  }
};
