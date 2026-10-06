// @vitest-environment jsdom

import { getDefaultFont } from '@pdfme/common';
import { WIDE_3_1_PNG } from './assets/tableImages.js';
import { getDefaultCellStyles } from '../src/tables/helper.js';
import { uiRender } from '../src/tables/uiRender.js';
import type { TableSchema } from '../src/tables/types.js';

const basePdf = {
  width: 210,
  height: 297,
  padding: [10, 10, 10, 10] as [number, number, number, number],
};

const tableValue = JSON.stringify([
  ['Alice', 'New York', 'Designer'],
  ['Bob', 'Paris', 'Illustrator'],
]);

const getSchema = (): TableSchema =>
  ({
    name: 'items',
    type: 'table',
    position: { x: 0, y: 0 },
    width: 150,
    height: 40,
    content: tableValue,
    showHead: true,
    head: ['Name', 'City', 'Description'],
    headWidthPercentages: [30, 30, 40],
    tableStyles: { borderColor: '#000000', borderWidth: 0.3 },
    headStyles: {
      ...getDefaultCellStyles(),
      fontColor: '#ffffff',
      backgroundColor: '#2980ba',
      borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    bodyStyles: {
      ...getDefaultCellStyles(),
      alternateBackgroundColor: '#f5f5f5',
    },
    columnStyles: {
      alignment: { 2: 'right' },
      fontName: { 2: 'NotoSans' },
    },
  }) as TableSchema;

describe('table column removal', () => {
  test('remove column includes remapped columnStyles in onChange', async () => {
    const rootElement = document.createElement('div');
    const onChange = vi.fn();
    const schema = getSchema();

    await uiRender({
      value: tableValue,
      schema,
      rootElement,
      mode: 'designer',
      onChange,
      basePdf,
      options: { font: getDefaultFont() },
      theme: { colorPrimary: '#1677ff' },
      i18n: (key: string) => key,
      scale: 1,
      _cache: new Map(),
    });

    const removeButtons = rootElement.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Remove column"]',
    );
    expect(removeButtons).toHaveLength(3);

    removeButtons[0].click();

    const batch = onChange.mock.calls
      .map(([change]) => change)
      .find(
        (change) =>
          Array.isArray(change) &&
          change.some((entry: { key: string }) => entry.key === 'columnStyles'),
      );

    expect(batch).toHaveLength(4);
    expect(batch).toEqual(
      expect.arrayContaining([
        { key: 'head', value: ['City', 'Description'] },
        {
          key: 'headWidthPercentages',
          value: [expect.closeTo(42.857142857, 5), expect.closeTo(57.142857143, 5)],
        },
        {
          key: 'content',
          value: JSON.stringify([
            ['New York', 'Designer'],
            ['Paris', 'Illustrator'],
          ]),
        },
        {
          key: 'columnStyles',
          value: {
            alignment: { 1: 'right' },
            fontName: { 1: 'NotoSans' },
          },
        },
      ]),
    );
  });
});

describe('table image cells', () => {
  test('shows an img and no file input in viewer, form, and designer', async () => {
    const schema = getSchema();
    schema.columnStyles = {
      ...schema.columnStyles,
      alignment: { 1: 'center' },
      cellType: { 1: 'image' },
    };
    schema.bodyStyles = { ...schema.bodyStyles, verticalAlignment: 'middle' };
    const value = JSON.stringify([
      ['Alice', WIDE_3_1_PNG, 'Designer'],
      ['Bob', 'not-an-image', 'Illustrator'],
    ]);

    for (const mode of ['viewer', 'form', 'designer'] as const) {
      const rootElement = document.createElement('div');
      await uiRender({
        value,
        schema,
        rootElement,
        mode,
        onChange: vi.fn(),
        basePdf,
        options: { font: getDefaultFont() },
        theme: { colorPrimary: '#1677ff' },
        i18n: (key: string) => key,
        scale: 1,
        _cache: new Map(),
      });

      const images = [...rootElement.querySelectorAll('img')];
      expect(images).toHaveLength(1);
      expect(images[0].getAttribute('src')).toBe(WIDE_3_1_PNG);
      expect(images[0].style.objectFit).toBe('contain');
      expect(images[0].style.objectPosition).toBe('center center');
      expect(rootElement.querySelector('input[type="file"]')).toBeNull();
    }
  });

  test('keeps an image cell display-only when selected and still edits text cells', async () => {
    const schema = getSchema();
    schema.columnStyles = {
      ...schema.columnStyles,
      alignment: { 1: 'center' },
      cellType: { 1: 'image' },
    };
    const value = JSON.stringify([
      ['Alice', WIDE_3_1_PNG, 'Designer'],
      ['Bob', 'not-an-image', 'Illustrator'],
    ]);
    const rootElement = document.createElement('div');
    await uiRender({
      value,
      schema,
      rootElement,
      mode: 'designer',
      onChange: vi.fn(),
      basePdf,
      options: { font: getDefaultFont() },
      theme: { colorPrimary: '#1677ff' },
      i18n: (key: string) => key,
      scale: 1,
      _cache: new Map(),
    });

    const image = rootElement.querySelector('img');
    expect(image).not.toBeNull();
    expect(image!.parentElement!.parentElement!.style.cursor).toBe('default');

    const isEditor = (element: HTMLElement) =>
      element.contentEditable === 'plaintext-only' || element.contentEditable === 'true';
    const editors = () => [...rootElement.querySelectorAll('div')].filter(isEditor);
    await vi.waitFor(() => {
      expect(editors().length).toBeGreaterThan(0);
    });

    const before = rootElement.querySelector('img')!;
    before.click();
    await vi.waitFor(() => {
      const imageCell = rootElement.querySelector('img')?.parentElement?.parentElement;
      expect(rootElement.querySelector('img')).not.toBe(before);
      expect(imageCell).toBeDefined();
      expect([...imageCell!.querySelectorAll('div')].some(isEditor)).toBe(false);
      expect(editors().length).toBeGreaterThan(0);
      expect(rootElement.querySelector('input[type="file"]')).toBeNull();
      expect(imageCell!.style.cursor).toBe('default');
    });
  });
});
