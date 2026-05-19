import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import Designer from '../../src/components/Designer/index.js';
import DesignerClass from '../../src/Designer.js';
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

const withNoopResizeObserver = (fn: () => void) => {
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(_cb: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  try {
    fn();
  } finally {
    globalThis.ResizeObserver = original;
  }
};

test('Designer.selectSchemas selects and deselects schemas via the public class method', async () => {
  setupUIMock();

  let designer: DesignerClass | undefined;
  const domContainer = document.createElement('div');
  Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 1200 });
  Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 1200 });
  document.body.appendChild(domContainer);

  try {
    withNoopResizeObserver(() => {
      designer = new DesignerClass({ domContainer, template: getSampleTemplate(), plugins });
    });

    await act(async () => {
      (designer as any).render();
      // Flush async template initialisation (template2SchemasList) so subsequent
      // state updates land inside this act boundary and avoid spurious warnings.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(domContainer.getElementsByClassName(SELECTABLE_CLASSNAME).length).toBeGreaterThan(0);
    });

    // No selection initially.
    expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}delete-button`)).toBeNull();

    // Select field1 via the public class method.
    await act(async () => {
      designer!.selectSchemas(['field1']);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}delete-button`)).toBeInTheDocument();
    });

    // Deselect by passing an empty array.
    await act(async () => {
      designer!.selectSchemas([]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}delete-button`)).toBeNull();
    });
  } finally {
    designer?.destroy();
    domContainer.remove();
  }
});

test('Designer.selectSchemas preserves existing selection when all names are unmatched', async () => {
  setupUIMock();

  let designer: DesignerClass | undefined;
  const domContainer = document.createElement('div');
  Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 1200 });
  Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 1200 });
  document.body.appendChild(domContainer);

  try {
    withNoopResizeObserver(() => {
      designer = new DesignerClass({ domContainer, template: getSampleTemplate(), plugins });
    });

    await act(async () => {
      (designer as any).render();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(domContainer.getElementsByClassName(SELECTABLE_CLASSNAME).length).toBeGreaterThan(0);
    });

    // Select field1 first.
    await act(async () => {
      designer!.selectSchemas(['field1']);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}delete-button`)).toBeInTheDocument();
    });

    // Calling with an unmatched name should be a no-op — selection must be preserved.
    await act(async () => {
      designer!.selectSchemas(['this_name_does_not_exist']);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Delete button should still be present.
    expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}delete-button`)).toBeInTheDocument();
  } finally {
    designer?.destroy();
    domContainer.remove();
  }
});

test('Designer.selectSchemas throws when called before the component mounts', () => {
  let designer: DesignerClass | undefined;
  const domContainer = document.createElement('div');
  Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 1200 });
  Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 1200 });
  document.body.appendChild(domContainer);

  try {
    withNoopResizeObserver(() => {
      designer = new DesignerClass({ domContainer, template: getSampleTemplate(), plugins });
    });
    expect(() => designer!.selectSchemas(['field1'])).toThrow(
      '[@pdfme/ui] selectSchemas was called before the Designer finished mounting',
    );
  } finally {
    designer?.destroy();
    domContainer.remove();
  }
});
