import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender.js';
import { propPanel } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { TextSchema } from './types';

const textSchema: Plugin<TextSchema> = { pdf: pdfRender, ui: uiRender, propPanel };

export default textSchema;

export const readOnlyText: Plugin<TextSchema> = {
  pdf: textSchema.pdf,
  ui: textSchema.ui,
  propPanel: {
    ...textSchema.propPanel,
    defaultSchema: {
      ...textSchema.propPanel.defaultSchema,
      type: 'readOnlyText',
      readOnly: true,
      readOnlyValue: textSchema.propPanel.defaultValue,
    },
  },
};
