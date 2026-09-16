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
  getUnbalancedPlaceholderTemplate,
  mockClientSizeFromStyle,
  setupUIMock,
} from '../assets/helper';
import { text, image } from '@pdfme/schemas';
import * as uiHelper from '../../src/helper';

const plugins = { text, image };

let restoreClientSizeMock: (() => void) | undefined;
let uuidSeq = 0;

const mockStableUuids = () => {
  uuidSeq = 0;
  vi.spyOn(uiHelper, 'uuid').mockImplementation(() => `schema-${++uuidSeq}`);
};

const getSelectableByTitle = (container: HTMLElement, title: string) => {
  const element = Array.from(container.getElementsByClassName(SELECTABLE_CLASSNAME)).find(
    (candidate) => candidate.getAttribute('title') === title,
  );
  if (!(element instanceof HTMLElement)) {
    throw new Error(`${title} element was not found`);
  }
  return element;
};

const renderDesigner = (template = getUnbalancedPlaceholderTemplate()) =>
  render(
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

const waitForDesignerFields = async (container: HTMLElement) => {
  await waitFor(() => {
    expect(getSelectableByTitle(container, 'readonlyExpr')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });
};

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

test('Designer keeps canvas controls at a constant screen size when zoomed', async () => {
  setupUIMock();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(plugins)}>
          <OptionsContext.Provider value={{ zoomLevel: 3, maxZoom: 400 }}>
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
    expect(container).toHaveTextContent('300%');
  });

  const moveable = container.querySelector('.moveable-control-box') as HTMLDivElement;
  expect(Number(moveable.style.getPropertyValue('--zoom'))).toBeCloseTo(1 / 3);

  const schema = container.querySelector(`.${SELECTABLE_CLASSNAME}`) as HTMLDivElement;
  fireEvent.mouseDown(schema);
  fireEvent.mouseUp(schema);

  const deleteButton = await waitFor(() => {
    const button = container.querySelector(
      `.${DESIGNER_CLASSNAME}delete-button`,
    ) as HTMLButtonElement | null;
    expect(button).toBeInTheDocument();
    return button!;
  });

  expect(deleteButton.style.transform).toBe(`scale(${1 / 3})`);
  const schemaRight = Number.parseFloat(schema.style.left) + Number.parseFloat(schema.style.width);
  expect(Number.parseFloat(deleteButton.style.left) - schemaRight).toBeCloseTo(10 / 3);
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

test('Designer keeps rendering when readonly text has unmatched braces', async () => {
  setupUIMock();
  mockStableUuids();
  const { container } = renderDesigner();

  await waitForDesignerFields(container);

  await waitFor(() => {
    expect(getSelectableByTitle(container, 'readonlyExpr')).toHaveTextContent('{{1}');
    expect(getSelectableByTitle(container, 'validExpr')).toHaveTextContent('2');
    expect(getSelectableByTitle(container, 'editableField')).toHaveTextContent('{{1}');
    expect(container.querySelector('[title="staticLabel"]')).toHaveTextContent('static 2 {{1}');
  });

  fireEvent.click(container.querySelector('.pdfme-ui-zoom-in')!);
  await waitFor(() => {
    expect(container).toHaveTextContent('125%');
  });

  const editableField = getSelectableByTitle(container, 'editableField');
  fireEvent.mouseDown(editableField);
  fireEvent.mouseUp(editableField);

  await waitFor(() => {
    expect(container.querySelector(`.${DESIGNER_CLASSNAME}delete-button`)).toBeInTheDocument();
  });
  expect(getSelectableByTitle(container, 'readonlyExpr')).toHaveTextContent('{{1}');
});

test('Designer can recover from unmatched braces through in-place editing', async () => {
  setupUIMock();
  mockStableUuids();
  const { container } = renderDesigner(getUnbalancedPlaceholderTemplate('{1+1}'));

  await waitForDesignerFields(container);
  await waitFor(() => {
    expect(getSelectableByTitle(container, 'readonlyExpr')).toHaveTextContent('2');
  });

  const originalElementFromPoint = document.elementFromPoint;
  // jsdom has no layout hit testing; let Moveable recognize the clicked field.
  document.elementFromPoint = () => getSelectableByTitle(container, 'readonlyExpr');
  try {
    for (const [content, expected] of [
      ['{{1}', '{{1}'],
      ['{1+1}', '2'],
    ]) {
      const field = getSelectableByTitle(container, 'readonlyExpr');
      fireEvent.mouseDown(field);
      fireEvent.mouseUp(field);
      // On the first iteration select the field, then click again to edit it.
      // On subsequent iterations it is already selected.
      if (container.querySelector(`.${DESIGNER_CLASSNAME}delete-button`)) {
        fireEvent.mouseDown(field);
        fireEvent.mouseUp(field);
      }

      const editor = await waitFor(() => {
        const element = Array.from(field.querySelectorAll('div')).find(
          (node) => node.contentEditable === 'plaintext-only' || node.contentEditable === 'true',
        );
        expect(element).toBeInTheDocument();
        return element!;
      });
      // jsdom does not implement innerText/contenteditable editing; supply the
      // text that the real text plugin reads when its native blur handler runs.
      editor.innerText = content;
      fireEvent.blur(editor);

      await waitFor(() => {
        expect(getSelectableByTitle(container, 'readonlyExpr')).toHaveTextContent(expected);
        expect(editor).not.toBeInTheDocument();
        expect(getSelectableByTitle(container, 'validExpr')).toHaveTextContent('2');
        expect(getSelectableByTitle(container, 'editableField')).toHaveTextContent('{{1}');
      });
    }
  } finally {
    if (originalElementFromPoint) document.elementFromPoint = originalElementFromPoint;
    else Reflect.deleteProperty(document, 'elementFromPoint');
  }
});
