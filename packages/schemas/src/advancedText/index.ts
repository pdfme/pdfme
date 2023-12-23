import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender.js';
import { propPanel } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { AdvancedTextSchema } from './types';

const schema: Plugin<AdvancedTextSchema> = { pdf: pdfRender, ui: uiRender, propPanel };
export default schema;
