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
      verticalAlignment: { 2: 'bottom' },
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
            verticalAlignment: { 1: 'bottom' },
            fontName: { 1: 'NotoSans' },
          },
        },
      ]),
    );
  });
});

const getImageSchema = (): TableSchema => {
  const schema = getSchema();
  schema.columnStyles = {
    alignment: { 1: 'center' },
    cellType: { 1: 'image' },
    imageHeightMode: { 1: 'fixed' },
    imageHeight: { 1: 20 },
  };
  schema.bodyStyles = { ...schema.bodyStyles, verticalAlignment: 'middle' };
  return schema;
};

const imageValue = JSON.stringify([
  ['Alice', WIDE_3_1_PNG, 'Designer'],
  ['Bob', 'not-an-image', 'Illustrator'],
]);

const renderImageTable = async (options: {
  mode: 'viewer' | 'form' | 'designer';
  value?: string;
  schema?: TableSchema;
  readOnly?: boolean;
  onChange?: ReturnType<typeof vi.fn>;
}) => {
  const schema = options.schema ?? getImageSchema();
  if (options.readOnly) schema.readOnly = true;
  const rootElement = document.createElement('div');
  const onChange = options.onChange ?? vi.fn();
  const arg = {
    value: options.value ?? imageValue,
    schema,
    rootElement,
    onChange,
    basePdf,
    options: { font: getDefaultFont() },
    theme: { colorPrimary: '#1677ff' },
    i18n: (key: string) => key,
    scale: 1,
    _cache: new Map(),
  };
  // Viewer mode clears the module-level editing cursor left by an earlier test.
  await uiRender({ ...arg, mode: 'viewer', onChange: () => undefined });
  rootElement.innerHTML = '';
  await uiRender({ ...arg, mode: options.mode });
  const rerender = async (nextValue?: string) => {
    if (nextValue !== undefined) arg.value = nextValue;
    await uiRender({ ...arg, mode: options.mode });
  };
  return { rootElement, onChange, schema, rerender };
};

const fileList = (file: File): FileList => {
  const list = Object.create(FileList.prototype) as FileList;
  Object.defineProperty(list, '0', { value: file });
  Object.defineProperty(list, 'length', { value: 1 });
  list.item = (index: number) => (index === 0 ? file : null);
  return list;
};

const setInputFile = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, 'files', { configurable: true, value: fileList(file) });
  input.dispatchEvent(new Event('change'));
};

const emptyFileList = (): FileList => {
  const list = Object.create(FileList.prototype) as FileList;
  Object.defineProperty(list, 'length', { value: 0 });
  list.item = () => null;
  return list;
};

const fileFromDataUrl = (dataUrl: string, name: string, type: string) => {
  const encoded = dataUrl.split(',')[1] ?? '';
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  return new File([bytes], name, { type });
};

const emptyImageCell = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLDivElement>('div')].find(
    (element) => element.style.cursor === 'pointer' && element.querySelector('img') === null,
  );

const isEditor = (element: HTMLElement) =>
  element.contentEditable === 'plaintext-only' || element.contentEditable === 'true';

const fileInputs = (root: ParentNode) => [
  ...root.querySelectorAll<HTMLInputElement>('input[type="file"]'),
];

const buttonByLabel = (root: ParentNode, label: string) =>
  root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

const contentChanges = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls
    .map(([change]) => change)
    .filter((change) => change && !Array.isArray(change) && change.key === 'content');

describe('table image cells', () => {
  test('viewer shows only the resolved image', async () => {
    const { rootElement } = await renderImageTable({ mode: 'viewer' });

    const images = [...rootElement.querySelectorAll('img')];
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe(WIDE_3_1_PNG);
    expect(images[0].style.objectFit).toBe('contain');
    expect(images[0].style.objectPosition).toBe('center center');
    expect(fileInputs(rootElement)).toHaveLength(0);
    expect(buttonByLabel(rootElement, 'schemas.table.imageCell.select')).toBeNull();
    expect(buttonByLabel(rootElement, 'schemas.table.imageCell.remove')).toBeNull();
    expect(images[0].parentElement!.parentElement!.style.cursor).toBe('default');
  });

  test('image objectPosition follows column verticalAlignment', async () => {
    const schema = getImageSchema();
    schema.columnStyles = {
      ...schema.columnStyles,
      verticalAlignment: { 1: 'top' },
    };
    const { rootElement } = await renderImageTable({ mode: 'viewer', schema });
    const images = [...rootElement.querySelectorAll('img')];
    expect(images).toHaveLength(1);
    expect(images[0].style.objectPosition).toBe('center top');
  });

  test('designer edits only the selected image cell', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    const { rootElement } = await renderImageTable({ mode: 'designer' });

    const before = rootElement.querySelector('img');
    expect(before).not.toBeNull();
    expect(before!.parentElement!.parentElement!.style.cursor).toBe('pointer');
    expect(fileInputs(rootElement)).toHaveLength(0);
    expect(
      [...rootElement.querySelectorAll<HTMLDivElement>('div')].some(
        (element) => element.style.cursor === 'text',
      ),
    ).toBe(true);

    const editors = () => [...rootElement.querySelectorAll('div')].filter(isEditor);
    await vi.waitFor(() => {
      expect(editors().length).toBeGreaterThan(0);
    });

    before!.click();
    await vi.waitFor(() => {
      expect(fileInputs(rootElement)).toHaveLength(1);
    });

    const imageCell = rootElement.querySelector('img')?.parentElement?.parentElement;
    expect(imageCell).toBeDefined();
    expect(fileInputs(imageCell!)).toHaveLength(1);
    expect(fileInputs(imageCell!)[0].accept).toBe('image/png, image/jpeg');
    expect(buttonByLabel(imageCell!, 'schemas.table.imageCell.select')).not.toBeNull();
    expect(buttonByLabel(imageCell!, 'schemas.table.imageCell.remove')).not.toBeNull();
    expect([...imageCell!.querySelectorAll('div')].some(isEditor)).toBe(false);
    expect(editors().length).toBeGreaterThan(0);
    expect(fileInputs(rootElement)).toHaveLength(1);
    expect(click).not.toHaveBeenCalled();
    expect(imageCell!.style.cursor).toBe('pointer');
    click.mockRestore();
  });

  test.each(['designer', 'form'] as const)(
    '%s opens the file dialog only when an empty image cell is clicked',
    async (mode) => {
      const click = vi
        .spyOn(HTMLInputElement.prototype, 'click')
        .mockImplementation(() => undefined);
      const value = JSON.stringify([
        ['Alice', '', 'Designer'],
        ['Bob', WIDE_3_1_PNG, 'Illustrator'],
      ]);
      const { rootElement, onChange, rerender } = await renderImageTable({ mode, value });
      const emptyCell = emptyImageCell(rootElement);
      expect(emptyCell).toBeDefined();

      emptyCell!.click();
      await vi.waitFor(() => {
        expect(fileInputs(rootElement)).toHaveLength(1);
      });

      const editor = fileInputs(rootElement)[0].parentElement!;
      expect(editor.textContent).toContain('schemas.table.imageCell.placeholder');
      expect(buttonByLabel(editor, 'schemas.table.imageCell.select')).not.toBeNull();
      expect(buttonByLabel(editor, 'schemas.table.imageCell.remove')).toBeNull();
      expect(editor.querySelector('img')).toBeNull();
      expect(click).toHaveBeenCalledTimes(1);

      await rerender();
      await rerender();
      expect(click).toHaveBeenCalledTimes(1);
      expect(fileInputs(rootElement)).toHaveLength(1);

      emptyImageCell(rootElement)!.click();
      await vi.waitFor(() => {
        expect(fileInputs(rootElement)).toHaveLength(1);
      });
      expect(click).toHaveBeenCalledTimes(1);

      const beforeAdd = contentChanges(onChange).length;
      buttonByLabel(rootElement, 'Add row')!.click();
      expect(contentChanges(onChange).length).toBe(beforeAdd + 1);
      await rerender(contentChanges(onChange).at(-1).value as string);
      await rerender();
      expect(click).toHaveBeenCalledTimes(1);
      click.mockRestore();
    },
  );

  test.each(['designer', 'form'] as const)(
    '%s does not open the file dialog when a removed image rerenders',
    async (mode) => {
      const click = vi
        .spyOn(HTMLInputElement.prototype, 'click')
        .mockImplementation(() => undefined);
      const { rootElement, onChange, rerender } = await renderImageTable({ mode });
      rootElement.querySelector('img')!.click();
      await vi.waitFor(() => {
        expect(buttonByLabel(rootElement, 'schemas.table.imageCell.remove')).not.toBeNull();
      });
      expect(click).not.toHaveBeenCalled();

      buttonByLabel(rootElement, 'schemas.table.imageCell.remove')!.click();
      const cleared = JSON.parse(contentChanges(onChange).at(-1).value as string) as string[][];
      expect(cleared[0][1]).toBe('');
      await rerender(JSON.stringify(cleared));
      await rerender();
      expect(click).not.toHaveBeenCalled();
      expect(fileInputs(rootElement)).toHaveLength(1);
      click.mockRestore();
    },
  );

  test('writes a PNG data URL into the selected cell and ignores a gif', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rootElement, onChange } = await renderImageTable({ mode: 'designer' });
    rootElement.querySelector('img')!.click();
    await vi.waitFor(() => {
      expect(fileInputs(rootElement)).toHaveLength(1);
    });

    const input = fileInputs(rootElement)[0];
    const png = fileFromDataUrl(WIDE_3_1_PNG, 'photo.png', 'image/png');
    setInputFile(input, png);

    await vi.waitFor(() => {
      expect(contentChanges(onChange).length).toBeGreaterThan(0);
    });
    const pngContent = JSON.parse(contentChanges(onChange).at(-1).value as string) as string[][];
    expect(pngContent[0][1]).toMatch(/^data:image\/png;base64,/);
    expect(pngContent[0][0]).toBe('Alice');
    expect(pngContent[0][2]).toBe('Designer');
    expect(pngContent[1][1]).toBe('not-an-image');

    const beforeGif = contentChanges(onChange).length;
    const gif = new File([new Uint8Array([1, 2, 3])], 'anim.gif', { type: 'image/gif' });
    setInputFile(input, gif);
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalled();
    });
    expect(contentChanges(onChange)).toHaveLength(beforeGif);
    warn.mockRestore();
  });

  test('canceling the file dialog does not warn', async () => {
    const { rootElement, onChange } = await renderImageTable({ mode: 'designer' });
    rootElement.querySelector('img')!.click();
    await vi.waitFor(() => {
      expect(fileInputs(rootElement)).toHaveLength(1);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const before = contentChanges(onChange).length;
    const input = fileInputs(rootElement)[0];
    Object.defineProperty(input, 'files', { configurable: true, value: emptyFileList() });
    input.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(warn).not.toHaveBeenCalled();
    expect(contentChanges(onChange)).toHaveLength(before);
    warn.mockRestore();
  });

  test('does not write a PNG whose header cannot be read', async () => {
    const { rootElement, onChange } = await renderImageTable({ mode: 'designer' });
    rootElement.querySelector('img')!.click();
    await vi.waitFor(() => {
      expect(fileInputs(rootElement)).toHaveLength(1);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const before = contentChanges(onChange).length;
    const png = new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' });
    setInputFile(fileInputs(rootElement)[0], png);
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalled();
    });
    expect(contentChanges(onChange)).toHaveLength(before);
    warn.mockRestore();
  });

  test('remove clears the selected image cell', async () => {
    const { rootElement, onChange } = await renderImageTable({ mode: 'designer' });
    rootElement.querySelector('img')!.click();
    await vi.waitFor(() => {
      expect(buttonByLabel(rootElement, 'schemas.table.imageCell.remove')).not.toBeNull();
    });

    buttonByLabel(rootElement, 'schemas.table.imageCell.remove')!.click();
    const cleared = JSON.parse(contentChanges(onChange).at(-1).value as string) as string[][];
    expect(cleared[0][1]).toBe('');
    expect(cleared[0][0]).toBe('Alice');
    expect(cleared[1][1]).toBe('not-an-image');
  });

  test('form readOnly has no editor and a default cursor', async () => {
    const { rootElement } = await renderImageTable({ mode: 'form', readOnly: true });
    const image = rootElement.querySelector('img')!;
    expect(image.parentElement!.parentElement!.style.cursor).toBe('default');
    const before = image;
    image.click();
    await vi.waitFor(() => {
      expect(rootElement.querySelector('img')).not.toBe(before);
    });
    expect(fileInputs(rootElement)).toHaveLength(0);
    expect(buttonByLabel(rootElement, 'schemas.table.imageCell.select')).toBeNull();
    expect(buttonByLabel(rootElement, 'schemas.table.imageCell.remove')).toBeNull();
    expect(rootElement.querySelector('img')!.parentElement!.parentElement!.style.cursor).toBe(
      'default',
    );
  });

  test('editable form shows the image editor after the cell is clicked', async () => {
    const { rootElement } = await renderImageTable({ mode: 'form' });
    const image = rootElement.querySelector('img')!;
    expect(image.parentElement!.parentElement!.style.cursor).toBe('pointer');
    expect(fileInputs(rootElement)).toHaveLength(0);

    image.click();
    await vi.waitFor(() => {
      expect(buttonByLabel(rootElement, 'schemas.table.imageCell.select')).not.toBeNull();
    });
    expect(fileInputs(rootElement)).toHaveLength(1);
    expect(buttonByLabel(rootElement, 'schemas.table.imageCell.remove')).not.toBeNull();
    expect(rootElement.querySelector('img')!.parentElement!.parentElement!.style.cursor).toBe(
      'pointer',
    );
  });

  test('removing a column remaps image cell styles', async () => {
    const schema = getImageSchema();
    schema.columnStyles = {
      alignment: { 2: 'right' },
      cellType: { 1: 'image', 2: 'text' },
      imageHeightMode: { 1: 'fixed', 2: 'auto' },
      imageHeight: { 1: 20, 2: 30 },
    };
    const { rootElement, onChange } = await renderImageTable({
      mode: 'designer',
      schema,
      value: tableValue,
    });

    const removeButtons = rootElement.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Remove column"]',
    );
    removeButtons[0].click();

    const batch = onChange.mock.calls
      .map(([change]) => change)
      .find(
        (change) =>
          Array.isArray(change) &&
          change.some((entry: { key: string }) => entry.key === 'columnStyles'),
      );
    expect(batch).toEqual(
      expect.arrayContaining([
        {
          key: 'columnStyles',
          value: {
            alignment: { 1: 'right' },
            cellType: { 0: 'image', 1: 'text' },
            imageHeightMode: { 0: 'fixed', 1: 'auto' },
            imageHeight: { 0: 20, 1: 30 },
          },
        },
      ]),
    );
  });
});
