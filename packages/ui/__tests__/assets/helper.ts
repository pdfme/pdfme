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

export const getUnbalancedPlaceholderTemplate = (readonlyContent = '{{1}'): Template => ({
  basePdf: {
    ...BLANK_A4_PDF,
    staticSchema: [
      {
        name: 'staticLabel',
        type: 'text',
        content: 'static {1+1} {{1}',
        position: { x: 10, y: 250 },
        width: 120,
        height: 10,
        readOnly: true,
        fontSize: 10,
      },
    ],
  },
  schemas: [
    [
      {
        name: 'readonlyExpr',
        type: 'text',
        content: readonlyContent,
        readOnly: true,
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 13,
        characterSpacing: 0,
        lineHeight: 1,
      },
      {
        name: 'editableField',
        type: 'text',
        content: '{{1}',
        position: { x: 20, y: 50 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 13,
        characterSpacing: 0,
        lineHeight: 1,
      },
      {
        name: 'validExpr',
        type: 'text',
        content: '{1+1}',
        readOnly: true,
        position: { x: 20, y: 80 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 13,
        characterSpacing: 0,
        lineHeight: 1,
      },
    ],
  ],
});

const getMultiVariableTextField = (name: string, y: number, content: string, text: string) => ({
  name,
  type: 'multiVariableText',
  content,
  text,
  variables: ['firstName', 'lastName'],
  position: { x: 20, y },
  width: 100,
  height: 15,
  alignment: 'left' as const,
  verticalAlignment: 'top' as const,
  fontSize: 13,
  characterSpacing: 0,
  lineHeight: 1,
  fontColor: '#000000',
  backgroundColor: '',
});

export const getReadOnlyMvtTemplate = (): Template => ({
  basePdf: {
    ...BLANK_A4_PDF,
    staticSchema: [
      {
        ...getMultiVariableTextField(
          'staticFullName',
          10,
          JSON.stringify({ firstName: 'John', lastName: 'Smith' }),
          '{lastName}, {firstName}',
        ),
        readOnly: true,
      },
    ],
  },
  schemas: [
    [
      {
        ...getMultiVariableTextField(
          'fullName',
          40,
          JSON.stringify({ firstName: 'John', lastName: 'Smith' }),
          '{lastName}, {firstName}',
        ),
        readOnly: true,
      },
      {
        ...getMultiVariableTextField(
          'info',
          70,
          JSON.stringify({ InvoiceNo: '12345', Date: '16 June 2025' }),
          'Invoice No.{InvoiceNo}',
        ),
        variables: ['InvoiceNo', 'Date'],
        readOnly: false,
      },
    ],
  ],
});

export const getStaticMvtTemplate = (): Template => ({
  basePdf: {
    ...BLANK_A4_PDF,
    staticSchema: [
      getMultiVariableTextField(
        'staticMvt',
        10,
        JSON.stringify({ firstName: 'John', lastName: 'Smith' }),
        '{lastName}, {firstName}',
      ),
    ],
  },
  schemas: [
    [
      getMultiVariableTextField(
        'pageMvt',
        40,
        JSON.stringify({ firstName: 'Ada', lastName: 'Lovelace' }),
        '{firstName} {lastName}',
      ),
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
