import type * as CSS from 'csstype';
import { Plugin } from '@pdfme/common';
import text from '../text';
import { TextSchema } from '../text/types';

interface Select extends TextSchema {
  options: string[];
}

// TODO 実装
const schema: Plugin<Select> = {
  ui: async (arg) => {
    const { schema, value, onChange, rootElement, mode } = arg;
    await text.ui(Object.assign(arg, { mode: 'viewer' }));

    if (mode !== 'viewer' && !(mode === 'form' && schema.readOnly)) {
      const selectElement = document.createElement('select');
      const selectElementStyle: CSS.Properties = {
        opacity: '0',
        position: 'absolute',
        zIndex: '1',
        width: '100%',
        height: '100%',
        top: '0',
        left: '0',
      };
      Object.assign(selectElement.style, selectElementStyle);
      selectElement.value = value;
      selectElement.addEventListener('change', (e) => {
        if (onChange && e.target instanceof HTMLSelectElement) {
          onChange && onChange({ key: 'content', value: e.target.value });
        }
      });

      selectElement.innerHTML = schema.options
        .map(
          (option) =>
            `<option ${value === option ? 'selected' : ''} value="${option}">${option}</option>`
        )
        .join('');
        // TODO mode === designerの時にクリックしても反応しない
      rootElement.appendChild(selectElement);
    }
  },
  pdf: text.pdf,
  propPanel: {
    ...text.propPanel,
    // TODO カスタマイズする。オプションを追加できるようにする
    schema: text.propPanel.schema,
    defaultSchema: {
      ...text.propPanel.defaultSchema,
      type: 'select',
      content: 'option1',
      options: ['', 'option1', 'option2', 'option3'],
    },
  },
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>',
};

export default schema;
