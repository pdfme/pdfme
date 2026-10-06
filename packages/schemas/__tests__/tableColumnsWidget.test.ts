// @vitest-environment jsdom

import type { PropPanelWidgetProps } from '@pdfme/common';
import { DEFAULT_FONT_NAME } from '@pdfme/common';
import { TableColumns } from '../src/tables/columnsWidget.js';
import { propPanel } from '../src/tables/propPanel.js';
import type { TableSchema } from '../src/tables/types.js';

const i18n = (key: string) => key;

const baseTable = (): TableSchema & { id: string } =>
  ({
    id: 'table-1',
    name: 'items',
    type: 'table',
    position: { x: 0, y: 0 },
    width: 150,
    height: 40,
    content: JSON.stringify([
      ['Pen', 'photo-a', 'Blue'],
      ['Cup', 'photo-b', 'White'],
    ]),
    showHead: true,
    head: ['Item', '', 'Note'],
    headWidthPercentages: [30, 30, 40],
    tableStyles: { borderColor: '#000000', borderWidth: 0.3 },
    headStyles: {},
    bodyStyles: {},
    columnStyles: {},
  }) as TableSchema & { id: string };

const renderColumns = (table: TableSchema & { id: string }) => {
  const rootElement = document.createElement('div');
  const changeSchemas = vi.fn();
  TableColumns({
    rootElement,
    changeSchemas,
    activeSchema: table,
    i18n,
  } as unknown as PropPanelWidgetProps);
  return { rootElement, changeSchemas };
};

const rows = (root: HTMLElement) => [
  ...root.querySelectorAll<HTMLDivElement>(':scope > div[data-column-index]'),
];

const control = (row: HTMLElement, name: string) =>
  row.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-control="${name}"]`);

const stylesChange = (changeSchemas: ReturnType<typeof vi.fn>) => {
  expect(changeSchemas).toHaveBeenCalledTimes(1);
  const changes = changeSchemas.mock.calls[0][0] as { key: string; value: unknown }[];
  return changes;
};

describe('TableColumns widget', () => {
  test('prop panel places the Columns card immediately before Column Style', () => {
    if (typeof propPanel.schema !== 'function') {
      throw new Error('table propPanel schema should be a function');
    }
    const schema = propPanel.schema({
      activeSchema: baseTable(),
      activeElements: [],
      changeSchemas: () => undefined,
      schemas: [],
      options: { font: { [DEFAULT_FONT_NAME]: { data: '', fallback: true } } },
      theme: {},
      i18n,
    } as unknown as Omit<PropPanelWidgetProps, 'rootElement'>);
    const keys = Object.keys(schema);
    expect(keys.indexOf('tableColumns')).toBe(keys.indexOf('columnStyles') - 1);
    expect(schema.tableColumns).toMatchObject({
      title: 'schemas.table.columns',
      type: 'object',
      widget: 'Card',
      bind: false,
      span: 24,
    });
    expect(schema.tableColumns.properties).toMatchObject({
      columns: { type: 'void', widget: 'TableColumns', bind: false, span: 24 },
    });
    expect(propPanel.widgets?.TableColumns).toBe(TableColumns);
  });

  test('renders one row per column and the current type', () => {
    const table = baseTable();
    table.columnStyles = {
      cellType: { 2: 'image' },
      imageHeightMode: { 2: 'fixed' },
      imageHeight: { 2: 20 },
    };
    const { rootElement, changeSchemas } = renderColumns(table);
    const rendered = rows(rootElement);

    expect(rendered).toHaveLength(3);
    expect(rendered.map((row) => control(row, 'label')?.textContent)).toEqual([
      'Item',
      'schemas.table.columnLabel 2',
      'Note',
    ]);
    expect((control(rendered[0], 'cellType') as HTMLSelectElement).value).toBe('text');
    expect(control(rendered[0], 'imageHeightMode')).toBeNull();
    expect((control(rendered[2], 'cellType') as HTMLSelectElement).value).toBe('image');
    expect((control(rendered[2], 'imageHeightMode') as HTMLSelectElement).value).toBe('fixed');
    const height = control(rendered[2], 'imageHeight') as HTMLInputElement;
    expect(height.value).toBe('20');
    expect(height.min).toBe('1');
    expect(height.step).toBe('1');
    expect(changeSchemas).not.toHaveBeenCalled();
  });

  test('text to image sets defaults, centers only a missing alignment, and clears that column', () => {
    const table = baseTable();
    table.columnStyles = { alignment: { 2: 'right' }, cellType: { 2: 'text' } };
    const { rootElement, changeSchemas } = renderColumns(table);
    const select = control(rows(rootElement)[0], 'cellType') as HTMLSelectElement;
    select.value = 'image';
    select.dispatchEvent(new Event('change'));

    const changes = stylesChange(changeSchemas);
    expect(changes).toEqual([
      {
        key: 'columnStyles',
        value: {
          alignment: { 0: 'center', 2: 'right' },
          cellType: { 0: 'image', 2: 'text' },
          imageHeightMode: { 0: 'fixed' },
          imageHeight: { 0: 20 },
        },
        schemaId: 'table-1',
      },
      {
        key: 'content',
        value: JSON.stringify([
          ['', 'photo-a', 'Blue'],
          ['', 'photo-b', 'White'],
        ]),
        schemaId: 'table-1',
      },
    ]);
  });

  test('text to image keeps an alignment that is already set', () => {
    const table = baseTable();
    table.columnStyles = { alignment: { 0: 'left', 2: 'right' } };
    const { rootElement, changeSchemas } = renderColumns(table);
    const select = control(rows(rootElement)[0], 'cellType') as HTMLSelectElement;
    select.value = 'image';
    select.dispatchEvent(new Event('change'));

    const changes = stylesChange(changeSchemas);
    expect(changes[0]).toMatchObject({
      key: 'columnStyles',
      value: {
        alignment: { 0: 'left', 2: 'right' },
        cellType: { 0: 'image' },
        imageHeightMode: { 0: 'fixed' },
        imageHeight: { 0: 20 },
      },
    });
  });

  test('image to text drops empty maps, clears the column, and keeps alignment', () => {
    const table = baseTable();
    table.columnStyles = {
      alignment: { 1: 'right' },
      cellType: { 1: 'image', 2: 'text' },
      imageHeightMode: { 1: 'auto' },
      imageHeight: { 1: 25 },
    };
    const { rootElement, changeSchemas } = renderColumns(table);
    const select = control(rows(rootElement)[1], 'cellType') as HTMLSelectElement;
    select.value = 'text';
    select.dispatchEvent(new Event('change'));

    const changes = stylesChange(changeSchemas);
    expect(changes).toEqual([
      {
        key: 'columnStyles',
        value: {
          alignment: { 1: 'right' },
          cellType: { 2: 'text' },
        },
        schemaId: 'table-1',
      },
      {
        key: 'content',
        value: JSON.stringify([
          ['Pen', '', 'Blue'],
          ['Cup', '', 'White'],
        ]),
        schemaId: 'table-1',
      },
    ]);
  });

  test('image to text removes maps that become empty', () => {
    const table = baseTable();
    table.columnStyles = {
      alignment: { 0: 'center' },
      cellType: { 0: 'image' },
      imageHeightMode: { 0: 'fixed' },
      imageHeight: { 0: 20 },
    };
    const { rootElement, changeSchemas } = renderColumns(table);
    const select = control(rows(rootElement)[0], 'cellType') as HTMLSelectElement;
    select.value = 'text';
    select.dispatchEvent(new Event('change'));

    expect(stylesChange(changeSchemas)[0]).toEqual({
      key: 'columnStyles',
      value: { alignment: { 0: 'center' } },
      schemaId: 'table-1',
    });
  });

  test('fixed to auto keeps imageHeight and does not send content', () => {
    const table = baseTable();
    table.columnStyles = {
      cellType: { 1: 'image' },
      imageHeightMode: { 1: 'fixed' },
      imageHeight: { 1: 25 },
      alignment: { 1: 'center' },
    };
    const { rootElement, changeSchemas } = renderColumns(table);
    const select = control(rows(rootElement)[1], 'imageHeightMode') as HTMLSelectElement;
    select.value = 'auto';
    select.dispatchEvent(new Event('change'));

    expect(stylesChange(changeSchemas)).toEqual([
      {
        key: 'columnStyles',
        value: {
          cellType: { 1: 'image' },
          imageHeightMode: { 1: 'auto' },
          imageHeight: { 1: 25 },
          alignment: { 1: 'center' },
        },
        schemaId: 'table-1',
      },
    ]);
  });

  test('writes a positive height and ignores 0, -1, and NaN', () => {
    const table = baseTable();
    table.columnStyles = {
      cellType: { 1: 'image' },
      imageHeightMode: { 1: 'fixed' },
      imageHeight: { 1: 20 },
    };
    const { rootElement, changeSchemas } = renderColumns(table);
    const input = control(rows(rootElement)[1], 'imageHeight') as HTMLInputElement;

    input.value = '25';
    input.dispatchEvent(new Event('change'));
    expect(stylesChange(changeSchemas)).toEqual([
      {
        key: 'columnStyles',
        value: {
          cellType: { 1: 'image' },
          imageHeightMode: { 1: 'fixed' },
          imageHeight: { 1: 25 },
        },
        schemaId: 'table-1',
      },
    ]);

    for (const invalid of ['0', '-1', 'NaN']) {
      changeSchemas.mockClear();
      input.value = invalid;
      input.dispatchEvent(new Event('change'));
      expect(changeSchemas).not.toHaveBeenCalled();
      expect(input.value).toBe('20');
    }
  });

  test('shows an unknown cell type as text until it is changed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const table = baseTable();
    table.columnStyles = { cellType: { 0: 'qrcode' as 'text' } };
    const { rootElement, changeSchemas } = renderColumns(table);
    const select = control(rows(rootElement)[0], 'cellType') as HTMLSelectElement;

    expect(select.value).toBe('text');
    expect(changeSchemas).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
