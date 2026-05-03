import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import Preview from '../../src/components/Preview';
import { I18nContext, FontContext, OptionsContext, PluginsRegistry } from '../../src/contexts';
import { i18n } from '../../src/i18n';
import { SELECTABLE_CLASSNAME } from '../../src/constants';
import {
  CUSTOM_A4_PDF,
  getDefaultFont,
  pluginRegistry,
  type Plugin,
  type Template,
} from '@pdfme/common';
import { normalizeElementIdsForSnapshot } from '../assets/normalizeSnapshot';
import { setupUIMock, getSampleTemplate } from '../assets/helper';
import { text, image } from '@pdfme/schemas';

const plugins = pluginRegistry({ text, image });

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
