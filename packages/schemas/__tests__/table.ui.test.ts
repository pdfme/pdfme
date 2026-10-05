// @vitest-environment jsdom

import { getDefaultFont } from '@pdfme/common';
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
