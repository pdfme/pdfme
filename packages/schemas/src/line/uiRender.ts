import type { LineSchema } from './types';
import { UIRenderProps } from '@pdfme/common';
import { DEFAULT_LINE_COLOR } from './constants.js';

export const uiRender = (arg: UIRenderProps<LineSchema>) => {
  const { schema, rootElement } = arg;
  const div = document.createElement('div');
  div.style.backgroundColor = schema.color ?? DEFAULT_LINE_COLOR;
  div.style.width = '100%';
  div.style.height = '100%';
  rootElement.appendChild(div);
};
