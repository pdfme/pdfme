import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender';
import { propPanel } from './propPanel';
import { uiRender } from './uiRender';
import type { TextSchema } from './types';

const schema: Plugin<TextSchema> = { pdf: pdfRender, ui: uiRender, propPanel };

export default schema;
