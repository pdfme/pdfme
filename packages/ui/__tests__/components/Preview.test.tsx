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
  setDynamicContainerMetadata,
  type Plugin,
  type Template,
} from '@pdfme/common';
import { normalizeElementIdsForSnapshot } from '../assets/normalizeSnapshot';
import { setupUIMock, getSampleTemplate } from '../assets/helper';
import { text, image, rectangle } from '@pdfme/schemas';

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

const getHeight = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) throw new Error('Element was not found');
  return Number.parseFloat(element.style.height);
};

const getDynamicContainerFormTemplate = (): Template => {
  const box = {
    name: 'box',
    type: 'rectangle',
    position: { x: 10, y: 20 },
    width: 60,
    height: 12,
    readOnly: true,
    color: '#f8fafc',
  };

  setDynamicContainerMetadata(box, { childNames: ['notes'], paddingBottom: 2 });

  return {
    basePdf: {
      width: 100,
      height: 200,
      padding: [10, 10, 10, 10],
    },
    schemas: [
      [
        box,
        {
          name: 'notes',
          type: 'text',
          content: '',
          position: { x: 12, y: 22 },
          width: 26,
          height: 6,
          fontSize: 10,
          lineHeight: 1,
          overflow: 'expand',
        },
        {
          name: 'footer',
          type: 'text',
          content: 'Footer',
          position: { x: 10, y: 36 },
          width: 60,
          height: 6,
          fontSize: 10,
        },
      ],
    ],
  };
};

const dynamicContainerTextPlugin: Plugin = {
  pdf: vi.fn(),
  ui: ({ rootElement, schema, value, onChange }) => {
    rootElement.textContent = value;
    if (schema.name !== 'notes') return;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'grow notes';
    button.addEventListener('click', () =>
      onChange?.({
        key: 'content',
        value: 'This is a much longer note that should wrap across several lines. '.repeat(3),
      }),
    );
    rootElement.appendChild(button);
  },
  propPanel: {
    schema: {},
    defaultSchema: {
      name: 'notes',
      type: 'text',
      content: '',
      position: { x: 0, y: 0 },
      width: 60,
      height: 10,
    },
  },
};

const dynamicContainerFormPlugins = pluginRegistry({
  text: dynamicContainerTextPlugin,
  rectangle,
});

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

test('Preview(as Form) grows dynamic container decorations after text input changes', async () => {
  setupUIMock();
  const onChangeInput = vi.fn();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={dynamicContainerFormPlugins}>
          <Preview
            template={getDynamicContainerFormTemplate()}
            inputs={[{ notes: 'Short note', footer: 'Footer' }]}
            size={{ width: 1200, height: 1200 }}
            onChangeInput={onChangeInput}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBe(3);
  });

  const box = container.querySelector('[title="box"]');
  const footer = container.querySelector('[title="footer"]');
  const boxHeightBefore = getHeight(box);
  const footerTopBefore = getTop(footer);
  const growButton = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === 'grow notes',
  );
  if (!growButton) throw new Error('Grow notes button was not found');

  fireEvent.click(growButton);

  await waitFor(() => {
    expect(onChangeInput).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, name: 'notes' }),
    );
    expect(getHeight(container.querySelector('[title="box"]'))).toBeGreaterThan(boxHeightBefore);
    expect(getTop(container.querySelector('[title="footer"]'))).toBeGreaterThan(footerTopBefore);
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
