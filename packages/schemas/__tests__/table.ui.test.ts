// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Font } from '@pdfme/common';
import { uiRender } from '../src/tables/uiRender.js';
import type { TableSchema } from '../src/tables/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontData = readFileSync(path.join(__dirname, '/assets/fonts/SauceHanSansJP.ttf'));
const font: Font = { SauceHanSansJP: { data: fontData, fallback: true } };

const getTableSchema = (overrides: Partial<TableSchema> = {}): TableSchema => ({
  name: 'table',
  type: 'table',
  position: { x: 0, y: 0 },
  width: 150,
  height: 20,
  content: JSON.stringify([['Alice', 'New York']]),
  showHead: true,
  repeatHead: false,
  head: ['Name', 'City'],
  headWidthPercentages: [50, 50],
  tableStyles: { borderColor: '#000000', borderWidth: 0.3 },
  headStyles: {
    fontName: 'SauceHanSansJP',
    fontSize: 12,
    lineHeight: 1,
    characterSpacing: 0,
    alignment: 'left',
    verticalAlignment: 'top',
    fontColor: '#ffffff',
    backgroundColor: '#2980ba',
    borderColor: '',
    borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 5, right: 5, bottom: 5, left: 5 },
  },
  bodyStyles: {
    fontName: 'SauceHanSansJP',
    fontSize: 12,
    lineHeight: 1,
    characterSpacing: 0,
    alignment: 'left',
    verticalAlignment: 'top',
    fontColor: '#000000',
    backgroundColor: '',
    alternateBackgroundColor: '#f5f5f5',
    borderColor: '#000000',
    borderWidth: { top: 0.3, right: 0.3, bottom: 0.3, left: 0.3 },
    padding: { top: 5, right: 5, bottom: 5, left: 5 },
  },
  columnStyles: {},
  ...overrides,
});

const render = (schema: TableSchema, mode: 'designer' | 'form' | 'viewer') => {
  const rootElement = document.createElement('div');
  return uiRender({
    value: schema.content as string,
    schema,
    rootElement,
    mode,
    options: { font },
    _cache: new Map(),
    theme: { colorPrimary: '#1677ff' },
    scale: 1,
    basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
  } as Parameters<typeof uiRender>[0]).then(() => rootElement);
};

describe('editableInDesigner on table schema', () => {
  it('uses default cursor on all cells when editableInDesigner is false in designer mode', async () => {
    const rootElement = await render(getTableSchema({ editableInDesigner: false }), 'designer');
    const cells = Array.from(rootElement.querySelectorAll<HTMLDivElement>('div[style]'));
    const textCursorCells = cells.filter((c) => c.style.cursor === 'text');
    expect(textCursorCells).toHaveLength(0);
  });

  it('uses text cursor on all cells when editableInDesigner is omitted in designer mode', async () => {
    const rootElement = await render(getTableSchema(), 'designer');
    // Only the outer cell divs (position:absolute) have cursor set by renderRowUi
    const outerCells = Array.from(rootElement.querySelectorAll<HTMLDivElement>('div[style]')).filter(
      (c) => c.style.position === 'absolute',
    );
    const textCursorCells = outerCells.filter((c) => c.style.cursor === 'text');
    // 2 head columns + 2 body columns = 4 cells
    expect(textCursorCells).toHaveLength(4);
  });

  it('does not make cells contenteditable when editableInDesigner is false in designer mode', async () => {
    const rootElement = await render(getTableSchema({ editableInDesigner: false }), 'designer');
    const editableCells = rootElement.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]');
    expect(editableCells).toHaveLength(0);
  });

  it('clicking a locked cell does not trigger editing mode', async () => {
    const rootElement = await render(getTableSchema({ editableInDesigner: false }), 'designer');
    const cells = Array.from(rootElement.querySelectorAll<HTMLDivElement>('div[style]'));
    const cellDivs = cells.filter((c) => c.style.position === 'absolute');
    expect(cellDivs.length).toBeGreaterThan(0);
    cellDivs[0].click();
    // Allow any async re-render to settle
    await new Promise((r) => setTimeout(r, 0));
    const editableCells = rootElement.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]');
    expect(editableCells).toHaveLength(0);
  });

  it('hides structural controls (add/remove row, add/remove column, drag handles) when editableInDesigner is false', async () => {
    const rootElement = await render(getTableSchema({ editableInDesigner: false }), 'designer');
    const buttons = rootElement.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
    const dragHandles = Array.from(rootElement.querySelectorAll<HTMLDivElement>('div[style]')).filter(
      (el) => el.style.cursor === 'col-resize',
    );
    expect(dragHandles).toHaveLength(0);
  });

  it('shows structural controls when editableInDesigner is omitted in designer mode', async () => {
    const schema = getTableSchema();
    const rootElement = document.createElement('div');
    await uiRender({
      value: schema.content as string,
      schema,
      rootElement,
      mode: 'designer',
      options: { font },
      _cache: new Map(),
      theme: { colorPrimary: '#1677ff' },
      scale: 1,
      basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
      onChange: () => {},
    } as Parameters<typeof uiRender>[0]);
    const buttons = rootElement.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
