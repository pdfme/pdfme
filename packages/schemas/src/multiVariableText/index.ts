import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender.js';
import { propPanel } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { MultiVariableTextSchema } from './types';
import { Type } from 'lucide';
import { createSvgStr } from '../utils.js';

const schema: Plugin<MultiVariableTextSchema> = {
  pdf: pdfRender,
  ui: uiRender,
  propPanel,
  icon: createSvgStr(Type),
  uninterruptedEditMode: true,
};
export default schema;
