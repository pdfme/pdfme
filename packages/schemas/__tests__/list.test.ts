import { getDefaultFont, pt2mm } from '@pdfme/common';
import {
  calculateListLayout,
  getDynamicLayoutForList,
  getListMarker,
  normalizeListItemEntries,
  normalizeListItems,
  serializeListItems,
} from '../src/lists.js';
import type { ListSchema } from '../src/lists.js';

const getListSchema = (overrides: Partial<ListSchema> = {}): ListSchema => ({
  name: 'items',
  type: 'list',
  content: '',
  position: { x: 0, y: 0 },
  width: 50,
  height: 20,
  alignment: 'left',
  verticalAlignment: 'top',
  fontSize: 12,
  lineHeight: 1,
  characterSpacing: 0,
  fontColor: '#000000',
  backgroundColor: '',
  listStyle: 'bullet',
  marker: '\u2022',
  startNumber: 1,
  orderedSuffix: '.',
  markerWidth: 6,
  markerGap: 2,
  indentSize: 6,
  itemSpacing: 1,
  ...overrides,
});

describe('list schema helpers', () => {
  test('normalizes supported list input shapes', () => {
    expect(normalizeListItems('["Install deps","Run tests"]')).toEqual([
      'Install deps',
      'Run tests',
    ]);
    expect(normalizeListItems('Install deps\nRun tests')).toEqual(['Install deps', 'Run tests']);
    expect(normalizeListItems('[""]')).toEqual(['']);
    expect(normalizeListItems(['Install deps', 2])).toEqual(['Install deps', '2']);
    expect(normalizeListItems('')).toEqual([]);
    expect(normalizeListItems(null)).toEqual([]);
    expect(normalizeListItems(123)).toEqual(['123']);
  });

  test('parses and serializes tab-indented list items', () => {
    const items = normalizeListItemEntries('Install deps\n\tRun tests\n\t\tFix failures');

    expect(items).toEqual([
      { level: 0, text: 'Install deps' },
      { level: 1, text: 'Run tests' },
      { level: 2, text: 'Fix failures' },
    ]);
    expect(serializeListItems(items)).toBe('Install deps\n\tRun tests\n\t\tFix failures');
    expect(serializeListItems([{ level: 0, text: '' }])).toBe('[""]');
  });

  test('builds ordered markers from the absolute item index', () => {
    const schema = getListSchema({
      listStyle: 'ordered',
      startNumber: 3,
      orderedSuffix: ')',
    });

    expect(getListMarker(schema, 0)).toBe('3)');
    expect(getListMarker(schema, 4)).toBe('7)');
  });

  test('calculates item heights with wrapping and item spacing', async () => {
    const schema = getListSchema({ width: 18, markerWidth: 4, markerGap: 2, itemSpacing: 2 });
    const layout = await calculateListLayout({
      schema,
      items: ['A very long list item that should wrap', 'short'],
      startIndex: 0,
      options: { font: getDefaultFont() },
      _cache: new Map(),
    });

    expect(layout.items).toHaveLength(2);
    expect(layout.items[0].lines.length).toBeGreaterThan(1);
    expect(layout.items[0].height).toBeGreaterThan(layout.items[1].height);
    expect(layout.items[0].height).toBeCloseTo(
      layout.items[0].lines.length * pt2mm(schema.fontSize * schema.lineHeight) +
        schema.itemSpacing,
    );
    expect(layout.items[1].height).toBeCloseTo(pt2mm(schema.fontSize * schema.lineHeight));
  });

  test('applies item indentation to marker and body positions', async () => {
    const schema = getListSchema({ width: 80, markerWidth: 6, markerGap: 2, indentSize: 5 });
    const layout = await calculateListLayout({
      schema,
      items: ['Parent', '\tChild'],
      startIndex: 0,
      options: { font: getDefaultFont() },
      _cache: new Map(),
    });

    expect(layout.items[0].markerX).toBe(0);
    expect(layout.items[0].bodyX).toBe(8);
    expect(layout.items[1].markerX).toBe(5);
    expect(layout.items[1].bodyX).toBe(13);
    expect(layout.items[1].bodyWidth).toBe(67);
  });

  test('returns split metadata for dynamic list layout', async () => {
    const schema = getListSchema();
    const dynamicLayout = await getDynamicLayoutForList('One\nTwo\nThree', {
      schema,
      basePdf: { width: 100, height: 100, padding: [10, 10, 10, 10] },
      options: { font: getDefaultFont() },
      _cache: new Map(),
    });

    expect(dynamicLayout.heights).toHaveLength(3);
    expect(dynamicLayout.avoidFirstUnitOnly).toBe(false);
    expect(
      dynamicLayout.patchSplitSchema?.({
        schema,
        start: 1,
        end: 3,
        isSplit: true,
        chunkHeight: 10,
      }),
    ).toEqual({
      __splitRange: { start: 1, end: 3 },
      __itemRange: { start: 1, end: 3 },
      __isSplit: true,
    });
  });

  test('uses zero height for empty list values', async () => {
    const schema = getListSchema({ height: 24 });
    const dynamicLayout = await getDynamicLayoutForList('', {
      schema,
      basePdf: { width: 100, height: 100, padding: [10, 10, 10, 10] },
      options: { font: getDefaultFont() },
      _cache: new Map(),
    });

    expect(dynamicLayout.heights).toEqual([0]);
  });
});
