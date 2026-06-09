import * as hooks from '../../src/hooks';
import * as helper from '../../src/helper';
import { BLANK_A4_PDF, BLANK_PDF, PAGE_SIZE_PRESETS, Template } from '@pdfme/common';

const restorePrototypeDescriptor = (
  property: 'clientWidth' | 'clientHeight',
  descriptor?: PropertyDescriptor,
) => {
  if (descriptor) {
    Object.defineProperty(HTMLElement.prototype, property, descriptor);
    return;
  }
  Reflect.deleteProperty(HTMLElement.prototype, property);
};

export const mockClientSizeFromStyle = () => {
  const clientWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientWidth',
  );
  const clientHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientHeight',
  );

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return Number.parseFloat(this.style.width) || 1200;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return Number.parseFloat(this.style.height) || 1200;
    },
  });

  return () => {
    restorePrototypeDescriptor('clientWidth', clientWidthDescriptor);
    restorePrototypeDescriptor('clientHeight', clientHeightDescriptor);
  };
};

export const setupUIMock = (pageCount = 1) => {
  const backgrounds = Array.from({ length: pageCount }, () => 'data:image/png;base64,a...');
  const pageSizes = Array.from({ length: pageCount }, () => PAGE_SIZE_PRESETS.A4);
  const mock = vi.spyOn(hooks, 'useUIPreProcessor');
  mock.mockImplementation(() => ({
    backgrounds,
    pageSizes,
    baseScale: 1,
    scale: 1,
    error: null,
    refresh: () => Promise.resolve(),
  }));
  vi.spyOn(helper, 'uuid')
    .mockReturnValueOnce('1')
    .mockReturnValueOnce('2')
    .mockReturnValueOnce('3')
    .mockReturnValueOnce('4')
    .mockReturnValueOnce('5');
  const FontFace = vi.fn().mockReturnValue({ load: () => Promise.resolve() });
  global.window.FontFace = FontFace;
};

export const getSampleTemplate = (): Template => ({
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'field1',
        type: 'text',
        content: 'bb',
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 30,
        characterSpacing: 0,
        lineHeight: 1,
      },
      {
        name: 'field2',
        type: 'image',
        content: 'aaaaaaaaaaaa',
        position: { x: 20, y: 35 },
        width: 100,
        height: 40,
      },
    ],
  ],
});

export const getTwoPageTemplate = (): Template => {
  const template = getSampleTemplate();
  const secondPage = template.schemas[0].map((schema) => ({
    ...schema,
    name: `${schema.name}Page2`,
    position: { ...schema.position },
  }));

  return {
    ...template,
    basePdf: BLANK_A4_PDF,
    schemas: [template.schemas[0], secondPage],
  };
};
