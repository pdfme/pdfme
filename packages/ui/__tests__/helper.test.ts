import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SchemaForUI,
  Schema,
  Template,
  BLANK_PDF,
  BasePdf,
  PAGE_SIZE_PRESETS,
  ZOOM,
  pluginRegistry,
} from '@pdfme/common';
import {
  uuid,
  stabilizeSchemaIds,
  getUniqueSchemaName,
  schemasList2template,
  changeSchemas,
  clampZoomLevel,
  getFitZoomLevel,
  getZoomAnchor,
  getDynamicHeightReflowChanges,
  restoreZoomAnchor,
  setFontNameRecursively,
  getStickyScrollPageIndex,
} from '../src/helper';
import { text, image } from '@pdfme/schemas';

const getSchema = (): Schema => ({
  name: 'a',
  type: 'text',
  content: '',
  position: { x: 0, y: 0 },
  width: 100,
  height: 100,
});

describe('getUniqSchemaName test', () => {
  test('getUniqSchemaName case1', () => {
    const copiedSchemaName = 'a';
    const schema: SchemaForUI[] = [{ id: uuid(), ...getSchema(), name: 'b', content: 'b' }];
    const stackUniqSchemaNames: string[] = [];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy');
  });

  test('getUniqSchemaName case2', () => {
    const copiedSchemaName = 'a copy';
    const schema: SchemaForUI[] = [{ id: uuid(), ...getSchema(), name: 'a copy', content: 'a' }];
    const stackUniqSchemaNames: string[] = [];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 2');
  });

  test('getUniqSchemaName case3', () => {
    const copiedSchemaName = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), ...getSchema(), name: 'a', content: 'a' },
      { id: uuid(), ...getSchema(), name: 'a copy 2', content: 'a' },
    ];
    const stackUniqSchemaNames: string[] = [];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 3');
  });

  test('getUniqSchemaName case4', () => {
    const copiedSchemaName = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), ...getSchema(), name: 'a', content: 'a' },
      { id: uuid(), ...getSchema(), name: 'a copy 2', content: 'a' },
    ];
    const stackUniqSchemaNames: string[] = ['a copy 3'];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 4');
  });

  test('getUniqSchemaName case5', () => {
    const copiedSchemaName = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), ...getSchema(), name: 'a', content: 'a' },
      { id: uuid(), ...getSchema(), name: 'a copy 3', content: 'a' },
    ];
    const stackUniqSchemaNames: string[] = [];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 4');
  });

  test('getUniqSchemaName case6', () => {
    const copiedSchemaName = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), ...getSchema(), name: 'a', content: 'a' },
      { id: uuid(), ...getSchema(), name: 'a copy 3', content: 'a' },
    ];
    const stackUniqSchemaNames: string[] = ['a copy 4'];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 5');
  });

  test('getUniqSchemaName case7', () => {
    const copiedSchemaName = 'a';
    const schema: SchemaForUI[] = [{ id: uuid(), ...getSchema(), name: 'a', content: 'a' }];
    const stackUniqSchemaNames: string[] = ['a copy 2', 'a copy 3', 'a copy 4'];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 5');
  });

  test('getUniqSchemaName case8', () => {
    const copiedSchemaName = 'a copy 2';
    const schema: SchemaForUI[] = [{ id: uuid(), ...getSchema(), name: 'a copy 2', content: 'a' }];
    const stackUniqSchemaNames: string[] = ['a copy 3'];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 4');
  });

  test('getUniqSchemaName case9', () => {
    const copiedSchemaName = 'a copy 9';
    const schema: SchemaForUI[] = [{ id: uuid(), ...getSchema(), name: 'a copy 9', content: 'a' }];
    const stackUniqSchemaNames: string[] = ['a copy 10'];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 11');
  });

  test('getUniqSchemaName case10', () => {
    const copiedSchemaName = 'a copy 10';
    const schema: SchemaForUI[] = [{ id: uuid(), ...getSchema(), name: 'a copy 10', content: 'a' }];
    const stackUniqSchemaNames: string[] = [];
    const uniqSchemaName = getUniqueSchemaName({
      copiedSchemaName,
      schema,
      stackUniqueSchemaNames: stackUniqSchemaNames,
    });
    expect(uniqSchemaName).toBe('a copy 11');
  });
});

describe('stabilizeSchemaIds test', () => {
  test('reuses the same id for the same schema name across calls', () => {
    const idMap = new Map<string, string>();
    const schema = { ...getSchema(), name: 'staticMvt' };

    const first = stabilizeSchemaIds([schema], idMap);
    const second = stabilizeSchemaIds([{ ...schema, content: 'changed' }], idMap);

    expect(first[0].id).toBe(second[0].id);
    expect(first[0].id).toBeTruthy();
    expect(idMap.get('staticMvt')).toBe(first[0].id);
  });

  test('ignores a caller-supplied id and reuses the generated runtime id', () => {
    const idMap = new Map<string, string>();
    const schema = { ...getSchema(), name: 'header', id: 'foo[' } as SchemaForUI;

    const [first] = stabilizeSchemaIds([schema], idMap);
    const [second] = stabilizeSchemaIds([{ ...getSchema(), name: 'header', id: 'foo[' }], idMap);

    expect(first.id).toBeTruthy();
    expect(first.id).not.toBe('foo[');
    expect(second.id).toBe(first.id);
    expect(idMap.get('header')).toBe(first.id);
  });

  test('does not mutate the source schema', () => {
    const schema = { ...getSchema(), name: 'footer' };
    stabilizeSchemaIds([schema], new Map());
    expect(schema).not.toHaveProperty('id');
  });
});

describe('schemasList2template test', () => {
  test('schemasList2template normal', () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [[getSchema()]],
    };
    const schemasList: SchemaForUI[][] = [
      [{ id: uuid(), ...getSchema(), name: 'b', content: 'b' }],
    ];
    expect(schemasList2template(schemasList, template.basePdf)).toStrictEqual({
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'b',
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
            content: 'b',
          },
        ],
      ],
    });
  });

  test('schemasList2template readOnly', () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [[getSchema()]],
    };
    const schemasList: SchemaForUI[][] = [
      [{ id: uuid(), readOnly: true, ...getSchema(), name: 'b', content: 'b' }],
    ];
    expect(schemasList2template(schemasList, template.basePdf)).toStrictEqual({
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'b',
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
            readOnly: true,
            content: 'b',
          },
        ],
      ],
    });
  });
});

describe('changeSchemas test', () => {
  const schemaA = { id: uuid(), ...getSchema(), name: 'a', content: 'a' };
  const schemaB = { id: uuid(), ...getSchema(), name: 'b', content: 'b' };
  const schemas: SchemaForUI[] = [schemaA, schemaB];
  const basePdf1: BasePdf = BLANK_PDF;
  const basePdf2: BasePdf = { ...PAGE_SIZE_PRESETS.A4, padding: [10, 10, 10, 10] };
  const pluginsRegistry = pluginRegistry({ text, image });
  const pageSize = PAGE_SIZE_PRESETS.A4;

  test('changeSchemas - change content with objs length = 1', () => {
    const objs = [{ key: 'content', value: 'a!', schemaId: schemaA.id }];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf1,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a!',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });

  test('changeSchemas - change content with objs length = 2', () => {
    const objs = [
      { key: 'content', value: 'a!', schemaId: schemaA.id },
      { key: 'content', value: 'b!', schemaId: schemaB.id },
    ];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf1,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a!',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b!',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });

  test('changeSchemas - change width with objs length = 1', () => {
    const objs = [{ key: 'width', value: 150, schemaId: schemaA.id }];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf1,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a',
        position: { x: 0, y: 0 },
        width: 150,
        height: 100,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });

  test('changeSchemas - change width and height with objs length = 2', () => {
    const objs = [
      { key: 'width', value: 150, schemaId: schemaA.id },
      { key: 'height', value: 75, schemaId: schemaA.id },
    ];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf1,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a',
        position: { x: 0, y: 0 },
        width: 150,
        height: 75,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });

  test('changeSchemas - change type with objs length = 1', () => {
    const objs = [{ key: 'type', value: 'image', schemaId: schemaA.id }];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf1,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'image',
        content:
          'data:image/png;base64,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',
        position: { x: 0, y: 0 },
        width: 40,
        height: 40,
        objectFit: 'contain',
        objectPosition: 'center center',
        opacity: 1,
        rotate: 0,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });

  test('changeSchemas - change position.x and position.y with objs length = 2', () => {
    const objs = [
      { key: 'position.x', value: 5, schemaId: schemaA.id },
      { key: 'position.y', value: 5, schemaId: schemaA.id },
    ];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf1,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a',
        position: { x: 5, y: 5 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });

  test('changeSchemas - change position.x and position.y(padding in) with objs length = 2 and BlankPDF', () => {
    const objs = [
      { key: 'position.x', value: 5, schemaId: schemaA.id },
      { key: 'position.y', value: 5, schemaId: schemaA.id },
    ];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf2,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a',
        position: { x: 10, y: 10 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });

  test('changeSchemas - change position.x and position.y(padding out) with objs length = 2 and BlankPDF', () => {
    const objs = [
      { key: 'position.x', value: 10, schemaId: schemaA.id },
      { key: 'position.y', value: 10, schemaId: schemaA.id },
    ];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf2,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a',
        position: { x: 10, y: 10 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });

  test('changeSchemas - change width and height(padding out) with objs length = 2 and BlankPDF', () => {
    const objs = [
      { key: 'width', value: 110, schemaId: schemaA.id },
      { key: 'height', value: 110, schemaId: schemaA.id },
    ];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf2,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a',
        position: { x: 0, y: 0 },
        width: 110,
        height: 110,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });
  test('changeSchemas - change width and height(padding in) with objs length = 2 and BlankPDF', () => {
    const objs = [
      { key: 'position.x', value: 100, schemaId: schemaA.id },
      { key: 'position.y', value: 197, schemaId: schemaA.id },
      { key: 'width', value: 110, schemaId: schemaA.id },
      { key: 'height', value: 110, schemaId: schemaA.id },
    ];
    const mockCallback = vi.fn();

    changeSchemas({
      schemas,
      objs,
      commitSchemas: mockCallback,
      basePdf: basePdf2,
      pluginsRegistry,
      pageSize,
    });
    expect(mockCallback.mock.calls[0][0]).toStrictEqual([
      {
        id: schemaA.id,
        name: 'a',
        type: 'text',
        content: 'a',
        position: { x: 100, y: 187 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        name: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });
});

describe('getDynamicHeightReflowChanges', () => {
  test('pushes lower schemas down for list auto height changes', () => {
    const listSchema = {
      id: uuid(),
      ...getSchema(),
      name: 'items',
      type: 'list',
      content: '[]',
      position: { x: 0, y: 20 },
      height: 10,
    };
    const belowSchema = {
      id: uuid(),
      ...getSchema(),
      name: 'below',
      content: 'below',
      position: { x: 0, y: 35 },
      height: 10,
    };
    const aboveSchema = {
      id: uuid(),
      ...getSchema(),
      name: 'above',
      content: 'above',
      position: { x: 0, y: 5 },
      height: 10,
    };

    expect(
      getDynamicHeightReflowChanges({
        schemas: [aboveSchema, listSchema, belowSchema],
        schema: listSchema,
        height: 25,
      }),
    ).toStrictEqual([{ key: 'position.y', value: 50, schemaId: belowSchema.id }]);
  });

  test('ignores non-list and table schemas', () => {
    const belowSchema = {
      id: uuid(),
      ...getSchema(),
      name: 'below',
      content: 'below',
      position: { x: 0, y: 35 },
      height: 10,
    };

    for (const type of ['text', 'table']) {
      const schema = {
        id: uuid(),
        ...getSchema(),
        name: 'items',
        type,
        position: { x: 0, y: 20 },
        height: 10,
      };

      expect(
        getDynamicHeightReflowChanges({
          schemas: [schema, belowSchema],
          schema,
          height: 25,
        }),
      ).toStrictEqual([]);
    }
  });
});

describe('setFontNameRecursively', () => {
  it('sets fontName in object with undefined fontName property', () => {
    const obj = { fontName: undefined, content: 'test' };
    setFontNameRecursively(obj, 'Arial');
    expect(obj.fontName).toEqual('Arial');
  });

  it('does not modify existing fontName values', () => {
    const obj = { fontName: 'Helvetica', content: 'test' };
    setFontNameRecursively(obj, 'Arial');
    expect(obj.fontName).toEqual('Helvetica');
  });

  it('recursively sets fontName in nested objects and preserves other properties', () => {
    const obj = {
      outer: {
        fontName: undefined,
        otherProp: 'unchanged',
        inner: {
          fontName: undefined,
          content: 'test',
          style: { color: 'red' },
        },
      },
    };
    setFontNameRecursively(obj, 'Arial');
    expect(obj.outer.fontName).toEqual('Arial');
    expect(obj.outer.otherProp).toEqual('unchanged');
    expect(obj.outer.inner.fontName).toEqual('Arial');
    expect(obj.outer.inner.content).toEqual('test');
    expect(obj.outer.inner.style.color).toEqual('red');
  });

  it('handles arrays of objects', () => {
    const obj = {
      items: [
        { fontName: undefined, content: 'item1' },
        { fontName: undefined, content: 'item2' },
      ],
    };
    setFontNameRecursively(obj, 'Arial');
    expect(obj.items[0].fontName).toEqual('Arial');
    expect(obj.items[1].fontName).toEqual('Arial');
  });

  it('ignores null values', () => {
    const obj = { fontName: undefined, nullProp: null };
    setFontNameRecursively(obj, 'Arial');
    expect(obj.fontName).toEqual('Arial');
    expect(obj.nullProp).toBeNull();
  });

  it('handles empty objects', () => {
    const obj = {};
    setFontNameRecursively(obj, 'Arial');
    expect(obj).toEqual({});
  });

  it('returns early for null input or undefined input', () => {
    expect(() => setFontNameRecursively(null as any, 'Arial')).not.toThrow();
    expect(() => setFontNameRecursively(undefined as any, 'Arial')).not.toThrow();
  });
});

describe('zoom helpers', () => {
  test('clampZoomLevel keeps zoom within min and max', () => {
    expect(clampZoomLevel(0.1, 2)).toBe(0.25);
    expect(clampZoomLevel(3, 2)).toBe(2);
    expect(clampZoomLevel(1.25, 2)).toBe(1.25);
  });

  test('getFitZoomLevel computes width and height zoom against the container', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 440 });
    Object.defineProperty(container, 'clientHeight', { value: 520 });
    const pageSize = { width: 100, height: 100 };
    const baseScale = 0.5;

    expect(
      getFitZoomLevel({
        mode: 'fit-width',
        pageSize,
        container,
        baseScale,
        maxZoom: 3,
      }),
    ).toBeCloseTo(400 / (pageSize.width * ZOOM) / baseScale);

    expect(
      getFitZoomLevel({
        mode: 'fit-height',
        pageSize,
        container,
        baseScale,
        maxZoom: 3,
      }),
    ).toBe(1);
  });

  test('getZoomAnchor and restoreZoomAnchor keep the anchored point stable', () => {
    const container = document.createElement('div');
    container.scrollLeft = 100;
    container.scrollTop = 100;
    const paper = document.createElement('div');
    vi.spyOn(paper, 'getBoundingClientRect').mockReturnValue({
      left: 50,
      top: 60,
      right: 250,
      bottom: 260,
      width: 200,
      height: 200,
      x: 50,
      y: 60,
      toJSON: () => undefined,
    });

    const anchor = getZoomAnchor({
      pageIndex: 0,
      paper,
      clientX: 90,
      clientY: 120,
      scale: 2,
    });

    expect(anchor).toEqual({
      pageIndex: 0,
      localX: 20,
      localY: 30,
      clientX: 90,
      clientY: 120,
    });

    restoreZoomAnchor({ container, paper, anchor, scale: 3 });

    expect(container.scrollLeft).toBe(120);
    expect(container.scrollTop).toBe(130);
  });
});

describe('getStickyScrollPageIndex', () => {
  const mockRect = ({
    left,
    top,
    width,
    height,
  }: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) =>
    ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
    }) as DOMRect;

  const setupPapers = (
    containerRect: DOMRect,
    paperRects: Array<{ left: number; top: number; width: number; height: number }>,
    scroll?: { scrollTop: number; clientHeight: number; scrollHeight: number },
  ) => {
    const container = document.createElement('div');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(containerRect);
    if (scroll) {
      Object.defineProperty(container, 'clientHeight', {
        configurable: true,
        value: scroll.clientHeight,
      });
      Object.defineProperty(container, 'scrollHeight', {
        configurable: true,
        value: scroll.scrollHeight,
      });
      container.scrollTop = scroll.scrollTop;
    }
    const papers = paperRects.map((rect) => {
      const paper = document.createElement('div');
      vi.spyOn(paper, 'getBoundingClientRect').mockReturnValue(mockRect(rect));
      return paper;
    });
    return { container, papers };
  };

  const viewport = mockRect({ left: 0, top: 0, width: 100, height: 100 });
  const midScroll = { scrollTop: 80, clientHeight: 100, scrollHeight: 260 };
  const tallViewport = mockRect({ left: 0, top: 0, width: 600, height: 700 });
  const tallContentScroll = { clientHeight: 700, scrollHeight: 825 };

  test('keeps the current page while a quarter of the viewport still shows it', () => {
    const { container, papers } = setupPapers(
      viewport,
      [
        { left: 0, top: -60, width: 100, height: 100 },
        { left: 0, top: 40, width: 100, height: 100 },
      ],
      midScroll,
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(0);
  });

  test('keeps the current page at exactly 25% remaining height', () => {
    const { container, papers } = setupPapers(
      viewport,
      [
        { left: 0, top: -75, width: 100, height: 100 },
        { left: 0, top: 25, width: 100, height: 100 },
      ],
      midScroll,
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(0);
  });

  test('switches after the current page is mostly gone', () => {
    const { container, papers } = setupPapers(
      viewport,
      [
        { left: 0, top: -85, width: 100, height: 100 },
        { left: 0, top: 15, width: 100, height: 100 },
      ],
      midScroll,
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(1);
  });

  test('switches when remaining height is below 25%', () => {
    const { container, papers } = setupPapers(
      viewport,
      [
        { left: 0, top: -76, width: 100, height: 100 },
        { left: 0, top: 24, width: 100, height: 100 },
      ],
      midScroll,
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(1);
  });

  test('keeps the current page when scrolling back while it still has a remainder', () => {
    const { container, papers } = setupPapers(
      viewport,
      [
        { left: 0, top: -30, width: 100, height: 100 },
        { left: 0, top: 70, width: 100, height: 100 },
      ],
      midScroll,
    );

    expect(getStickyScrollPageIndex(container, papers, 1)).toBe(1);
  });

  test('does not change page when nothing is visible', () => {
    const { container, papers } = setupPapers(
      viewport,
      [
        { left: 200, top: 200, width: 100, height: 100 },
        { left: 200, top: 320, width: 100, height: 100 },
      ],
      midScroll,
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(0);
  });

  test('switches to the most visible last page at the bottom even if the previous page is still 25% visible', () => {
    const { container, papers } = setupPapers(
      tallViewport,
      [
        { left: 0, top: -125, width: 500, height: 400 },
        { left: 0, top: 300, width: 500, height: 400 },
      ],
      { ...tallContentScroll, scrollTop: 125 },
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(1);
  });

  test('switches to the most visible first page at the top even if the current page is still 25% visible', () => {
    const { container, papers } = setupPapers(
      tallViewport,
      [
        { left: 0, top: 0, width: 500, height: 400 },
        { left: 0, top: 425, width: 500, height: 400 },
      ],
      { ...tallContentScroll, scrollTop: 0 },
    );

    expect(getStickyScrollPageIndex(container, papers, 1)).toBe(0);
  });

  test('treats a fractional scrollTop near the bottom as the end', () => {
    const { container, papers } = setupPapers(
      tallViewport,
      [
        { left: 0, top: -125, width: 500, height: 400 },
        { left: 0, top: 300, width: 500, height: 400 },
      ],
      { ...tallContentScroll, scrollTop: 124.6 },
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(1);
  });

  test('does not treat a non-scrollable container as a scroll edge', () => {
    const { container, papers } = setupPapers(
      tallViewport,
      [
        { left: 0, top: -125, width: 500, height: 400 },
        { left: 0, top: 300, width: 500, height: 400 },
      ],
      { scrollTop: 0, clientHeight: 700, scrollHeight: 700 },
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(0);
  });

  test('does not force the last page when it is not the most visible at the bottom', () => {
    const { container, papers } = setupPapers(
      tallViewport,
      [
        { left: 0, top: -50, width: 500, height: 700 },
        { left: 0, top: 670, width: 500, height: 50 },
      ],
      { scrollTop: 50, clientHeight: 700, scrollHeight: 750 },
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(0);
  });

  test('switches when the current page has no horizontal overlap', () => {
    const { container, papers } = setupPapers(
      tallViewport,
      [
        { left: -600, top: -300, width: 500, height: 700 },
        { left: -600, top: 425, width: 1200, height: 700 },
      ],
      { scrollTop: 300, clientHeight: 700, scrollHeight: 1125 },
    );

    expect(getStickyScrollPageIndex(container, papers, 0)).toBe(1);
  });
});

describe('hotkeys-js version floor (#1465)', () => {
  test('declared range cannot resolve 4.0.0–4.0.3', () => {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const { dependencies } = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const range = dependencies['hotkeys-js'];
    const match = range?.trim().match(/^(?:\^|~|>=)?(\d+)\.(\d+)\.(\d+)$/);
    expect(match, `unexpected hotkeys-js range: ${range}`).not.toBeNull();
    const major = Number(match![1]);
    const minor = Number(match![2]);
    const patch = Number(match![3]);
    const atLeast404 = major > 4 || (major === 4 && (minor > 0 || patch >= 4));
    expect(atLeast404).toBe(true);
  });
});
