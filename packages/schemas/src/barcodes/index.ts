import { pdfRender } from './pdfRender.js';
import { getPropPanelByBarcodeType } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { BarcodeSchema, BarcodeTypes } from './types';
import { BARCODE_TYPES } from './constants.js';
import { Plugin } from '@pdfme/common';

const barcodes = BARCODE_TYPES.reduce(
  (acc, type) =>
    Object.assign(acc, {
      [type]: { pdf: pdfRender, ui: uiRender, propPanel: getPropPanelByBarcodeType(type) },
    }),
  {} as Record<BarcodeTypes, Plugin<BarcodeSchema>>
);

export default barcodes;
