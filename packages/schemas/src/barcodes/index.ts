import { pdfRender } from './pdfRender';
import { getPropPanelByBarcodeType } from './propPanel';
import { uiRender } from './uiRender';
import type { BarcodeSchema, BarcodeTypes } from './types';
import { BARCODE_TYPES } from './constants';
import { Plugin } from '@pdfme/common';

const schemas = BARCODE_TYPES.reduce(
  (acc, type) =>
    Object.assign(acc, {
      [type]: { pdf: pdfRender, ui: uiRender, propPanel: getPropPanelByBarcodeType(type) },
    }),
  {} as Record<BarcodeTypes, Plugin<BarcodeSchema>>
);

export default schemas;
