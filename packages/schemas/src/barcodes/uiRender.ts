import type { UIRenderProps } from '@pdfme/common';
import type { BarcodeSchema } from './types.js';
import { validateBarcodeInput, createBarCode, createBarCodeSvg } from './helper.js';
import { addAlphaToHex, isEditable, createErrorElm } from '../utils.js';

type CSSProperties = Record<string, string | number>;
const fullSize: CSSProperties = { width: '100%', height: '100%' };

const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const createBarcodeImage = async (schema: BarcodeSchema, value: string) => {
  const imageBuf = await createBarCode({
    type: schema.type,
    input: value,
    width: (schema as unknown as { width: number }).width,
    height: (schema as unknown as { height: number }).height,
    backgroundColor: schema.backgroundColor,
    barColor: schema.barColor,
    textColor: schema.textColor,
    includetext: schema.includetext,
    alttext: schema.alttext,
    textxalign: schema.textxalign,
    textsize: schema.textsize,
    textyoffset: schema.textyoffset,
    scale: schema.scale,
    scaleX: schema.scaleX,
    scaleY: schema.scaleY,
    padding: schema.padding,
    paddingtop: schema.paddingtop,
    paddingleft: schema.paddingleft,
    paddingright: schema.paddingright,
    paddingbottom: schema.paddingbottom,
    inkspread: schema.inkspread,
    showBorder: schema.showBorder,
    eclevel: schema.eclevel,
    version: schema.version,
    mask: schema.mask,
    qzone: schema.qzone,
    columns: schema.columns,
    rows: schema.rows,
    compact: schema.compact,
  });
  const barcodeData = new Blob([new Uint8Array(imageBuf)], { type: 'image/png' });
  const barcodeDataURL = await blobToDataURL(barcodeData);
  return barcodeDataURL;
};

const createBarcodeImageElm = async (schema: BarcodeSchema, value: string) => {
  const barcodeDataURL = await createBarcodeImage(schema, value);
  const img = document.createElement('img');
  img.src = barcodeDataURL;
  const imgStyle: CSSProperties = { ...fullSize, borderRadius: 0 };
  Object.assign(img.style, imgStyle);
  return img;
};

const createBarcodeSvgElm = async (schema: BarcodeSchema, value: string) => {
  const svgStr = await createBarCodeSvg({
    type: schema.type,
    input: value,
    width: (schema as unknown as { width: number }).width,
    height: (schema as unknown as { height: number }).height,
    backgroundColor: schema.backgroundColor,
    barColor: schema.barColor,
    textColor: schema.textColor,
    includetext: schema.includetext,
    alttext: schema.alttext,
    textxalign: schema.textxalign,
    textyalign: schema.textyalign,
    textsize: schema.textsize,
    textyoffset: schema.textyoffset,
    scale: schema.scale,
    scaleX: schema.scaleX,
    scaleY: schema.scaleY,
    padding: schema.padding,
    paddingtop: schema.paddingtop,
    paddingleft: schema.paddingleft,
    paddingright: schema.paddingright,
    paddingbottom: schema.paddingbottom,
    inkspread: schema.inkspread,
    showBorder: schema.showBorder,
    eclevel: schema.eclevel,
    version: schema.version,
    mask: schema.mask,
    qzone: schema.qzone,
    columns: schema.columns,
    rows: schema.rows,
    compact: schema.compact,
  });
  const container = document.createElement('div');
  container.innerHTML = svgStr;
  const svgEl = container.firstChild as SVGElement | null;
  if (svgEl && svgEl instanceof SVGElement) {
    svgEl.setAttribute('width', '100%');
    svgEl.setAttribute('height', '100%');
    return svgEl;
  }
  // Fallback to image element if parsing failed
  return createBarcodeImageElm(schema, value);
};

export const uiRender = async (arg: UIRenderProps<BarcodeSchema>) => {
  const { value, rootElement, mode, onChange, stopEditing, tabIndex, placeholder, schema, theme } =
    arg;

  const container = document.createElement('div');
  const containerStyle: CSSProperties = {
    ...fullSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Open Sans', sans-serif",
  };
  Object.assign(container.style, containerStyle);
  rootElement.appendChild(container);
  const editable = isEditable(mode, schema);
  if (editable) {
    const input = document.createElement('input');
    const inputStyle: CSSProperties = {
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
    if ((schema as { format?: string }).format === 'svg') {
      try {
        const svgElm = await createBarcodeSvgElm(schema, value);
        container.appendChild(svgElm);
      } catch {
        const imgElm = await createBarcodeImageElm(schema, value);
        container.appendChild(imgElm);
      }
    } else {
      const imgElm = await createBarcodeImageElm(schema, value);
      container.appendChild(imgElm);
    }
  } catch (err) {
    console.error(`[@pdfme/ui] ${String(err)}`);
    container.appendChild(createErrorElm());
  }
};
