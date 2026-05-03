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
  }) as unknown as FontKitFont;

const getListSchema = (overrides: Partial<ListSchema> = {}): ListSchema => ({
  name: 'items',
  type: 'list',
  content: '',
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
  startNumber: 10,
  orderedSuffix: '.',
  markerWidth: 8,
  markerGap: 2,
  itemSpacing: 1,
  ...overrides,
});

const font = {
  Base: { data: new Uint8Array(), fallback: true },
} as Font;

const getCache = () =>
  new Map<string | number, unknown>([['getFontKitFont-Base', createMockFont()]]);

describe('list UI rendering', () => {
  test('renders only the item range for split list chunks', async () => {
    const rootElement = document.createElement('div');

    await uiRender({
      value: 'One\nTwo\nThree\nFour',
      schema: getListSchema({ __itemRange: { start: 1, end: 3 } }),
      rootElement,
      mode: 'viewer',
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    expect(rows).toHaveLength(2);
    expect((rows[0].children[0] as HTMLElement).innerText).toBe('11.');
    expect((rows[0].children[1] as HTMLElement).innerText).toBe('Two');
    expect((rows[1].children[0] as HTMLElement).innerText).toBe('12.');
    expect((rows[1].children[1] as HTMLElement).innerText).toBe('Three');
  });

  test('writes split chunk edits back into the full list value', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();

    await uiRender({
      value: 'One\nTwo\nThree\nFour',
      schema: getListSchema({ __itemRange: { start: 1, end: 3 } }),
      rootElement,
      mode: 'form',
      onChange,
      options: { font },
      _cache: getCache(),
      theme: { colorPrimary: '#1677ff' },
    } as Parameters<typeof uiRender>[0]);

    const rows = Array.from(rootElement.children) as HTMLDivElement[];
    const firstBody = rows[0].children[1] as HTMLElement;
    firstBody.innerText = 'Updated two';
    firstBody.dispatchEvent(new window.Event('blur'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'content',
      value: 'One\nUpdated two\nThree\nFour',
    });
  });
});
