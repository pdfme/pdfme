import { Plugin } from '@pdfme/common';
import { Schema } from '@pdfme/common';
import svg from '../graphics/svg';
import { isEditable } from '../utils.js';

const checkedIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-check"><rect width="18" height="18" x="3" y="3" rx="0"/><path d="m9 12 2 2 4-4"/></svg>';
const uncheckedIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square"><rect width="18" height="18" x="3" y="3" rx="0"/></svg>';

interface Checkbox extends Schema {}

const schema: Plugin<Checkbox> = {
  ui: async (arg) => {
    const { schema, value, onChange, rootElement, mode } = arg;
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';

    if (isEditable(mode, schema)) {
      container.addEventListener('click', () => {
        onChange && onChange({ key: 'content', value: value === 'true' ? '' : 'true' });
      });
    }

    await svg.ui({
      ...arg,
      rootElement: container,
      mode: 'viewer',
      value: value === 'true' ? checkedIcon : uncheckedIcon,
    });

    rootElement.appendChild(container);
  },
  pdf: (arg) =>
    svg.pdf(Object.assign(arg, { value: arg.value === 'true' ? checkedIcon : uncheckedIcon })),
  propPanel: {
    schema: {},
    defaultSchema: {
      name: '',
      type: 'checkbox',
      content: 'true',
      position: { x: 0, y: 0 },
      width: 8,
      height: 8,
    },
  },
  icon: checkedIcon,
};

export default schema;
