import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender.js';
import { propPanel } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { RichTextSchema } from './types';
import { LetterText } from 'lucide';
import { createSvgStr } from '../utils.js';

const richTextSchema: Plugin<RichTextSchema> = {
  pdf: pdfRender,
  ui: uiRender,
  propPanel,
  icon: createSvgStr(LetterText),
};

export default richTextSchema;
