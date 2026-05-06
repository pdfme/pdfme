// @vitest-environment jsdom

import type { Font as FontKitFont } from 'fontkit';
import type { Font } from '@pdfme/common';
import { uiRender } from '../src/list/uiRender.js';
import type { ListSchema } from '../src/list/types.js';

const createMockFont = () =>
  ({
    unitsPerEm: 1000,
    ascent: 800,
    descent: -200,
    bbox: { maxY: 800, minY: -200 },
    layout: (text: string) => ({
      glyphs: Array.from(text, () => ({ advanceWidth: 500 })),
    }),
    hasGlyphForCodePoint: () => true,
  }) as unknown as FontKitFont;

const getListSchema = (overrides: Partial<ListSchema> = {}): ListSchema => ({
  name: 'items',
  type: 'list',
  content: '[]',
  position: { x: 0, y: 0 },
  width: 80,
  height: 20,
  rotate: 0,
  readOnly: false,
  required: false,
  alignment: 'left',
  verticalAlignment: 'top',
  fontName: 'Base',
  fontSize: 12,
  lineHeight: 1,
  characterSpacing: 0,
  fontColor: '#000000',
  backgroundColor: '',
  listStyle: 'ordered',
  markerWidth: 8,
  markerGap: 2,
  indentSize: 6,
  itemSpacing: 1,
  ...overrides,
});

const font = {
  Base: { data: new Uint8Array(), fallback: true },
} as Font;

const getCache = () =>
  new Map<string | number, unknown>([['getFontKitFont-Base', createMockFont()]]);

const listValue = (items: string[]) => JSON.stringify(items);

const i18n = (key: string) =>
  ({
    'schemas.list.addItem': 'Add item',
    'schemas.list.removeItem': 'Remove item',
    'schemas.list.indentItem': 'Indent item',
    'schemas.list.outdentItem': 'Outdent item',
  })[key] || key;

const getRowBody = (row: Element): HTMLElement => row.children[1] as HTMLElement;

const getRowEditor = (row: Element): HTMLElement => {
  const editor = getRowBody(row).querySelector<HTMLElement>('[contenteditable], [tabindex]');
  if (!editor) throw new Error('Unable to find list item editor');
  return editor;
};

const moveCaretToEnd = (element: HTMLElement) => {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
};

describe('list UI rendering', () => {
  test('renders only the item range for split list chunks', async () => {
    const rootElement = document.createElement('div');

    await uiRender({
      value: listValue(['One', 'Two', 'Three', 'Four']),
      schema: getListSchema({ __splitRange: { unit: 'listItem', start: 1, end: 3 } }),
      rootElement,
      mode: 'viewer',
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    expect(rows).toHaveLength(2);
    expect((rows[0].children[0] as HTMLElement).textContent).toBe('2.');
    expect((rows[0].children[1] as HTMLElement).textContent).toBe('Two');
    expect((rows[1].children[0] as HTMLElement).textContent).toBe('3.');
    expect((rows[1].children[1] as HTMLElement).textContent).toBe('Three');
  });

  test('writes split chunk edits back into the full list value', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();

    await uiRender({
      value: listValue(['One', 'Two', 'Three', 'Four']),
      schema: getListSchema({ __splitRange: { unit: 'listItem', start: 1, end: 3 } }),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    const firstBody = getRowEditor(rows[0]);
    firstBody.innerText = 'Updated two';
    firstBody.dispatchEvent(new window.Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: listValue(['One', 'Updated two', 'Three', 'Four']),
    });
  });

  test('adds, removes, indents, and outdents items in form mode', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();

    await uiRender({
      value: listValue(['One', 'Two', 'Three']),
      schema: getListSchema(),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    const secondRow = rows[1];

    secondRow.querySelector<HTMLButtonElement>('button[aria-label="Indent item"]')?.click();
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['One', '\tTwo', 'Three']),
    });

    onChange.mockClear();
    secondRow.querySelector<HTMLButtonElement>('button[aria-label="Add item"]')?.click();
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['One', 'Two', '', 'Three']),
    });

    onChange.mockClear();
    secondRow.querySelector<HTMLButtonElement>('button[aria-label="Remove item"]')?.click();
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['One', 'Three']),
    });

    await uiRender({
      value: listValue(['One', '\tTwo', 'Three']),
      schema: getListSchema(),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    const indentedRows = Array.from(rootElement.children) as HTMLDivElement[];
    onChange.mockClear();
    indentedRows[1].querySelector<HTMLButtonElement>('button[aria-label="Outdent item"]')?.click();
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['One', 'Two', 'Three']),
    });
  });

  test('supports removing all rows and adding an empty row back', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();

    await uiRender({
      value: listValue(['Only row']),
      schema: getListSchema(),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    rootElement.querySelector<HTMLButtonElement>('button[aria-label="Remove item"]')?.click();
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue([]),
    });

    await uiRender({
      value: listValue([]),
      schema: getListSchema(),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    expect(rootElement.querySelectorAll('button[aria-label="Remove item"]')).toHaveLength(0);
    expect(rootElement.querySelectorAll('button[aria-label="Add item"]')).toHaveLength(1);

    onChange.mockClear();
    rootElement.querySelector<HTMLButtonElement>('button[aria-label="Add item"]')?.click();
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['']),
    });

    await uiRender({
      value: listValue(['']),
      schema: getListSchema(),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    expect(rootElement.querySelectorAll('button[aria-label="Remove item"]')).toHaveLength(1);
    expect(((rootElement.children[0] as HTMLElement).children[1] as HTMLElement).textContent).toBe(
      '',
    );
  });

  test('keeps Enter as an in-item line break and supports Tab indentation', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    document.body.appendChild(rootElement);

    await uiRender({
      value: listValue(['One', 'Two']),
      schema: getListSchema({ height: 8 }),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    const firstBody = getRowEditor(rows[0]);
    moveCaretToEnd(firstBody);

    onChange.mockClear();
    const enter = new window.KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    expect(firstBody.dispatchEvent(enter)).toBe(false);
    expect(enter.defaultPrevented).toBe(true);
    await new Promise((resolve) => setTimeout(resolve));

    const heightChange = onChange.mock.calls
      .map(([change]) => change as { key: string; value: unknown })
      .find(({ key }) => key === 'height');
    expect(Number(heightChange?.value)).toBeGreaterThan(8);
    expect(onChange).not.toHaveBeenCalledWith({
      key: 'content',
      value: listValue(['One\n', 'Two']),
    });
    expect(document.activeElement).toBe(firstBody);

    firstBody.innerText = 'One\n\u200Bcontinued';
    firstBody.dispatchEvent(new window.FocusEvent('blur'));
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['One\ncontinued', 'Two']),
    });

    await uiRender({
      value: listValue(['One', 'Two']),
      schema: getListSchema(),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    const rerenderedRows = Array.from(rootElement.children) as HTMLDivElement[];
    const rerenderedFirstBody = getRowEditor(rerenderedRows[0]);
    onChange.mockClear();
    rerenderedFirstBody.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['\tOne', 'Two']),
    });
    rootElement.remove();
  });

  test('does not intercept Enter while confirming IME composition', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();

    await uiRender({
      value: listValue(['One', 'Two']),
      schema: getListSchema(),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    onChange.mockClear();
    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    const firstBody = getRowEditor(rows[0]);
    const composingEnter = new window.KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });

    expect(firstBody.dispatchEvent(composingEnter)).toBe(true);
    expect(composingEnter.defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();

    const legacyComposingEnter = new window.KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(legacyComposingEnter, 'keyCode', { value: 229 });

    expect(firstBody.dispatchEvent(legacyComposingEnter)).toBe(true);
    expect(legacyComposingEnter.defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('shows list editing controls in designer edit mode', async () => {
    const rootElement = document.createElement('div');

    await uiRender({
      value: listValue(['One', 'Two']),
      schema: getListSchema(),
      rootElement,
      mode: 'designer',
      onChange: vi.fn(),
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    expect(rootElement.querySelectorAll('button[aria-label="Add item"]')).toHaveLength(2);
    expect(rootElement.querySelectorAll('button[aria-label="Indent item"]')).toHaveLength(2);
    expect(rootElement.querySelector('button')?.hasAttribute('title')).toBe(false);
  });

  test('keeps designer edit mode when clicking a list action button', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const stopEditing = vi.fn();

    await uiRender({
      value: listValue(['One', 'Two']),
      schema: getListSchema(),
      rootElement,
      mode: 'designer',
      onChange,
      stopEditing,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    onChange.mockClear();
    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    const firstBody = getRowEditor(rows[0]);
    const addButton = rows[0].querySelector<HTMLButtonElement>('button[aria-label="Add item"]');
    const mouseDown = vi.fn();
    rootElement.addEventListener('mousedown', mouseDown);
    firstBody.innerText = 'Edited one';

    addButton?.dispatchEvent(
      new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    firstBody.dispatchEvent(new window.FocusEvent('blur'));
    addButton?.click();

    expect(stopEditing).not.toHaveBeenCalled();
    expect(mouseDown).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['Edited one', '', 'Two']),
    });
  });

  test('keeps designer edit mode when moving between list item bodies', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const stopEditing = vi.fn();

    await uiRender({
      value: listValue(['One', 'Two']),
      schema: getListSchema(),
      rootElement,
      mode: 'designer',
      onChange,
      stopEditing,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    onChange.mockClear();
    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    const firstBody = getRowEditor(rows[0]);
    const secondBody = getRowEditor(rows[1]);
    const mouseDown = vi.fn();
    rootElement.addEventListener('mousedown', mouseDown);

    secondBody.dispatchEvent(
      new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    firstBody.dispatchEvent(new window.FocusEvent('blur', { relatedTarget: secondBody }));

    expect(mouseDown).not.toHaveBeenCalled();
    expect(stopEditing).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    secondBody.innerText = 'Edited two';
    secondBody.dispatchEvent(new window.FocusEvent('blur', { relatedTarget: document.body }));

    expect(stopEditing).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['One', 'Edited two']),
    });
  });

  test('keeps designer edit mode when pressing Enter inside an item', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const stopEditing = vi.fn();

    await uiRender({
      value: listValue(['One', 'Two']),
      schema: getListSchema(),
      rootElement,
      mode: 'designer',
      onChange,
      stopEditing,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
      i18n,
    } as Parameters<typeof uiRender>[0]);

    onChange.mockClear();
    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    const firstBody = getRowEditor(rows[0]);
    moveCaretToEnd(firstBody);

    firstBody.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );

    expect(stopEditing).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith({
      key: 'content',
      value: listValue(['One\n', 'Two']),
    });
  });
});
