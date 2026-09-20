import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import Designer from '../../src/components/Designer/index.js';
import PublicDesigner from '../../src/Designer.js';
import { I18nContext, FontContext, OptionsContext, PluginsRegistry } from '../../src/contexts';
import { i18n } from '../../src/i18n';
import { DESIGNER_CLASSNAME, RIGHT_SIDEBAR_WIDTH, SELECTABLE_CLASSNAME } from '../../src/constants';
import {
  BLANK_A4_PDF,
  getDefaultFont,
  isBlankPdf,
  PAGE_SIZE_PRESETS,
  pluginRegistry,
  ZOOM,
  type Template,
} from '@pdfme/common';
import { normalizeElementIdsForSnapshot } from '../assets/normalizeSnapshot';
import {
  getSampleTemplate,
  getStaticMvtTemplate,
  getTwoPageTemplate,
  getUnbalancedPlaceholderTemplate,
  mockClientSizeFromStyle,
  setupUIMock,
} from '../assets/helper';
import { text, image, multiVariableText, table } from '@pdfme/schemas';
import * as uiHelper from '../../src/helper';

const plugins = { text, image };
const mvtPlugins = { text, image, multiVariableText };
const tablePlugins = { text, image, table };

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

  await waitFor(() => {
    expect(container.getElementsByClassName(SELECTABLE_CLASSNAME).length).toBeGreaterThan(0);
    expect(container.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).toHaveTextContent('field1');
    expect(container.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).toHaveTextContent('field2');
  });
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

test('Designer.updateTemplate can keep a requested page cursor and scroll position', async () => {
  setupUIMock(2);
  const originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  const domContainer = document.createElement('div');
  Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 1200 });
  Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 1200 });
  document.body.appendChild(domContainer);

  const designer = new PublicDesigner({
    domContainer,
    template: getTwoPageTemplate(),
    plugins,
  });

  try {
    await act(async () => {
      designer.updateTemplate(getTwoPageTemplate());
    });

    await waitFor(() => {
      expect(domContainer).toHaveTextContent('1/2');
    });

    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-next')!);

    let pageTwoScrollTop = 0;
    await waitFor(() => {
      const canvas = domContainer.querySelector(`.${DESIGNER_CLASSNAME}canvas`) as HTMLDivElement;
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer).toHaveTextContent('2/2');
      expect(canvas.scrollTop).toBeGreaterThan(0);
      pageTwoScrollTop = canvas.scrollTop;
    });

    const updatedTemplate = getTwoPageTemplate();
    updatedTemplate.schemas[1][0].content = 'updated page 2';

    await act(async () => {
      designer.updateTemplate(updatedTemplate, { page: 1 });
    });

    await waitFor(() => {
      const canvas = domContainer.querySelector(`.${DESIGNER_CLASSNAME}canvas`) as HTMLDivElement;
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer).toHaveTextContent('2/2');
      expect(canvas.scrollTop).toBe(pageTwoScrollTop);
    });

    await act(async () => {
      designer.updateTemplate(updatedTemplate, { page: 99 });
    });

    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer).toHaveTextContent('2/2');
    });

    await act(async () => {
      designer.updateTemplate(updatedTemplate, { page: -1 });
    });

    await waitFor(() => {
      const canvas = domContainer.querySelector(`.${DESIGNER_CLASSNAME}canvas`) as HTMLDivElement;
      expect(designer.getPageCursor()).toBe(0);
      expect(domContainer).toHaveTextContent('1/2');
      expect(canvas.scrollTop).toBe(0);
    });

    await act(async () => {
      designer.updateTemplate(updatedTemplate, { page: Number.NaN });
    });

    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(0);
      expect(domContainer).toHaveTextContent('1/2');
    });
  } finally {
    act(() => {
      designer.destroy();
    });
    domContainer.remove();
    globalThis.ResizeObserver = originalResizeObserver;
  }
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

test('Designer renders staticSchema multiVariableText without throwing', async () => {
  setupUIMock();
  mockStableUuids();
  const onChangeTemplate = vi.fn();
  const { container, rerender } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(mvtPlugins)}>
          <Designer
            template={getStaticMvtTemplate()}
            onSaveTemplate={console.log}
            onChangeTemplate={onChangeTemplate}
            size={{ width: 1200, height: 1200 }}
            onPageCursorChange={() => undefined}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelector('[title="staticMvt"]')).toBeInTheDocument();
    expect(getSelectableByTitle(container, 'pageMvt')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  const staticId = container.querySelector('[title="staticMvt"]')?.id;
  expect(staticId).toBeTruthy();

  rerender(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(mvtPlugins)}>
          <Designer
            template={getStaticMvtTemplate()}
            onSaveTemplate={console.log}
            onChangeTemplate={onChangeTemplate}
            size={{ width: 1200, height: 1100 }}
            onPageCursorChange={() => undefined}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(container.querySelector('[title="staticMvt"]')?.id).toBe(staticId);
    expect(getSelectableByTitle(container, 'pageMvt')).toBeInTheDocument();
  });
});

test('Designer does not throw when staticSchema MVT has a CSS-unsafe caller id', async () => {
  setupUIMock();
  mockStableUuids();
  const template = getStaticMvtTemplate();
  if (!isBlankPdf(template.basePdf) || !template.basePdf.staticSchema?.[0]) {
    throw new Error('Expected a blank PDF with staticSchema');
  }
  (template.basePdf.staticSchema[0] as { id?: string }).id = 'foo[';

  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(mvtPlugins)}>
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

  await waitFor(() => {
    const staticField = container.querySelector('[title="staticMvt"]');
    expect(staticField).toBeInTheDocument();
    expect(staticField?.id).toBeTruthy();
    expect(staticField?.id).not.toBe('foo[');
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });
});

test('Designer keeps page-level multiVariableText inline editing', async () => {
  setupUIMock();
  mockStableUuids();
  const onChangeTemplate = vi.fn();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(mvtPlugins)}>
          <Designer
            template={getStaticMvtTemplate()}
            onSaveTemplate={console.log}
            onChangeTemplate={onChangeTemplate}
            size={{ width: 1200, height: 1200 }}
            onPageCursorChange={() => undefined}
          />
        </PluginsRegistry.Provider>
      </FontContext.Provider>
    </I18nContext.Provider>,
  );

  await waitFor(() => {
    expect(getSelectableByTitle(container, 'pageMvt')).toBeInTheDocument();
  });

  const originalElementFromPoint = document.elementFromPoint;
  document.elementFromPoint = () => getSelectableByTitle(container, 'pageMvt');
  try {
    const field = getSelectableByTitle(container, 'pageMvt');
    fireEvent.mouseDown(field);
    fireEvent.mouseUp(field);
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

    editor.innerText = 'Hello {fullName}';
    const editedText = editor.innerText;
    vi.spyOn(window, 'getSelection').mockReturnValue({
      focusOffset: editedText.length,
      anchorOffset: editedText.length,
    } as Selection);
    editor.dispatchEvent(new KeyboardEvent('keyup', { key: '}', bubbles: true }));
    fireEvent.blur(editor);

    await waitFor(() => {
      expect(onChangeTemplate).toHaveBeenCalled();
      const lastTemplate = onChangeTemplate.mock.calls.at(-1)?.[0] as Template;
      expect(lastTemplate.schemas[0].find((schema) => schema.name === 'pageMvt')).toMatchObject({
        text: 'Hello {fullName}',
      });
      expect(getSelectableByTitle(container, 'pageMvt')).toHaveTextContent('Hello');
      expect(container.querySelector('[title="staticMvt"]')).toBeInTheDocument();
    });
  } finally {
    if (originalElementFromPoint) document.elementFromPoint = originalElementFromPoint;
    else Reflect.deleteProperty(document, 'elementFromPoint');
  }
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

const getReadOnlyTableWithExprTemplate = (): Template => ({
  basePdf: {
    ...BLANK_A4_PDF,
    staticSchema: [
      {
        ...structuredClone(table.propPanel.defaultSchema),
        name: 'staticTable',
        type: 'table',
        readOnly: true,
        content: JSON.stringify([['{1+1}', '{name}']]),
        position: { x: 20, y: 200 },
        width: 170,
        height: 30,
        showHead: true,
        head: ['Expr', 'Name'],
        headWidthPercentages: [50, 50],
      },
    ],
  },
  schemas: [
    [
      {
        ...structuredClone(table.propPanel.defaultSchema),
        name: 'table',
        type: 'table',
        readOnly: true,
        content: JSON.stringify([['{1+1}', '{name}']]),
        position: { x: 20, y: 40 },
        width: 170,
        height: 40,
        showHead: true,
        head: ['Expr', 'Name'],
        headWidthPercentages: [50, 50],
      },
    ],
  ],
});

test('Designer keeps {1+1} literal in readOnly table cells', async () => {
  setupUIMock();
  mockStableUuids();
  const { container } = render(
    <I18nContext.Provider value={i18n}>
      <FontContext.Provider value={getDefaultFont()}>
        <PluginsRegistry.Provider value={pluginRegistry(tablePlugins)}>
          <Designer
            template={getReadOnlyTableWithExprTemplate()}
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
    expect(getSelectableByTitle(container, 'table')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-pdfme-render-ready="true"]').length).toBeGreaterThan(
      0,
    );
  });

  const pageTable = getSelectableByTitle(container, 'table');
  expect(pageTable).toHaveTextContent('{1+1}');
  expect(pageTable).toHaveTextContent('{name}');

  const staticTable = container.querySelector('[title="staticTable"]');
  expect(staticTable).toBeInTheDocument();
  expect(staticTable).toHaveTextContent('{1+1}');
  expect(staticTable).toHaveTextContent('{name}');
});
