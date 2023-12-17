import { Plugin, Schema } from '@pdfme/common';

interface Ellipse extends Schema {
  borderWidth: number;
  borderColor: string;
  borderOpacity: number;
  color: string;
}

export const ellipse: Plugin<Ellipse> = {
  ui: async (arg) => {
    // TODO IMPL
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';

    // borderWidth;
    // borderColor;
    // borderOpacity;
    // color;

    rootElement.appendChild(div);
  },
  pdf: async (arg) => {
    // TODO IMPL
    // https://pdf-lib.js.org/docs/api/classes/pdfpage#drawellipse
  },
  propPanel: {
    schema: {},
    defaultValue: '',
    defaultSchema: {
      type: 'ellipse',
      position: { x: 0, y: 0 },
      width: 62.5,
      height: 37.5,
      rotate: 0,
      opacity: 1,
      borderWidth: 5,
      borderColor: '#000000',
      borderOpacity: 0.75,
      color: '#ffffff',
      readOnly: true,
    },
  },
};
