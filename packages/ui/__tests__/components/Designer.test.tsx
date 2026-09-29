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
  type Plugin,
  type Plugins,
  type Schema,
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
      designer.updateTemplate(updatedTemplate);
    });

    await waitFor(() => {
      const canvas = domContainer.querySelector(`.${DESIGNER_CLASSNAME}canvas`) as HTMLDivElement;
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer).toHaveTextContent('2/2');
      expect(canvas.scrollTop).toBe(pageTwoScrollTop);
    });

    await act(async () => {
      designer.updateTemplate(updatedTemplate, { page: 0 });
    });

    await waitFor(() => {
      const canvas = domContainer.querySelector(`.${DESIGNER_CLASSNAME}canvas`) as HTMLDivElement;
      expect(designer.getPageCursor()).toBe(0);
      expect(domContainer).toHaveTextContent('1/2');
      expect(canvas.scrollTop).toBe(0);
    });

    await act(async () => {
      designer.updateTemplate(updatedTemplate, { page: 1 });
      designer.updateOptions({ lang: 'en' });
    });

    await waitFor(() => {
      const canvas = domContainer.querySelector(`.${DESIGNER_CLASSNAME}canvas`) as HTMLDivElement;
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer).toHaveTextContent('2/2');
      expect(canvas.scrollTop).toBe(pageTwoScrollTop);
    });

    const canvas = domContainer.querySelector(`.${DESIGNER_CLASSNAME}canvas`) as HTMLDivElement;
    canvas.scrollTop = 0;

    await act(async () => {
      designer.updateTemplate(updatedTemplate, { page: 1 });
    });

    await waitFor(() => {
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

const textField = (name: string, content = name) => ({
  name,
  type: 'text',
  content,
  position: { x: 20, y: 20 },
  width: 100,
  height: 15,
  alignment: 'left' as const,
  fontSize: 13,
  characterSpacing: 0,
  lineHeight: 1,
});

const getOnePageBlankTemplate = (): Template => ({
  basePdf: BLANK_A4_PDF,
  schemas: [[textField('field1', 'hello')]],
});

const namesByPage = (template: Template) =>
  template.schemas.map((page) => page.map((schema) => schema.name));

const pressShortcut = (key: string) => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  fireEvent.keyDown(document.body, { key, code: `Key${key.toUpperCase()}`, ctrlKey: true });
  fireEvent.keyUp(document.body, { key, code: `Key${key.toUpperCase()}`, ctrlKey: true });
};

const clickControl = async (container: HTMLElement, className: string, label: string) => {
  const control = container.querySelector(className);
  if (!(control instanceof HTMLElement)) {
    throw new Error(`${label} control was not found`);
  }
  fireEvent.click(control);
  const item = await waitFor(() => {
    const match = Array.from(document.querySelectorAll('div')).find(
      (element) => element.childElementCount === 0 && element.textContent === label,
    );
    if (!(match instanceof HTMLElement)) {
      throw new Error(`${label} was not found`);
    }
    return match;
  });
  fireEvent.click(item);
};

const renameCurrentPage = (container: HTMLElement, names: string[]) => {
  const open = container.querySelector(`.${DESIGNER_CLASSNAME}bulk-update`);
  if (!(open instanceof HTMLElement)) throw new Error('bulk update was not found');
  fireEvent.click(open);
  const textarea = container.querySelector('textarea');
  if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('bulk editor was not found');
  fireEvent.change(textarea, { target: { value: names.join('\n') } });
  const commit = container.querySelector(`.${DESIGNER_CLASSNAME}bulk-commit`);
  if (!(commit instanceof HTMLElement)) throw new Error('bulk commit was not found');
  fireEvent.click(commit);
};

const clickFieldInList = (container: HTMLElement, name: string) => {
  const list = container.querySelector(`.${DESIGNER_CLASSNAME}list-view`);
  if (!(list instanceof HTMLElement)) throw new Error('field list was not found');
  const match = Array.from(list.querySelectorAll('div, span')).find(
    (element) => element.textContent === name,
  );
  if (!(match instanceof HTMLElement)) throw new Error(`${name} was not found in the field list`);
  fireEvent.click(match);
};

const RAW_SYNC_HEIGHT = 10.1728;
const SYNCED_HEIGHT = uiHelper.round(RAW_SYNC_HEIGHT, 2);

const syncHeightPlugin: Plugin<Schema> = {
  pdf: () => undefined,
  ui: ({ onChange }) => {
    if (!onChange) return;
    onChange({ key: 'height', value: RAW_SYNC_HEIGHT });
  },
  propPanel: {
    schema: {},
    defaultSchema: {
      name: 'syncHeight',
      type: 'syncHeight',
      content: 'sync',
      position: { x: 10, y: 10 },
      width: 40,
      height: 10,
    },
  },
};

const syncHeightPlugins: Plugins = { ...plugins, syncHeight: syncHeightPlugin };

const heightOfType = (template: Template, type: string) =>
  template.schemas.flat().find((schema) => schema.type === type)?.height;

const addSchemaFromSidebar = (container: HTMLElement, type: string) => {
  const button = container.querySelector(`.${DESIGNER_CLASSNAME}plugin-${type}`);
  if (!(button instanceof HTMLElement)) throw new Error(`plugin ${type} was not found`);
  const pointer = {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'mouse' as const,
  };
  fireEvent.pointerDown(button, { ...pointer, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(document, { ...pointer, clientX: 80, clientY: 80 });
  fireEvent.pointerUp(document, { ...pointer, clientX: 180, clientY: 180 });
};

const mountPublicDesigner = async (template: Template, designerPlugins: Plugins = plugins) => {
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

  const events: Array<'template' | 'page'> = [];
  const designer = new PublicDesigner({
    domContainer,
    template,
    plugins: designerPlugins,
  });
  await act(async () => {
    designer.updateTemplate(template);
  });
  designer.onChangeTemplate(() => {
    events.push('template');
  });
  designer.onPageChange((info) => {
    events.push('page');
    expect(designer.getTotalPages()).toBe(info.totalPages);
    expect(designer.getTemplate().schemas.length).toBe(info.totalPages);
  });

  return {
    designer,
    domContainer,
    events,
    cleanup: () => {
      act(() => {
        designer.destroy();
      });
      domContainer.remove();
      globalThis.ResizeObserver = originalResizeObserver;
    },
  };
};

test('undo after editing another page restores that page and redo lands there (#1397)', async () => {
  const { designer, domContainer, events, cleanup } = await mountPublicDesigner(getTwoPageTemplate());

  try {
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('1/2');
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });

    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-next')!);
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('2/2');
      expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).toHaveTextContent(
        'field1Page2',
      );
    });

    events.length = 0;
    renameCurrentPage(domContainer, ['renamedPage2', 'field2Page2']);
    expect(events).toEqual(['template']);
    expect(namesByPage(designer.getTemplate())).toEqual([
      ['field1', 'field2'],
      ['renamedPage2', 'field2Page2'],
    ]);

    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-prev')!);
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('1/2');
      expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).toHaveTextContent(
        'field1',
      );
    });

    events.length = 0;
    pressShortcut('z');

    await waitFor(() => {
      expect(domContainer).toHaveTextContent('2/2');
      expect(domContainer.querySelector('[title="renamedPage2"]')).toBeNull();
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
      expect(domContainer.querySelector('[title="field1Page2"]')).toBeTruthy();
    });
    expect(events).toEqual(['template', 'page']);
    expect(namesByPage(designer.getTemplate())).toEqual([
      ['field1', 'field2'],
      ['field1Page2', 'field2Page2'],
    ]);
    expect(designer.getPageCursor()).toBe(1);

    const saved: Template[] = [];
    designer.onSaveTemplate((template) => {
      saved.push(template);
    });
    designer.saveTemplate();
    expect(namesByPage(saved[0])).toEqual(namesByPage(designer.getTemplate()));

    events.length = 0;
    pressShortcut('y');

    await waitFor(() => {
      expect(domContainer).toHaveTextContent('2/2');
      expect(domContainer.querySelector('[title="renamedPage2"]')).toBeTruthy();
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    expect(events).toEqual(['template', 'page']);
    expect(designer.getPageCursor()).toBe(1);
    expect(namesByPage(designer.getTemplate())).toEqual([
      ['field1', 'field2'],
      ['renamedPage2', 'field2Page2'],
    ]);
    expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).toHaveTextContent(
      'renamedPage2',
    );
    expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).not.toHaveTextContent(
      'field1Page2',
    );
  } finally {
    cleanup();
  }
});

test('redo after multiple undos lands on the page where each change was made', async () => {
  const { designer, domContainer, cleanup } = await mountPublicDesigner(getTwoPageTemplate());

  try {
    await waitFor(() => {
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });

    renameCurrentPage(domContainer, ['renamedField1', 'field2']);
    expect(designer.getPageCursor()).toBe(0);

    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-next')!);
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).toHaveTextContent(
        'field1Page2',
      );
    });
    renameCurrentPage(domContainer, ['renamedPage2', 'field2Page2']);

    pressShortcut('z');
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer.querySelector('[title="field1Page2"]')).toBeTruthy();
      expect(domContainer.querySelector('[title="renamedPage2"]')).toBeNull();
    });

    pressShortcut('z');
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(0);
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
      expect(domContainer.querySelector('[title="renamedField1"]')).toBeNull();
    });

    pressShortcut('y');
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(0);
      expect(domContainer.querySelector('[title="renamedField1"]')).toBeTruthy();
    });
    expect(namesByPage(designer.getTemplate())).toEqual([
      ['renamedField1', 'field2'],
      ['field1Page2', 'field2Page2'],
    ]);

    pressShortcut('y');
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer.querySelector('[title="renamedPage2"]')).toBeTruthy();
    });
    expect(namesByPage(designer.getTemplate())).toEqual([
      ['renamedField1', 'field2'],
      ['renamedPage2', 'field2Page2'],
    ]);
  } finally {
    cleanup();
  }
});

test('adding a page clears a selection from the previous page', async () => {
  const { domContainer, cleanup } = await mountPublicDesigner(getOnePageBlankTemplate());

  try {
    await waitFor(() => {
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    clickFieldInList(domContainer, 'field1');
    await waitFor(() => {
      expect(domContainer.querySelectorAll(`.${DESIGNER_CLASSNAME}delete-button`)).toHaveLength(1);
    });

    await clickControl(domContainer, '.pdfme-ui-context-menu', 'Add Page After');
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('2/2');
      expect(domContainer.querySelectorAll(`.${DESIGNER_CLASSNAME}delete-button`)).toHaveLength(0);
    });
  } finally {
    cleanup();
  }
});

test('undo landing on another page drops a selection from the page that was showing', async () => {
  const { designer, domContainer, cleanup } = await mountPublicDesigner(getTwoPageTemplate());

  try {
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('1/2');
    });
    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-next')!);
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).toHaveTextContent(
        'field1Page2',
      );
    });
    renameCurrentPage(domContainer, ['renamedPage2', 'field2Page2']);

    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-prev')!);
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(0);
      expect(domContainer.querySelector(`.${DESIGNER_CLASSNAME}list-view`)).toHaveTextContent(
        'field1',
      );
    });
    clickFieldInList(domContainer, 'field1');
    await waitFor(() => {
      expect(domContainer.querySelectorAll(`.${DESIGNER_CLASSNAME}delete-button`)).toHaveLength(1);
    });

    pressShortcut('z');
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer.querySelector('[title="field1Page2"]')).toBeTruthy();
      expect(domContainer.querySelectorAll(`.${DESIGNER_CLASSNAME}delete-button`)).toHaveLength(0);
    });
  } finally {
    cleanup();
  }
});

test('page add and delete are undoable and redo lands on the changed page', async () => {
  const { designer, domContainer, events, cleanup } = await mountPublicDesigner(
    getOnePageBlankTemplate(),
  );
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

  try {
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('field1');
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    const fieldId = (domContainer.querySelector('[title="field1"]') as HTMLElement).id;

    events.length = 0;
    await clickControl(domContainer, '.pdfme-ui-context-menu', 'Add Page After');
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('2/2');
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    expect(events).toEqual(['template', 'page']);
    expect(designer.getPageCursor()).toBe(1);
    expect(designer.getTotalPages()).toBe(2);
    expect((domContainer.querySelector('[title="field1"]') as HTMLElement).id).toBe(fieldId);
    expect(namesByPage(designer.getTemplate())).toEqual([['field1'], []]);

    events.length = 0;
    pressShortcut('z');
    await waitFor(() => {
      expect(domContainer.querySelector('.pdfme-ui-pager')).toBeNull();
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    expect(events).toEqual(['template', 'page']);
    expect(designer.getPageCursor()).toBe(0);
    expect(designer.getTotalPages()).toBe(1);
    expect(namesByPage(designer.getTemplate())).toEqual([['field1']]);

    events.length = 0;
    pressShortcut('y');
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('2/2');
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    expect(events).toEqual(['template', 'page']);
    expect(designer.getPageCursor()).toBe(1);
    expect(designer.getTotalPages()).toBe(2);

    const twoPageFieldId = (domContainer.querySelector('[title="field1"]') as HTMLElement).id;
    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-prev')!);
    await waitFor(() => expect(designer.getPageCursor()).toBe(0));
    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-next')!);
    await waitFor(() => {
      expect(designer.getPageCursor()).toBe(1);
      expect(domContainer).toHaveTextContent('2/2');
    });

    events.length = 0;
    await clickControl(domContainer, '.pdfme-ui-context-menu', 'Remove Current Page');
    expect(confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(domContainer.querySelector('.pdfme-ui-pager')).toBeNull();
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    expect(events).toEqual(['template', 'page']);
    expect(designer.getPageCursor()).toBe(0);
    expect(designer.getTotalPages()).toBe(1);
    expect((domContainer.querySelector('[title="field1"]') as HTMLElement).id).toBe(twoPageFieldId);

    events.length = 0;
    pressShortcut('z');
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('2/2');
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    expect(events).toEqual(['template', 'page']);
    expect(designer.getPageCursor()).toBe(1);
    expect(namesByPage(designer.getTemplate())).toEqual([['field1'], []]);

    events.length = 0;
    pressShortcut('y');
    await waitFor(() => {
      expect(domContainer.querySelector('.pdfme-ui-pager')).toBeNull();
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    expect(events).toEqual(['template', 'page']);
    expect(designer.getPageCursor()).toBe(0);
    expect(designer.getTotalPages()).toBe(1);
    expect(namesByPage(designer.getTemplate())).toEqual([['field1']]);
  } finally {
    cleanup();
  }
});

test('undo keeps a schema selected and drops a selection whose schema is gone', async () => {
  const { designer, domContainer, cleanup } = await mountPublicDesigner(getTwoPageTemplate());
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

  try {
    await waitFor(() => {
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });

    renameCurrentPage(domContainer, ['field1', 'renamedField2']);
    clickFieldInList(domContainer, 'field1');
    await waitFor(() => {
      expect(domContainer.querySelectorAll(`.${DESIGNER_CLASSNAME}delete-button`)).toHaveLength(1);
    });
    const fieldId = (domContainer.querySelector('[title="field1"]') as HTMLElement).id;

    pressShortcut('z');

    await waitFor(() => {
      expect(domContainer.querySelector('[title="field2"]')).toBeTruthy();
      expect(domContainer.querySelector('[title="renamedField2"]')).toBeNull();
    });
    expect(domContainer.querySelectorAll(`.${DESIGNER_CLASSNAME}delete-button`)).toHaveLength(1);
    expect((domContainer.querySelector('[title="field1"]') as HTMLElement).id).toBe(fieldId);
    expect(designer.getPageCursor()).toBe(0);

    fireEvent.click(domContainer.querySelector('.pdfme-ui-page-next')!);
    await waitFor(() => expect(designer.getPageCursor()).toBe(1));
    clickFieldInList(domContainer, 'field1Page2');
    await waitFor(() => {
      expect(domContainer.querySelectorAll(`.${DESIGNER_CLASSNAME}delete-button`)).toHaveLength(1);
    });

    await clickControl(domContainer, '.pdfme-ui-context-menu', 'Remove Current Page');
    expect(confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(domContainer.querySelector('.pdfme-ui-pager')).toBeNull();
      expect(domContainer.querySelector('[title="field1Page2"]')).toBeNull();
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    expect(domContainer.querySelectorAll(`.${DESIGNER_CLASSNAME}delete-button`)).toHaveLength(0);
    expect(designer.getPageCursor()).toBe(0);
  } finally {
    cleanup();
  }
});

test('external updateTemplate does not clear history and undo keeps the canvas in sync', async () => {
  const { designer, domContainer, cleanup } = await mountPublicDesigner(getTwoPageTemplate());

  try {
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('1/2');
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });

    renameCurrentPage(domContainer, ['renamedField1', 'field2']);
    expect(namesByPage(designer.getTemplate())[0]).toEqual(['renamedField1', 'field2']);

    await act(async () => {
      designer.updateTemplate(designer.getTemplate());
    });
    await waitFor(() => {
      expect(domContainer.querySelector('[title="renamedField1"]')).toBeTruthy();
    });

    pressShortcut('z');
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('1/2');
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
      expect(domContainer.querySelector('[title="renamedField1"]')).toBeNull();
      expect(domContainer.querySelector('[title="field1Page2"]')).toBeTruthy();
    });
    expect(namesByPage(designer.getTemplate())).toEqual([
      ['field1', 'field2'],
      ['field1Page2', 'field2Page2'],
    ]);

    pressShortcut('y');
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('1/2');
      expect(domContainer.querySelector('[title="renamedField1"]')).toBeTruthy();
      expect(domContainer.querySelector('[title="field1Page2"]')).toBeTruthy();
    });
    expect(designer.getPageCursor()).toBe(0);

    const fewerPages = designer.getTemplate();
    fewerPages.schemas = [fewerPages.schemas[0]];
    await act(async () => {
      designer.updateTemplate(fewerPages);
    });
    await waitFor(() => {
      expect(domContainer.querySelector('.pdfme-ui-pager')).toBeNull();
      expect(domContainer.querySelector('[title="renamedField1"]')).toBeTruthy();
    });

    pressShortcut('z');
    await waitFor(() => {
      expect(domContainer).toHaveTextContent('1/2');
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
      expect(domContainer.querySelector('[title="field1Page2"]')).toBeTruthy();
    });
    expect(namesByPage(designer.getTemplate())).toEqual([
      ['field1', 'field2'],
      ['field1Page2', 'field2Page2'],
    ]);

    pressShortcut('y');
    await waitFor(() => {
      expect(domContainer.querySelector('.pdfme-ui-pager')).toBeNull();
      expect(domContainer.querySelector('[title="renamedField1"]')).toBeTruthy();
    });
    expect(namesByPage(designer.getTemplate())).toEqual([['renamedField1', 'field2']]);
    expect(designer.getTotalPages()).toBe(1);
    expect(designer.getPageCursor()).toBe(0);
  } finally {
    cleanup();
  }
});

test('renderer height sync does not push history, so one undo removes the added schema', async () => {
  const { designer, domContainer, events, cleanup } = await mountPublicDesigner(
    getOnePageBlankTemplate(),
    syncHeightPlugins,
  );

  try {
    await waitFor(() => {
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });

    events.length = 0;
    addSchemaFromSidebar(domContainer, 'syncHeight');
    await waitFor(() => {
      expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBe(SYNCED_HEIGHT);
    });
    expect(namesByPage(designer.getTemplate())[0]).toContain('field1');
    expect(events.filter((event) => event === 'template').length).toBeGreaterThan(0);

    events.length = 0;
    pressShortcut('z');
    await waitFor(() => {
      expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBeUndefined();
    });
    expect(namesByPage(designer.getTemplate())).toEqual([['field1']]);
    expect(events).toEqual(['template', 'page']);

    events.length = 0;
    pressShortcut('y');
    await waitFor(() => {
      expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBe(SYNCED_HEIGHT);
    });
    expect(events).toEqual(['template', 'page']);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(events).toEqual(['template', 'page']);
    expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBe(SYNCED_HEIGHT);

    events.length = 0;
    pressShortcut('z');
    await waitFor(() => {
      expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBeUndefined();
    });
    expect(namesByPage(designer.getTemplate())).toEqual([['field1']]);
    expect(events).toEqual(['template', 'page']);
  } finally {
    cleanup();
  }
});

test('loading a template with a stale dynamic height does not create history', async () => {
  const template: Template = {
    basePdf: BLANK_A4_PDF,
    schemas: [
      [
        {
          name: 'field1',
          type: 'text',
          content: 'hello',
          position: { x: 20, y: 20 },
          width: 100,
          height: 15,
        },
        {
          name: 'syncHeight',
          type: 'syncHeight',
          content: 'sync',
          position: { x: 10, y: 10 },
          width: 40,
          height: 10,
        },
      ],
    ],
  };
  const { designer, cleanup } = await mountPublicDesigner(template, syncHeightPlugins);

  try {
    await waitFor(() => {
      expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBe(SYNCED_HEIGHT);
    });
    const synced = JSON.stringify(designer.getTemplate().schemas);

    pressShortcut('z');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(JSON.stringify(designer.getTemplate().schemas)).toBe(synced);
    expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBe(SYNCED_HEIGHT);
  } finally {
    cleanup();
  }
});

test('a renderer height sync leaves an existing redo in place', async () => {
  const { designer, domContainer, events, cleanup } = await mountPublicDesigner(
    getOnePageBlankTemplate(),
    syncHeightPlugins,
  );

  try {
    await waitFor(() => {
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    renameCurrentPage(domContainer, ['renamedField1']);
    pressShortcut('z');
    await waitFor(() => {
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });

    events.length = 0;
    const withStaleHeight = designer.getTemplate();
    withStaleHeight.schemas[0].push({
      name: 'syncHeight',
      type: 'syncHeight',
      content: 'sync',
      position: { x: 10, y: 10 },
      width: 40,
      height: 10,
    });
    await act(async () => {
      designer.updateTemplate(withStaleHeight);
    });
    await waitFor(() => {
      expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBe(SYNCED_HEIGHT);
    });

    events.length = 0;
    pressShortcut('y');
    await waitFor(() => {
      expect(namesByPage(designer.getTemplate())).toEqual([['renamedField1']]);
    });
    expect(events[0]).toBe('template');
  } finally {
    cleanup();
  }
});

test('deep-equal no-op commits are skipped and preserve redo', async () => {
  const { designer, domContainer, events, cleanup } = await mountPublicDesigner(getOnePageBlankTemplate());

  try {
    await waitFor(() => {
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });
    renameCurrentPage(domContainer, ['renamedField1']);
    pressShortcut('z');
    await waitFor(() => {
      expect(domContainer.querySelector('[title="field1"]')).toBeTruthy();
    });

    events.length = 0;
    renameCurrentPage(domContainer, ['field1']);
    expect(events).toEqual([]);
    expect(namesByPage(designer.getTemplate())).toEqual([['field1']]);

    pressShortcut('y');
    await waitFor(() => {
      expect(domContainer.querySelector('[title="renamedField1"]')).toBeTruthy();
    });
    expect(namesByPage(designer.getTemplate())).toEqual([['renamedField1']]);
  } finally {
    cleanup();
  }
});

test('synced height is rounded like Moveable so an unrounded sync is a no-op', async () => {
  const template: Template = {
    basePdf: BLANK_A4_PDF,
    schemas: [
      [
        {
          name: 'syncHeight',
          type: 'syncHeight',
          content: 'sync',
          position: { x: 10, y: 10 },
          width: 40,
          height: SYNCED_HEIGHT,
        },
      ],
    ],
  };
  const { designer, events, cleanup } = await mountPublicDesigner(template, syncHeightPlugins);

  try {
    await waitFor(() => {
      expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBe(SYNCED_HEIGHT);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(events).toEqual([]);
    expect(heightOfType(designer.getTemplate(), 'syncHeight')).toBe(SYNCED_HEIGHT);
    expect(heightOfType(designer.getTemplate(), 'syncHeight')).not.toBe(RAW_SYNC_HEIGHT);
  } finally {
    cleanup();
  }
});
