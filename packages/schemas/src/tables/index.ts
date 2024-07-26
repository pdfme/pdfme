import type { Plugin } from '@pdfme/common';
import type { TableSchema } from './types.js';
import { pdfRender } from './pdfRender.js';
import { uiRender } from './uiRender.js';
import { propPanel } from './propPanel.js';

const tableSchema: Plugin<TableSchema> = {
  pdf: pdfRender,
  ui: uiRender,
  propPanel,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
};
export default tableSchema;
