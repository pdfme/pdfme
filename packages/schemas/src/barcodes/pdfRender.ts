import type { SchemaForUI, Plugin } from '@pdfme/common';
import { getBarcodeValue, barcoder } from './barcoder.js';

const drawBarcode = async (
  arg: { schema: SchemaForUI; input: string; pdfDoc: any; page: any },
  rootElement: any
) => {
  const {
    schema: { type, includeText },
  } = arg;
  const { input } = rootElement;

  // BWIPP expects bwipp_setanycolor to be defined globally when includeText is true.
  // Provide a default no-op if missing to avoid ReferenceError.
  if (typeof (globalThis as any).bwipp_setanycolor === 'undefined') {
    (globalThis as any).bwipp_setanycolor = () => {};
  }

  try {
    if (type === 'qrcode') {
      // QR code rendering
      const barcodeValue = getBarcodeValue(input, type);
      const bw = barcoder(barcodeValue, type);
      // ... rest of qrcode rendering
    } else {
      // other barcode types
      const barcodeValue = getBarcodeValue(input, type);
      const bw = barcoder(barcodeValue, type, { includeText });
      // ... rest of rendering
    }
  } catch (error) {
    console.error('Barcode rendering error:', error);
  }
};

export default drawBarcode;
