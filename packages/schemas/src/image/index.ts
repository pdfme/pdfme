import { pdfRender } from './pdfRender';
import { propPanel } from './propPanel';
import { uiRender } from './uiRender';
import type { ImageSchema } from './types';
import type { Plugin } from '../types';

const schema: Plugin<ImageSchema> = {
    pdf: pdfRender,
    ui: uiRender,
    propPanel
};

export default schema;