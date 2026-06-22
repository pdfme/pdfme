import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import Preview from '../../src/components/Preview';
import { I18nContext, FontContext, OptionsContext, PluginsRegistry } from '../../src/contexts';
import { i18n } from '../../src/i18n';
import * as hooks from '../../src/hooks';
import { SELECTABLE_CLASSNAME } from '../../src/constants';
import {
  CUSTOM_A4_PDF,
  PAGE_SIZE_PRESETS,
  ZOOM,
  getDefaultFont,
  pluginRegistry,
  type Plugin,
  type Template,
} from '@pdfme/common';
import { normalizeElementIdsForSnapshot } from '../assets/normalizeSnapshot';
import {
  getSampleTemplate,
  getTwoPageTemplate,
  mockClientSizeFromStyle,
  setupUIMock,
} from '../assets/helper';
import { text, image } from '@pdfme/schemas';

const plugins = pluginRegistry({ text, image });

const getScrollContainer = (container: HTMLElement) => {
  const scrollContainer = Array.from(container.querySelectorAll('div')).find(
    (element) => element.style.overflow === 'auto' && element.style.position === 'relative',
  );
  if (!(scrollContainer instanceof HTMLDivElement)) {
    throw new Error('Scroll container was not found');
  }
  return scrollContainer;
};

let restoreClientSizeMock: (() => void) | undefined;

afterEach(() => {
  restoreClientSizeMock?.();
  restoreClientSizeMock = undefined;
});

const createTouchList = (items: Array<{ clientX: number; clientY: number }>) =>
  Object.assign(items, {
    item: (index: number) => items[index] ?? null,
  }) as unknown as TouchList;

const dispatchTouchEvent = (
  element: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend',
  touches: TouchList,
) => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: touches });
  element.dispatchEvent(event);
};

const getFormReflowTemplate = (basePdf: Template['basePdf']): Template => ({
  basePdf,
  schemas: [
    [
      {
        name: 'tasks',
        type: 'list',
        content: '[]',
        position: { x: 10, y: 20 },
        width: 60,
        height: 10,
      },
      {
        name: 'footer',
        type: 'text',
        content: '',
        position: { x: 10, y: 35 },
        width: 60,
        height: 10,
        fontSize: 10,
      },
    ],
  ],
});

const resizingListPlugin: Plugin = {
  pdf: vi.fn(),
  ui: ({ rootElement, onChange }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'grow list';
    button.addEventListener('click', () => onChange?.({ key: 'height', value: 30 }));
    rootElement.appendChild(button);
  },
  propPanel: {
    schema: {},
    defaultSchema: {
      name: 'tasks',
      type: 'list',
      content: '[]',
      position: { x: 0, y: 0 },
      width: 60,
      height: 10,
    },
  },
};

const formReflowPlugins = pluginRegistry({ list: resizingListPlugin, text });

const getTop = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) throw new Error('Element was not found');
  return Number.parseFloat(element.style.top);
};

const getSelectableElement = (container: HTMLElement, title: string) => {
  const element = Array.from(container.getElementsByClassName(SELECTABLE_CLASSNAME)).find(
    (element) => element.getAttribute('title') === title,
  );
  if (!(element instanceof HTMLElement)) throw new Error(`${title} element was not found`);
  return element;
};

test('Preview(as Viewer) snapshot', async () => {
  setupUIMock();
  let container: HTMLElement = document.createElement('a');
  act(() => {
    const { container: c } = render(
      <I18nContext.Provider value={i18n}>
        <FontContext.Provider value={getDefaultFont()}>
          <PluginsRegistry.Provider value={plugins}>
            <Preview
              template={getSampleTemplate()}
              inputs={[{ field1: 'field1', field2: 'field2' }]}
              size={{ width: 1200, height: 1200 }}
            />
          </PluginsRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>,
    );
    container = c;
  });

  await waitFor(() => {
    const selectableElements = container.getElementsByClassName(SELECTABLE_CLASSNAME);
    const renderedElements = container.querySelectorAll('[data-pdfme-render-ready="true"]');
    expect(selectableElements.length).toBeGreaterThan(0);
    expect(renderedElements.length).toBe(selectableElements.length);
  });
  expect(normalizeElementIdsForSnapshot(container)).toMatchSnapshot();
});

test('Preview(as Form) snapshot', async () => {
  setupUIMock();
  let container: HTMLElement = document.createElement('a');
  act(() => {
    const { container: c } = render(
      <I18nContext.Provider value={i18n}>
        <FontContext.Provider value={getDefaultFont()}>
          <PluginsRegistry.Provider value={plugins}>
            <Preview
              template={getSampleTemplate()}
              inputs={[{ field1: 'field1', field2: 'field2' }]}
              size={{ width: 1200, height: 1200 }}
              onChangeInput={console.log}
            />
          </PluginsRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>,
    );
    container = c;
  });

  await waitFor(() => {
    const selectableElements = container.getElementsByClassName(SELECTABLE_CLASSNAME);
    const renderedElements = container.querySelectorAll('[data-pdfme-render-ready="true"]');
    expect(selectableElements.length).toBeGreaterThan(0);
    expect(renderedElements.length).toBe(selectableElements.length);
  });
  expect(normalizeElementIdsForSnapshot(container)).toMatchSnapshot();
});

test('Preview(as Form) highlights the active editable renderer', async () => {
  setupUIMock();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <Preview
            template={getSampleTemplate()}
            inputs={[{ field1: 'field1', field2: 'field2' }]}
            size={{ width: 1200, height: 1200 }}
            onChangeInput={vi.fn()}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    const selectableElements = container.getElementsByClassName(SELECTABLE_CLASSNAME);
    const renderedElements = container.querySelectorAll('[data-pdfme-render-ready="true"]');
    expect(selectableElements.length).toBeGreaterThan(0);
    expect(renderedElements.length).toBe(selectableElements.length);
  });

  const field1 = getSelectableElement(container, 'field1');
  const field2 = getSelectableElement(container, 'field2');

  expect(field1.style.boxShadow).toBe('');
  expect(field2.style.boxShadow).toBe('');

  fireEvent.click(field1);

  await waitFor(() => {
    expect(field1.style.boxShadow).not.toBe('');
    expect(field2.style.boxShadow).toBe('');
  });

  fireEvent.click(field2);

  await waitFor(() => {
    expect(field1.style.boxShadow).toBe('');
    expect(field2.style.boxShadow).not.toBe('');
  });

  fireEvent.pointerDown(getScrollContainer(container));

  await waitFor(() => {
    expect(field2.style.boxShadow).toBe('');
  });
});

test('Preview skips background refresh when dynamic template is unchanged', async () => {
  const refresh = vi.fn(() => Promise.resolve());
  vi.spyOn(hooks, 'useUIPreProcessor').mockImplementation(() => ({
    backgrounds: ['data:image/png;base64,a...'],
    pageSizes: [PAGE_SIZE_PRESETS.A4],
    baseScale: 1,
    scale: 1,
    error: null,
    refresh,
  }));

  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <Preview
            template={{ ...getSampleTemplate(), basePdf: CUSTOM_A4_PDF }}
            inputs={[{ field1: 'field1', field2: 'field2' }]}
            size={{ width: 1200, height: 1200 }}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  expect(refresh).not.toHaveBeenCalled();
});

test('Preview(as Form) pushes lower schemas after list height changes for blank PDFs', async () => {
  setupUIMock();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={formReflowPlugins}>
          <Preview
            template={getFormReflowTemplate({
              width: 100,
              height: 100,
              padding: [10, 10, 10, 10],
            })}
            inputs={[{ tasks: '', footer: 'Footer' }]}
            size={{ width: 1200, height: 1200 }}
            onChangeInput={vi.fn()}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBe(2);
  });

  const footer = container.querySelector('[title="footer"]');
  const topBefore = getTop(footer);
  const growButton = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === 'grow list',
  );
  if (!growButton) throw new Error('Grow list button was not found');

  fireEvent.click(growButton);

  await waitFor(() => {
    expect(getTop(footer)).toBeGreaterThan(topBefore);
  });
});

test('Preview(as Form) does not push lower schemas after list height changes for custom PDFs', async () => {
  setupUIMock();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={formReflowPlugins}>
          <Preview
            template={getFormReflowTemplate(CUSTOM_A4_PDF)}
            inputs={[{ tasks: '', footer: 'Footer' }]}
            size={{ width: 1200, height: 1200 }}
            onChangeInput={vi.fn()}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBe(2);
  });

  const footer = container.querySelector('[title="footer"]');
  const topBefore = getTop(footer);
  const growButton = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === 'grow list',
  );
  if (!growButton) throw new Error('Grow list button was not found');

  fireEvent.click(growButton);

  await waitFor(() => {
    expect(getTop(footer)).toBe(topBefore);
  });
});

test('Preview keeps toolbar zoom interactive when options.zoomLevel is only an initial value', async () => {
  setupUIMock();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <OptionsContext.Provider value={{ zoomLevel: 1 }}>
            <Preview
              template={getSampleTemplate()}
              inputs={[{ field1: 'field1', field2: 'field2' }]}
              size={{ width: 1200, height: 1200 }}
            />
          </OptionsContext.Provider>
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  expect(container).toHaveTextContent('100%');
  fireEvent.click(container.querySelector('.pdfme-ui-zoom-in')!);

  await waitFor(() => {
    expect(container).toHaveTextContent('125%');
  });
});

test('Preview does not reapply options.zoomLevel when changing pages', async () => {
  setupUIMock(2);
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <OptionsContext.Provider value={{ zoomLevel: 1 }}>
            <Preview
              template={getTwoPageTemplate()}
              inputs={[
                {
                  field1: 'field1',
                  field2: 'field2',
                  field1Page2: 'field1Page2',
                  field2Page2: 'field2Page2',
                },
              ]}
              size={{ width: 1200, height: 1200 }}
            />
          </OptionsContext.Provider>
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  fireEvent.click(container.querySelector('.pdfme-ui-zoom-in')!);
  await waitFor(() => {
    expect(container).toHaveTextContent('125%');
  });

  fireEvent.click(container.querySelector('.pdfme-ui-page-next')!);
  await waitFor(() => {
    expect(container).toHaveTextContent('2/2');
    expect(container).toHaveTextContent('125%');
  });
});

test('Preview toolbar can wrap controls on narrow viewports', async () => {
  setupUIMock(2);
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <Preview
            template={getTwoPageTemplate()}
            inputs={[
              {
                field1: 'field1',
                field2: 'field2',
                field1Page2: 'field1Page2',
                field2Page2: 'field2Page2',
              },
            ]}
            size={{ width: 220, height: 640 }}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  const controlBar = container.querySelector('.pdfme-ui-control-bar') as HTMLElement;
  const toolbarWrapper = controlBar.parentElement as HTMLElement;
  const zoomGroup = container.querySelector('.pdfme-ui-zoom > div') as HTMLElement;
  const zoomLabel = container.querySelector('.pdfme-ui-zoom .ant-typography') as HTMLElement;
  const prevButton = container.querySelector('.pdfme-ui-page-prev') as HTMLElement;

  expect(toolbarWrapper.style.boxSizing).toBe('border-box');
  expect(controlBar.style.maxWidth).toBe('100%');
  expect(controlBar.style.flexWrap).toBe('wrap');
  expect(controlBar.style.minHeight).toBe('40px');
  expect(controlBar.style.height).toBe('');
  expect(zoomGroup.style.flexWrap).toBe('wrap');
  expect(zoomLabel.style.whiteSpace).toBe('nowrap');
  expect(prevButton.style.width).toBe('32px');
});

test('Preview toolbar fit width updates the zoom level', async () => {
  setupUIMock();
  restoreClientSizeMock = mockClientSizeFromStyle();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <Preview
            template={getSampleTemplate()}
            inputs={[{ field1: 'field1', field2: 'field2' }]}
            size={{ width: 1200, height: 1200 }}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  fireEvent.click(container.querySelector('.pdfme-ui-fit-width')!);

  const expectedZoom = Math.round((1160 / (PAGE_SIZE_PRESETS.A4.width * ZOOM)) * 100);
  await waitFor(() => {
    expect(container).toHaveTextContent(`${expectedZoom}%`);
  });
});

test('Preview toolbar fit height returns to 100 percent', async () => {
  setupUIMock();
  restoreClientSizeMock = mockClientSizeFromStyle();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <Preview
            template={getSampleTemplate()}
            inputs={[{ field1: 'field1', field2: 'field2' }]}
            size={{ width: 1200, height: 1200 }}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  fireEvent.click(container.querySelector('.pdfme-ui-zoom-in')!);
  await waitFor(() => {
    expect(container).toHaveTextContent('125%');
  });

  fireEvent.click(container.querySelector('.pdfme-ui-fit-height')!);
  await waitFor(() => {
    expect(container).toHaveTextContent('100%');
  });
});

test('Preview zooms with ctrl wheel but not ordinary wheel', async () => {
  setupUIMock();
  restoreClientSizeMock = mockClientSizeFromStyle();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <Preview
            template={getSampleTemplate()}
            inputs={[{ field1: 'field1', field2: 'field2' }]}
            size={{ width: 1200, height: 1200 }}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  const scrollContainer = getScrollContainer(container);
  fireEvent.wheel(scrollContainer, { deltaY: -100 });
  expect(container).toHaveTextContent('100%');

  fireEvent.wheel(scrollContainer, { deltaY: -100, ctrlKey: true, clientX: 100, clientY: 100 });

  await waitFor(() => {
    expect(container).toHaveTextContent('149%');
  });
});

test('Preview zooms with two-finger touch but not one-finger touch', async () => {
  setupUIMock();
  restoreClientSizeMock = mockClientSizeFromStyle();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={plugins}>
          <Preview
            template={getSampleTemplate()}
            inputs={[{ field1: 'field1', field2: 'field2' }]}
            size={{ width: 1200, height: 1200 }}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  const scrollContainer = getScrollContainer(container);
  dispatchTouchEvent(scrollContainer, 'touchstart', createTouchList([{ clientX: 0, clientY: 0 }]));
  dispatchTouchEvent(scrollContainer, 'touchmove', createTouchList([{ clientX: 0, clientY: 50 }]));
  expect(container).toHaveTextContent('100%');

  dispatchTouchEvent(
    scrollContainer,
    'touchstart',
    createTouchList([
      { clientX: 0, clientY: 0 },
      { clientX: 100, clientY: 0 },
    ]),
  );
  dispatchTouchEvent(
    scrollContainer,
    'touchmove',
    createTouchList([
      { clientX: 0, clientY: 0 },
      { clientX: 125, clientY: 0 },
    ]),
  );

  await waitFor(() => {
    expect(container).toHaveTextContent('149%');
  });
});
