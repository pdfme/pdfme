import { pdfRender } from './pdfRender';
import { getPropPanelByBarcodeType } from './propPanel';
import { uiRender } from './uiRender';
import type { BarcodeSchema } from './types';
import type { Plugin } from '../types';
import { barcodeSchemaTypes } from '@pdfme/common';

const schemas = barcodeSchemaTypes.reduce((acc, type) => Object.assign(acc, {
    [type]: {
        pdf: pdfRender,
        ui: uiRender,
        propPanel: getPropPanelByBarcodeType(type),
    }
}), {} as Record<string, Plugin<BarcodeSchema>>)

export default schemas;