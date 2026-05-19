import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import Designer from '../../src/components/Designer/index.js';
import { I18nContext, FontContext, OptionsContext, PluginsRegistry } from '../../src/contexts';
import { i18n } from '../../src/i18n';
import { DESIGNER_CLASSNAME, RIGHT_SIDEBAR_WIDTH, SELECTABLE_CLASSNAME } from '../../src/constants';
import { getDefaultFont, pluginRegistry } from '@pdfme/common';
import { normalizeElementIdsForSnapshot } from '../assets/normalizeSnapshot';
import { setupUIMock, getSampleTemplate } from '../assets/helper';
import { text, image } from '@pdfme/schemas';

const plugins = { text, image };

test('Designer snapshot', async () => {
  setupUIMock();
  let container: HTMLElement = document.createElement('a');
  act(() => {
    const { container: c } = render(
      <I18nContext.Provider value={i18n}>
        <FontContext.Provider value={getDefaultFont()}>
          <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
            <Designer
              template={getSampleTemplate()}
              onSaveTemplate={console.log}
              onChangeTemplate={console.log}
              size={{ width: 1200, height: 1200 }}
              onPageCursorChange={(pageCursor, totalPages) => {
                console.log(pageCursor, totalPages);
              }}
            />
          </PluginsRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>
    );
    container = c;
  });

  await waitFor(() => container.getElementsByClassName(SELECTABLE_CLASSNAME).length > 0);
  expect(normalizeElementIdsForSnapshot(container)).toMatchSnapshot();
});

test('Designer keeps toolbar zoom interactive when options.zoomLevel is only an initial value', async () => {
  setupUIMock();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
          <OptionsContext.Provider value={{ zoomLevel: 1 }}>
            <Designer
              template={getSampleTemplate()}
              onSaveTemplate={console.log}
              onChangeTemplate={console.log}
              size={{ width: 1200, height: 1200 }}
              onPageCursorChange={() => undefined}
            />
          </OptionsContext.Provider>
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.getElementsByClassName(SELECTABLE_CLASSNAME).length).toBeGreaterThan(0);
  });

  expect(container).toHaveTextContent('100%');
  fireEvent.click(container.querySelector('.pdfme-ui-zoom-in')!);

  await waitFor(() => {
    expect(container).toHaveTextContent('125%');
  });
});

test('Designer restores scroll position when updateTemplate is called while scrolled', async () => {
  // jsdom has no layout engine so we use Object.defineProperty to simulate a
  // non-zero scrollTop and verify the restore effect writes it back.
  setupUIMock();

  const template = getSampleTemplate();
  let currentScrollTop = 500;
  const scrollTopSetter = vi.fn((v: number) => {
    currentScrollTop = v;
  });

  const { container, rerender } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
          <Designer
            template={template}
            onSaveTemplate={console.log}
            onChangeTemplate={console.log}
            size={{ width: 1200, height: 1200 }}
            onPageCursorChange={() => undefined}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => container.getElementsByClassName(SELECTABLE_CLASSNAME).length > 0);

  const canvas = container.querySelector('.pdfme-designer-canvas') as HTMLDivElement;
  expect(canvas).not.toBeNull();

  Object.defineProperty(canvas, 'scrollTop', {
    get: () => currentScrollTop,
    set: scrollTopSetter,
    configurable: true,
  });

  const updatedTemplate = {
    ...template,
    schemas: [
      [
        { ...template.schemas[0][0], content: 'updated' },
        template.schemas[0][1],
      ],
    ],
  };

  await act(async () => {
    rerender(
      <I18nContext.Provider value={i18n}>
        <FontContext.Provider value={getDefaultFont()}>
          <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
            <Designer
              template={updatedTemplate}
              onSaveTemplate={console.log}
              onChangeTemplate={console.log}
              size={{ width: 1200, height: 1200 }}
              onPageCursorChange={() => undefined}
            />
          </PluginsRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>,
    );
  });

  await waitFor(() => {
    expect(scrollTopSetter).toHaveBeenCalledWith(500);
  });
});

test('Designer does not flash old scroll position when adding a page', async () => {
  // Uses a BlankPdf basePdf because page manipulation is only enabled when isBlankPdf returns true.
  setupUIMock();

  const template = {
    basePdf: { width: 210, height: 297, padding: [0, 0, 0, 0] as [number, number, number, number] },
    schemas: getSampleTemplate().schemas,
  };
  let currentScrollTop = 500;
  const scrollTopSetter = vi.fn((v: number) => {
    currentScrollTop = v;
  });

  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
          <Designer
            template={template}
            onSaveTemplate={console.log}
            onChangeTemplate={console.log}
            size={{ width: 1200, height: 1200 }}
            onPageCursorChange={() => undefined}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => container.getElementsByClassName(SELECTABLE_CLASSNAME).length > 0);

  const canvas = container.querySelector('.pdfme-designer-canvas') as HTMLDivElement;
  expect(canvas).not.toBeNull();

  Object.defineProperty(canvas, 'scrollTop', {
    get: () => currentScrollTop,
    set: scrollTopSetter,
    configurable: true,
  });

  // Open the context menu (the "..." Ellipsis button)
  const contextMenuButton = container.querySelector('.pdfme-ui-context-menu') as HTMLElement;
  expect(contextMenuButton).not.toBeNull();
  await act(async () => {
    fireEvent.click(contextMenuButton);
  });

  // The Dropdown renders its menu into a portal — search document.body for the item
  const addPageItem = await waitFor(() => {
    const el = Array.from(document.querySelectorAll('[role="menuitem"]')).find((e) =>
      e.textContent?.includes('Add Page After'),
    );
    expect(el).not.toBeNull();
    return el as HTMLElement;
  });

  await act(async () => {
    fireEvent.click(addPageItem);
  });

  // Wait for updatePage's setTimeout to fire (sets scroll to the new page offset),
  // then confirm the restore effect never wrote the old offset back.
  await waitFor(() => expect(scrollTopSetter).toHaveBeenCalled());
  expect(scrollTopSetter).not.toHaveBeenCalledWith(500);
});

test('Designer keeps sidebar toggle interactive when options.sidebarOpen is only an initial value', async () => {
  setupUIMock();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
          <OptionsContext.Provider value={{ sidebarOpen: true }}>
            <Designer
              template={getSampleTemplate()}
              onSaveTemplate={console.log}
              onChangeTemplate={console.log}
              size={{ width: 1200, height: 1200 }}
              onPageCursorChange={() => undefined}
            />
          </OptionsContext.Provider>
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  const sidebar = container.querySelector(`.${DESIGNER_CLASSNAME}right-sidebar`) as HTMLDivElement;
  await waitFor(() => {
    expect(sidebar).toBeInTheDocument();
    expect(sidebar.style.width).toBe(`${RIGHT_SIDEBAR_WIDTH}px`);
  });

  fireEvent.click(container.querySelector(`.${DESIGNER_CLASSNAME}sidebar-toggle`)!);

  await waitFor(() => {
    expect(sidebar.style.width).toBe('0px');
  });
});
