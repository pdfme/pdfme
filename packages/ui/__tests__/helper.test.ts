import { SchemaForUI, Schema, Template, BLANK_PDF, BasePdf } from '@pdfme/common';
import { uuid, getUniqSchemaKey, schemasList2template, changeSchemas } from '../src/helper';
import { text, image } from '@pdfme/schemas';

const getSchema = (): Schema => ({
  type: 'text',
  content: '',
  position: { x: 0, y: 0 },
  width: 100,
  height: 100,
});

describe('getUniqSchemaKey test', () => {
  test('getUniqSchemaKey case1', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'b', ...getSchema(), content: 'b' }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy');
  });

  test('getUniqSchemaKey case2', () => {
    const copiedSchemaKey = 'a copy';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a copy', ...getSchema(), content: 'a' }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 2');
  });

  test('getUniqSchemaKey case3', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), key: 'a', ...getSchema(), content: 'a' },
      { id: uuid(), key: 'a copy 2', ...getSchema(), content: 'a' },
    ];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 3');
  });

  test('getUniqSchemaKey case4', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), key: 'a', ...getSchema(), content: 'a' },
      { id: uuid(), key: 'a copy 2', ...getSchema(), content: 'a' },
    ];
    const stackUniqSchemaKeys: string[] = ['a copy 3'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case5', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), key: 'a', ...getSchema(), content: 'a' },
      { id: uuid(), key: 'a copy 3', ...getSchema(), content: 'a' },
    ];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case6', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), key: 'a', ...getSchema(), content: 'a' },
      { id: uuid(), key: 'a copy 3', ...getSchema(), content: 'a' },
    ];
    const stackUniqSchemaKeys: string[] = ['a copy 4'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 5');
  });

  test('getUniqSchemaKey case7', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a', ...getSchema(), content: 'a' }];
    const stackUniqSchemaKeys: string[] = ['a copy 2', 'a copy 3', 'a copy 4'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 5');
  });

  test('getUniqSchemaKey case8', () => {
    const copiedSchemaKey = 'a copy 2';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a copy 2', ...getSchema(), content: 'a' }];
    const stackUniqSchemaKeys: string[] = ['a copy 3'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case9', () => {
    const copiedSchemaKey = 'a copy 9';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a copy 9', ...getSchema(), content: 'a' }];
    const stackUniqSchemaKeys: string[] = ['a copy 10'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 11');
  });

  test('getUniqSchemaKey case10', () => {
    const copiedSchemaKey = 'a copy 10';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a copy 10', ...getSchema(), content: 'a' }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 11');
  });
});

describe('schemasList2template test', () => {
  test('schemasList2template normal', () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [{ a: getSchema() }],
    };
    const schemasList: SchemaForUI[][] = [[{ id: uuid(), key: 'b', ...getSchema(), content: 'b' }]];
    expect(schemasList2template(schemasList, template.basePdf)).toStrictEqual({
      basePdf: BLANK_PDF,
      schemas: [
        { b: { type: 'text', position: { x: 0, y: 0 }, width: 100, height: 100, content: 'b' } },
      ],
    });
  });

  test('schemasList2template readOnly', () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [{ a: getSchema() }],
    };
    const schemasList: SchemaForUI[][] = [
      [{ id: uuid(), key: 'b', readOnly: true, ...getSchema(), content: 'b' }],
    ];
    expect(schemasList2template(schemasList, template.basePdf)).toStrictEqual({
      basePdf: BLANK_PDF,
      schemas: [
        {
          b: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
            readOnly: true,
            content: 'b',
          },
        },
      ],
    });
  });
});

describe('changeSchemas test', () => {
  const schemaA = { id: uuid(), key: 'a', ...getSchema(), content: 'a' };
  const schemaB = { id: uuid(), key: 'b', ...getSchema(), content: 'b' };
  const schemas: SchemaForUI[] = [schemaA, schemaB];
  const basePdf1: BasePdf = BLANK_PDF;
  const basePdf2: BasePdf = { width: 210, height: 297, padding: [10, 10, 10, 10] };
  const pluginsRegistry = { text, image };
  const pageSize = { width: 210, height: 297 };

  test('changeSchemas - change content with objs length = 1', () => {
    const objs = [{ key: 'content', value: 'a!', schemaId: schemaA.id }];
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a!',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a!',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a',
        position: { x: 0, y: 0 },
        width: 150,
        height: 100,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a',
        position: { x: 0, y: 0 },
        width: 150,
        height: 75,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'image',
        content:
        'data:image/png;base64,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',
        position: { x: 0, y: 0 },
        width: 40,
        height: 40,
        icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-image\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"/></svg>",
        opacity: 1,
        rotate: 0,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a',
        position: { x: 5, y: 5 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a',
        position: { x: 10, y: 10 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a',
        position: { x: 10, y: 10 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a',
        position: { x: 0, y: 0 },
        width: 110,
        height: 110,
      },
      {
        id: schemaB.id,
        key: 'b',
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
    const mockCallback = jest.fn();

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
        key: 'a',
        type: 'text',
        content: 'a',
        position: { x: 100, y: 187 },
        width: 100,
        height: 100,
      },
      {
        id: schemaB.id,
        key: 'b',
        type: 'text',
        content: 'b',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ]);
  });
});
