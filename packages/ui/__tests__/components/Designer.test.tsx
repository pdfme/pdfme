import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import Designer from '../../src/components/Designer/index.js';
import { I18nContext, FontContext, OptionsContext, PluginsRegistry } from '../../src/contexts';
import { i18n } from '../../src/i18n';
import { DESIGNER_CLASSNAME, RIGHT_SIDEBAR_WIDTH, SELECTABLE_CLASSNAME } from '../../src/constants';
import { getDefaultFont, PAGE_SIZE_PRESETS, pluginRegistry, ZOOM } from '@pdfme/common';
import { normalizeElementIdsForSnapshot } from '../assets/normalizeSnapshot';
import {
  getSampleTemplate,
  getTwoPageTemplate,
  mockClientSizeFromStyle,
  setupUIMock,
} from '../assets/helper';
import { text, image } from '@pdfme/schemas';

const plugins = { text, image };

let restoreClientSizeMock: (() => void) | undefined;

afterEach(() => {
  restoreClientSizeMock?.();
  restoreClientSizeMock = undefined;
});

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
      </I18nContext.Provider>,
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

test('Designer does not reapply options.zoomLevel when changing pages', async () => {
  setupUIMock(2);
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
          <OptionsContext.Provider value={{ zoomLevel: 1 }}>
            <Designer
              template={getTwoPageTemplate()}
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

test('Designer toolbar fit width updates the zoom level', async () => {
  setupUIMock();
  restoreClientSizeMock = mockClientSizeFromStyle();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
          <Designer
            template={getSampleTemplate()}
            onSaveTemplate={console.log}
            onChangeTemplate={console.log}
            size={{ width: 1200, height: 1200 }}
            onPageCursorChange={() => undefined}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.getElementsByClassName(SELECTABLE_CLASSNAME).length).toBeGreaterThan(0);
  });

  fireEvent.click(container.querySelector('.pdfme-ui-fit-width')!);

  const expectedZoom = Math.round((685 / (PAGE_SIZE_PRESETS.A4.width * ZOOM)) * 100);
  await waitFor(() => {
    expect(container).toHaveTextContent(`${expectedZoom}%`);
  });
});

test('Designer toolbar fit height returns to 100 percent', async () => {
  setupUIMock();
  restoreClientSizeMock = mockClientSizeFromStyle();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
          <Designer
            template={getSampleTemplate()}
            onSaveTemplate={console.log}
            onChangeTemplate={console.log}
            size={{ width: 1200, height: 1200 }}
            onPageCursorChange={() => undefined}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.getElementsByClassName(SELECTABLE_CLASSNAME).length).toBeGreaterThan(0);
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
