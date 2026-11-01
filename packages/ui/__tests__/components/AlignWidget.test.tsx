import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { BLANK_PDF, type PropPanelWidgetProps, type SchemaForUI } from '@pdfme/common';
import AlignWidget from '../../src/components/Designer/RightSidebar/DetailView/AlignWidget';
import { DESIGNER_CLASSNAME } from '../../src/constants';

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

// antd Button schedules state updates on timers after a click. Flush them while the
// component is still mounted so none fire after jsdom is torn down.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  cleanup();
  vi.useRealTimers();
});

const schema = (id: string, x: number, rotate = 0): SchemaForUI => ({
  content: '',
  height: 20,
  id,
  name: id,
  position: { x, y: 100 },
  rotate,
  type: 'text',
  width: 100,
});

const element = (id: string) => {
  const div = document.createElement('div');
  div.id = id;
  return div;
};

const renderAlign = (schemas: SchemaForUI[]) => {
  const changeSchemas = vi.fn();
  const props = {
    activeElements: schemas.map(({ id }) => element(id)),
    activeSchema: schemas[0],
    basePdf: BLANK_PDF,
    changeSchemas,
    i18n: (key: string) => key,
    options: {},
    pageSize: { width: 210, height: 297 },
    rootElement: document.createElement('div'),
    schema: { title: 'align' },
    schemas,
    theme: {},
  } as unknown as PropPanelWidgetProps;

  const { container } = render(<AlignWidget {...props} />);
  const click = (id: string) =>
    act(() => {
      fireEvent.click(container.querySelector(`.${DESIGNER_CLASSNAME}align-${id}`)!);
      vi.runOnlyPendingTimers();
    });
  return { click, changeSchemas };
};

describe('AlignWidget with rotated fields (#1683)', () => {
  it('aligns a single rotated field by its visible edge', () => {
    const { click, changeSchemas } = renderAlign([schema('r', 50, 90)]);

    click('left');
    click('right');
    click('top');

    expect(changeSchemas.mock.calls).toEqual([
      [[{ key: 'position.x', value: -40, schemaId: 'r' }]],
      [[{ key: 'position.x', value: 150, schemaId: 'r' }]],
      [[{ key: 'position.y', value: 40, schemaId: 'r' }]],
    ]);
  });

  it('aligns mixed rotated and unrotated fields on their visible edges', () => {
    const { click, changeSchemas } = renderAlign([schema('u', 30), schema('r', 0, 90)]);

    click('left');

    // The rotated field's visible left edge is x + 40, so it shifts to -10 to meet x = 30.
    expect(changeSchemas).toHaveBeenCalledWith([
      { key: 'position.x', value: 30, schemaId: 'u' },
      { key: 'position.x', value: -10, schemaId: 'r' },
    ]);
  });

  it('distributes by visible widths', () => {
    const { click, changeSchemas } = renderAlign([
      schema('a', 0),
      schema('r', 100, 90),
      schema('b', 110),
    ]);

    click('horizontal');

    // Visible spans: a [0,100], r [140,160], b [110,210]; total 210, gaps of (210 - 220) / 2.
    expect(changeSchemas).toHaveBeenCalledWith([
      { key: 'position.x', value: 0, schemaId: 'a' },
      { key: 'position.x', value: 55, schemaId: 'r' },
      { key: 'position.x', value: 110, schemaId: 'b' },
    ]);
  });
});
