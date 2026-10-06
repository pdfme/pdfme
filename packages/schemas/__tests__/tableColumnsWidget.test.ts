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

const alignButton = (row: HTMLElement, control: string, value: string) =>
  row.querySelector<HTMLButtonElement>(`[data-control="${control}"] [data-value="${value}"]`);

const wideTable = (count: number) => {
  const table = baseTable();
  table.head = Array.from({ length: count }, (_, index) => `Col ${index + 1}`);
  table.headWidthPercentages = Array.from({ length: count }, () => 100 / count);
  table.content = JSON.stringify([Array.from({ length: count }, () => '')]);
  table.columnStyles = {
    alignment: { 1: 'right' },
    verticalAlignment: { 1: 'bottom' },
    cellType: { 1: 'image' },
    imageHeightMode: { 1: 'fixed' },
    imageHeight: { 1: 20 },
  };
  return table;
};

describe('TableColumns widget', () => {
  test('prop panel uses one Column Style card and does not bind columnStyles', () => {
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
    expect(keys).not.toContain('columnStyles');
    expect(keys.indexOf('tableColumns')).toBeGreaterThan(keys.indexOf('bodyStyles'));
    expect(schema.tableColumns).toMatchObject({
      title: 'schemas.table.columnStyle',
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
    expect(alignButton(rendered[0], 'alignment', 'left')).not.toBeNull();
    expect(alignButton(rendered[0], 'verticalAlignment', 'top')).not.toBeNull();
    expect(rendered[0].querySelector('[data-control="summary"]')).toBeNull();
    expect(rendered[0].querySelector('[data-control="collapse"]')).toBeNull();
    expect(changeSchemas).not.toHaveBeenCalled();
  });

  test('changing alignment keeps image settings and unknown column style keys', () => {
    const table = baseTable();
    table.columnStyles = {
      alignment: { 1: 'center' },
      verticalAlignment: { 1: 'middle' },
      cellType: { 1: 'image' },
      imageHeightMode: { 1: 'fixed' },
      imageHeight: { 1: 20 },
      fontName: { 0: 'Roboto' },
    } as TableSchema['columnStyles'];
    const { rootElement, changeSchemas } = renderColumns(table);
    const row = rows(rootElement)[1];
    const current = alignButton(row, 'alignment', 'center');
    expect(current?.getAttribute('aria-pressed')).toBe('true');
    current?.click();
    expect(changeSchemas).not.toHaveBeenCalled();

    alignButton(row, 'alignment', 'right')?.click();
    expect(stylesChange(changeSchemas)).toEqual([
      {
        key: 'columnStyles',
        value: {
          alignment: { 1: 'right' },
          verticalAlignment: { 1: 'middle' },
          cellType: { 1: 'image' },
          imageHeightMode: { 1: 'fixed' },
          imageHeight: { 1: 20 },
          fontName: { 0: 'Roboto' },
        },
        schemaId: 'table-1',
      },
    ]);
  });

  test('changing vertical alignment keeps cell type and horizontal alignment', () => {
    const table = baseTable();
    table.columnStyles = {
      alignment: { 0: 'left' },
      cellType: { 1: 'image' },
      imageHeightMode: { 1: 'auto' },
      imageHeight: { 1: 25 },
    };
    const { rootElement, changeSchemas } = renderColumns(table);
    const row = rows(rootElement)[1];
    expect(alignButton(row, 'verticalAlignment', 'top')?.getAttribute('aria-pressed')).toBe(
      'false',
    );
    alignButton(row, 'verticalAlignment', 'top')?.click();

    expect(stylesChange(changeSchemas)).toEqual([
      {
        key: 'columnStyles',
        value: {
          alignment: { 0: 'left' },
          verticalAlignment: { 1: 'top' },
          cellType: { 1: 'image' },
          imageHeightMode: { 1: 'auto' },
          imageHeight: { 1: 25 },
        },
        schemaId: 'table-1',
      },
    ]);
  });

  test('six columns stay expanded and seven start collapsed', () => {
    const six = renderColumns(wideTable(6));
    expect(six.rootElement.querySelector('[data-control="summary"]')).toBeNull();
    expect(six.rootElement.querySelector('[data-control="collapse"]')).toBeNull();
    expect(
      (six.rootElement.querySelector('[data-control="column-body"]') as HTMLElement).hidden,
    ).toBe(false);

    const seven = renderColumns(wideTable(7));
    const blocks = rows(seven.rootElement);
    expect(blocks).toHaveLength(7);
    const image = blocks[1];
    const summary = image.querySelector<HTMLButtonElement>('[data-control="summary"]');
    const body = image.querySelector<HTMLElement>('[data-control="column-body"]');
    expect(summary).not.toBeNull();
    expect(summary?.hidden).toBe(false);
    expect(body?.hidden).toBe(true);
    expect(summary?.getAttribute('aria-label')).toBe('Expand Col 2');
    expect(summary?.querySelector('[data-control="summary-name"]')?.textContent).toBe('Col 2');
    expect(summary?.querySelector('[data-control="summary-type"]')?.textContent).toBe(
      'schemas.table.cellType.image',
    );
    expect(
      summary?.querySelector('[data-control="summary-alignment"]')?.getAttribute('data-value'),
    ).toBe('right');
    expect(
      summary
        ?.querySelector('[data-control="summary-vertical-alignment"]')
        ?.getAttribute('data-value'),
    ).toBe('bottom');
    expect(summary?.querySelector('[data-control="summary-height"]')?.textContent).toBe('20mm');
    expect(blocks[0].querySelector('[data-control="summary-alignment"]')).toBeNull();

    summary?.click();
    expect(summary?.hidden).toBe(true);
    expect(body?.hidden).toBe(false);
    const collapse = image.querySelector<HTMLButtonElement>('[data-control="collapse"]');
    expect(collapse?.getAttribute('aria-label')).toBe('Collapse Col 2');
    collapse?.click();
    expect(summary?.hidden).toBe(false);
    expect(body?.hidden).toBe(true);
    expect(seven.changeSchemas).not.toHaveBeenCalled();
  });

  test('keeps an expanded column open across re-renders', () => {
    const table = wideTable(7);
    const first = renderColumns(table);
    rows(first.rootElement)[2]
      .querySelector<HTMLButtonElement>('[data-control="summary"]')
      ?.click();

    const second = renderColumns(table);
    const again = rows(second.rootElement)[2];
    expect(again.querySelector<HTMLElement>('[data-control="column-body"]')?.hidden).toBe(false);
    expect(again.querySelector<HTMLElement>('[data-control="summary"]')?.hidden).toBe(true);
    expect(
      rows(second.rootElement)[0].querySelector<HTMLElement>('[data-control="column-body"]')
        ?.hidden,
    ).toBe(true);

    again.querySelector<HTMLButtonElement>('[data-control="collapse"]')?.click();
    const third = renderColumns(table);
    expect(
      rows(third.rootElement)[2].querySelector<HTMLElement>('[data-control="column-body"]')?.hidden,
    ).toBe(true);
  });

  test('uses theme tokens for alignment borders, icons, and dividers', () => {
    const table = baseTable();
    const rootElement = document.createElement('div');
    TableColumns({
      rootElement,
      changeSchemas: vi.fn(),
      activeSchema: table,
      i18n,
      theme: {
        colorPrimary: '#112233',
        colorPrimaryBg: '#ffffff',
        colorWhite: '#ffffff',
        colorBorder: '#aabbcc',
        colorText: '#123456',
        colorSplit: '#ddeeff',
      },
    } as unknown as PropPanelWidgetProps);
    const button = alignButton(rows(rootElement)[0], 'alignment', 'left');
    expect(button?.style.borderColor).toBe('rgb(170, 187, 204)');
    expect(button?.querySelector('img')?.getAttribute('src')).toContain(
      encodeURIComponent('#123456'),
    );
    expect(rows(rootElement)[0].style.borderBottomColor).toBe('rgb(221, 238, 255)');
  });

  test('styles selects and the height input like antd controls', () => {
    const table = baseTable();
    table.columnStyles = {
      cellType: { 1: 'image' },
      imageHeightMode: { 1: 'fixed' },
      imageHeight: { 1: 20 },
    };
    const rootElement = document.createElement('div');
    TableColumns({
      rootElement,
      changeSchemas: vi.fn(),
      activeSchema: table,
      i18n,
      theme: {
        colorPrimary: '#112233',
        colorPrimaryHover: '#445566',
        colorBorder: '#aabbcc',
        colorBgContainer: '#fefefe',
        colorText: '#123456',
        colorTextQuaternary: '#778899',
        colorIcon: '#99aabb',
        controlOutline: 'rgba(1, 2, 3, 0.2)',
        borderRadius: 8,
        controlHeight: 40,
        fontSize: 16,
        lineWidth: 2,
        paddingSM: 14,
        controlHeightSM: 28,
        controlOutlineWidth: 3,
      },
    } as unknown as PropPanelWidgetProps);

    const select = control(rows(rootElement)[0], 'cellType') as HTMLSelectElement;
    const shell = select.parentElement as HTMLElement;
    expect(shell.className).toBe('pdfme-column-select');
    expect(shell.style.height).toBe('40px');
    expect(shell.style.borderRadius).toBe('8px');
    expect(shell.style.borderWidth).toBe('2px');
    expect(shell.style.borderColor).toBe('rgb(170, 187, 204)');
    expect(shell.style.backgroundColor).toBe('rgb(254, 254, 254)');
    expect(select.style.fontSize).toBe('16px');
    expect(select.style.paddingLeft).toBe('12px');
    expect(select.style.paddingRight).toBe('30px');
    expect(select.style.color).toBe('rgb(18, 52, 86)');
    expect(shell.querySelector('.pdfme-column-select-arrow svg')).not.toBeNull();
    expect((shell.querySelector('.pdfme-column-select-arrow') as HTMLElement).style.color).toBe(
      'rgb(119, 136, 153)',
    );

    const input = control(rows(rootElement)[1], 'imageHeight') as HTMLInputElement;
    const numberShell = input.parentElement as HTMLElement;
    expect(numberShell.className).toBe('pdfme-column-number');
    expect(numberShell.style.height).toBe('40px');
    expect(numberShell.style.borderRadius).toBe('8px');
    expect(input.style.borderWidth).toBe('0px');
    expect(numberShell.querySelector('[aria-label="Increase Value"]')).not.toBeNull();
    expect(numberShell.querySelector('[aria-label="Decrease Value"]')).not.toBeNull();

    expect(rootElement.style.getPropertyValue('--pdfme-hover-border')).toBe('#445566');
    expect(rootElement.style.getPropertyValue('--pdfme-active-border')).toBe('#112233');
    expect(rootElement.style.getPropertyValue('--pdfme-outline')).toBe('rgba(1, 2, 3, 0.2)');
    expect(rootElement.style.getPropertyValue('--pdfme-outline-width')).toBe('3px');
    expect(rootElement.style.getPropertyValue('--pdfme-handle-width')).toBe('24px');
    const css = rootElement.querySelector('style')?.textContent ?? '';
    expect(css).toContain('.pdfme-column-select:hover');
    expect(css).toContain('.pdfme-column-number:focus-within');
    expect(css).toContain('appearance: none');
    expect(css).toContain('appearance: textfield');
  });

  test('height steppers commit one millimeter and stop at 1', () => {
    const table = baseTable();
    table.columnStyles = {
      cellType: { 1: 'image' },
      imageHeightMode: { 1: 'fixed' },
      imageHeight: { 1: 20 },
    };
    const { rootElement, changeSchemas } = renderColumns(table);
    const row = rows(rootElement)[1];
    const input = control(row, 'imageHeight') as HTMLInputElement;
    row.querySelector<HTMLButtonElement>('[data-control="imageHeightUp"]')?.click();
    expect(input.value).toBe('21');
    expect(stylesChange(changeSchemas)[0].value).toMatchObject({ imageHeight: { 1: 21 } });

    changeSchemas.mockClear();
    input.value = '1';
    row.querySelector<HTMLButtonElement>('[data-control="imageHeightDown"]')?.click();
    expect(input.value).toBe('1');
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
      alignment: { 1: 'center' },
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
          alignment: { 1: 'center' },
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
