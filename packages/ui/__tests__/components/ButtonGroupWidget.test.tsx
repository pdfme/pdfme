import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { BLANK_PDF, type PropPanelWidgetProps, type SchemaForUI } from '@pdfme/common';
import ButtonGroupWidget from '../../src/components/Designer/RightSidebar/DetailView/ButtonGroupWidget';

const icon = '<svg xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" d="M1 1h10" /></svg>';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

const schema = (id: string, underline: boolean): SchemaForUI => ({
  content: '',
  height: 6,
  id,
  name: id,
  position: { x: 10, y: 20 },
  type: 'text',
  underline,
  width: 30,
});

const element = (id: string) => {
  const div = document.createElement('div');
  div.id = id;
  return div;
};

const renderButtonGroup = (schemas: SchemaForUI[]) => {
  const changeSchemas = vi.fn();
  const props = {
    activeElements: schemas.map(({ id }) => element(id)),
    activeSchema: schemas[0],
    basePdf: BLANK_PDF,
    changeSchemas,
    i18n: (key: string) => key,
    options: {},
    rootElement: document.createElement('div'),
    schema: {
      buttons: [{ key: 'underline', icon, type: 'boolean' }],
    },
    schemas,
    theme: {
      colorPrimary: '#1677ff',
      colorPrimaryBg: '#e6f4ff',
      colorWhite: '#ffffff',
    },
  } as PropPanelWidgetProps;

  return { ...render(<ButtonGroupWidget {...props} />), changeSchemas };
};

describe('ButtonGroupWidget', () => {
  it('turns a partial boolean selection on for every same-type schema', () => {
    const { container, changeSchemas } = renderButtonGroup([
      schema('field-1', true),
      schema('field-2', false),
    ]);

    fireEvent.click(container.querySelector('button')!);

    expect(changeSchemas).toHaveBeenCalledWith([
      { key: 'underline', value: true, schemaId: 'field-1' },
      { key: 'underline', value: true, schemaId: 'field-2' },
    ]);
  });
});
