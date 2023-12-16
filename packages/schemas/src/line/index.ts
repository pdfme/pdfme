import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender.js';
import { propPanel } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { LineSchema } from './types.js';

const schema: Plugin<LineSchema> = { pdf: pdfRender, ui: uiRender, propPanel };
export default schema;
