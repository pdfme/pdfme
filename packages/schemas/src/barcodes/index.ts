import { pdfRender } from './pdfRender.js';
import { getPropPanelByBarcodeType } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { BarcodeSchema, BarcodeTypes } from './types';
import { BARCODE_TYPES } from './constants.js';
import { Plugin } from '@pdfme/common';

const qrIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>';
const barcodeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-barcode"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>';

const barcodes = BARCODE_TYPES.reduce(
  (acc, type) =>
    Object.assign(acc, {
      [type]: {
        pdf: pdfRender,
        ui: uiRender,
        propPanel: getPropPanelByBarcodeType(type),
        icon: type == 'qrcode' ? qrIcon : barcodeIcon
      },
    }),
  {} as Record<BarcodeTypes, Plugin<BarcodeSchema>>
);

export default barcodes;
