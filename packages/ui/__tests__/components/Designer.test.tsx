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

test('Designer preserves scroll position when template is updated via prop change', async () => {
  // jsdom does not implement layout so scrollTop always reads 0.
  // We verify the scroll-restore mechanism by overriding scrollTop on the canvas
  // element so that it reports a non-zero value, then checking it is written back
  // to that value after the template prop changes.
  //
  // The root cause being tested: Paper returns null during the transient window
  // where pageSizes/backgrounds/schemasList are out of sync after a template update.
  // The browser collapses scrollable height to 0 and clamps scrollTop. The fix
  // saves scrollTop before the update and restores it once all three collections
  // are back in sync.
  setupUIMock();

  const template = getSampleTemplate();
  let currentScrollTop = 500; // simulate being scrolled to page 2+
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

  // Override scrollTop so the component reads 500 (simulating mid-page scroll)
  Object.defineProperty(canvas, 'scrollTop', {
    get: () => currentScrollTop,
    set: scrollTopSetter,
    configurable: true,
  });

  // Trigger a template update by changing the prop
  const updatedTemplate = {
    ...template,
    schemas: [
      [
        {
          ...template.schemas[0][0],
          content: 'updated content',
        },
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
    // The restorer should have written 500 back to scrollTop
    expect(scrollTopSetter).toHaveBeenCalledWith(500);
  });
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
