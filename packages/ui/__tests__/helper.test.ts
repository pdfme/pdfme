import { SchemaForUI, Schema, Template, BLANK_PDF } from '@pdfme/common';
import {
  uuid,
  getUniqSchemaKey,
  fmtTemplate,
  generateColumnsAndSampledataIfNeeded,
} from '../src/helper';

const getSchema = (): Schema => ({
  type: 'text',
  position: { x: 0, y: 0 },
  width: 100,
  height: 100,
});

describe('getUniqSchemaKey test', () => {
  test('getUniqSchemaKey case1', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'b', content: 'b', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy');
  });

  test('getUniqSchemaKey case2', () => {
    const copiedSchemaKey = 'a copy';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a copy', content: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 2');
  });

  test('getUniqSchemaKey case3', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), key: 'a', content: 'a', ...getSchema() },
      { id: uuid(), key: 'a copy 2', content: 'a', ...getSchema() },
    ];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 3');
  });

  test('getUniqSchemaKey case4', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), key: 'a', content: 'a', ...getSchema() },
      { id: uuid(), key: 'a copy 2', content: 'a', ...getSchema() },
    ];
    const stackUniqSchemaKeys: string[] = ['a copy 3'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case5', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), key: 'a', content: 'a', ...getSchema() },
      { id: uuid(), key: 'a copy 3', content: 'a', ...getSchema() },
    ];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case6', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [
      { id: uuid(), key: 'a', content: 'a', ...getSchema() },
      { id: uuid(), key: 'a copy 3', content: 'a', ...getSchema() },
    ];
    const stackUniqSchemaKeys: string[] = ['a copy 4'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 5');
  });

  test('getUniqSchemaKey case7', () => {
    const copiedSchemaKey = 'a';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a', content: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = ['a copy 2', 'a copy 3', 'a copy 4'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 5');
  });

  test('getUniqSchemaKey case8', () => {
    const copiedSchemaKey = 'a copy 2';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a copy 2', content: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = ['a copy 3'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case9', () => {
    const copiedSchemaKey = 'a copy 9';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a copy 9', content: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = ['a copy 10'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 11');
  });

  test('getUniqSchemaKey case10', () => {
    const copiedSchemaKey = 'a copy 10';
    const schema: SchemaForUI[] = [{ id: uuid(), key: 'a copy 10', content: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 11');
  });
});

describe('fmtTemplate test', () => {
  test('fmtTemplate normal', () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [{ a: getSchema() }],
    };
    const schemasList: SchemaForUI[][] = [[{ id: uuid(), key: 'b', content: 'b', ...getSchema() }]];
    expect(fmtTemplate(template, schemasList)).toStrictEqual({
      basePdf: BLANK_PDF,
      schemas: [{ b: { type: 'text', position: { x: 0, y: 0 }, width: 100, height: 100 } }],
      columns: ['b'],
      // TODO ここ
      sampledata: [{ b: 'b' }],
    });
  });

  test('fmtTemplate readOnly', () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [{ a: getSchema() }],
    };
    const schemasList: SchemaForUI[][] = [
      [{ id: uuid(), key: 'b', content: 'b', readOnly: true, ...getSchema() }],
    ];
    expect(fmtTemplate(template, schemasList)).toStrictEqual({
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
      columns: ['b'],
      // TODO ここ
      sampledata: [{}],
    });
  });
});

describe('generateColumnsAndSampledataIfNeeded test', () => {
  test('generateColumnsAndSampledataIfNeeded normal', () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [{ a: getSchema() }],
    };
    expect(generateColumnsAndSampledataIfNeeded(template)).toStrictEqual({
      basePdf: BLANK_PDF,
      schemas: [{ a: { type: 'text', position: { x: 0, y: 0 }, width: 100, height: 100 } }],
      columns: ['a'],
      // TODO ここ
      sampledata: [{ a: '' }],
    });
  });

  test('generateColumnsAndSampledataIfNeeded with readOnly', () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [{ a: { readOnly: true, ...getSchema() } }],
    };
    expect(generateColumnsAndSampledataIfNeeded(template)).toStrictEqual({
      basePdf: BLANK_PDF,
      schemas: [
        { a: { type: 'text', position: { x: 0, y: 0 }, width: 100, height: 100, readOnly: true } },
      ],
      columns: ['a'],
      // TODO ここ
      sampledata: [{}],
    });
  });
});
