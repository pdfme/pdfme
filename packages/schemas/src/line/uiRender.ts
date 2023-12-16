import type { LineSchema } from './types';
import { UIRenderProps } from '@pdfme/common';

export const uiRender = async (arg: UIRenderProps<LineSchema>) => {
  const { schema, rootElement } = arg;
  const div = document.createElement('div');
  div.style.backgroundColor = schema.color;
  div.style.width = '100%';
  div.style.height = '100%';
  if (schema.opacity !== undefined) {
    div.style.opacity = `${schema.opacity}`;
  }
  rootElement.appendChild(div);
};
