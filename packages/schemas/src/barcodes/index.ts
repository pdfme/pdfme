import { pdfRender } from './pdfRender';
import { getPropPanelByBarcodeType } from './propPanel';
import { uiRender } from './uiRender';

export const schema = {
    pdf: pdfRender,
    ui: uiRender,
    propPanel: getPropPanelByBarcodeType,
};