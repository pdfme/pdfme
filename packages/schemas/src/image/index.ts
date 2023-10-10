import { pdfRender } from './pdfRender';
import { getPropPanel } from './propPanel';
import { uiRender } from './uiRender';

export const schema = {
    pdf: pdfRender,
    ui: uiRender,
    propPanel: getPropPanel,
};