import type { Plugin } from '@pdfme/common';
import type { TableSchema } from './types.js';
import { pdfRender } from './pdfRender.js';
import { uiRender } from './uiRender.js';
import { propPanel } from './propPanel.js';

const tableSchema: Plugin<TableSchema> = {
  pdf: pdfRender,
  ui: uiRender,
  propPanel,
};
export default tableSchema;
