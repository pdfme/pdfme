import { readFileSync } from 'fs';
import * as path from 'path';
import { uuid } from '../../src/libs/utils';
import { BLANK_PDF } from '../../src/libs/constants';
import { Font, Schema, Template, TemplateSchema } from '../../src/libs/type';
import { checkFont, getUniqSchemaKey } from '../../src/libs/helper';
import { blankPdf } from '../../src';

const sansData = readFileSync(path.join(__dirname, `../assets/fonts/SauceHanSansJP.ttf`));
const serifData = readFileSync(path.join(__dirname, `../assets/fonts/SauceHanSerifJP.ttf`));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: sansData },
  SauceHanSerifJP: { data: serifData },
});

const getTemplate = (): Template => ({
  basePdf: BLANK_PDF,
  schemas: [
    {
      a: {
        type: 'text',
        fontName: 'SauceHanSansJP',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
      b: {
        type: 'text',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    },
  ],
});

describe('checkFont test', () => {
  test('success test: no fontName in Schemas', () => {
    const _getTemplate = (): Template => ({
      basePdf: blankPdf,
      schemas: [
        {
          a: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    });
    try {
      checkFont({ template: _getTemplate(), font: getSampleFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('success test: fontName in Schemas(fallback font)', () => {
    try {
      checkFont({ template: getTemplate(), font: getSampleFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('success test: fontName in Schemas(not fallback font)', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData },
      SauceHanSerifJP: { fallback: true, data: serifData },
    });

    try {
      checkFont({ template: getTemplate(), font: getFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('fail test: no fallback font', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData },
      SauceHanSerifJP: { data: serifData },
    });

    try {
      checkFont({ template: getTemplate(), font: getFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        'fallback flag is not found in font. true fallback flag must be only one.'
      );
    }
  });

  test('fail test: too many fallback font', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData, fallback: true },
      SauceHanSerifJP: { data: serifData, fallback: true },
    });

    try {
      checkFont({ template: getTemplate(), font: getFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        '2 fallback flags found in font. true fallback flag must be only one.'
      );
    }
  });

  test('fail test: fontName in Schemas not found in font(single)', () => {
    const _getTemplate = (): Template => ({
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            fontName: 'SauceHanSansJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    });

    try {
      checkFont({ template: _getTemplate(), font: getSampleFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual('SauceHanSansJP2 of template.schemas is not found in font.');
    }
  });

  test('fail test: fontName in Schemas not found in font(single)', () => {
    const _getTemplate = (): Template => ({
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            type: 'text',
            fontName: 'SauceHanSansJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            fontName: 'SauceHanSerifJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        },
      ],
    });

    try {
      checkFont({ template: _getTemplate(), font: getSampleFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        'SauceHanSansJP2,SauceHanSerifJP2 of template.schemas is not found in font.'
      );
    }
  });
});

describe('getUniqSchemaKey test', () => {
  const getSchema = (): TemplateSchema => ({
    type: 'text',
    position: { x: 0, y: 0 },
    width: 100,
    height: 100,
  });

  test('getUniqSchemaKey case1', () => {
    const copiedSchemaKey = 'a';
    const schema: Schema[] = [{ id: uuid(), key: 'b', data: 'b', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy');
  });

  test('getUniqSchemaKey case2', () => {
    const copiedSchemaKey = 'a copy';
    const schema: Schema[] = [{ id: uuid(), key: 'a copy', data: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 2');
  });

  test('getUniqSchemaKey case3', () => {
    const copiedSchemaKey = 'a';
    const schema: Schema[] = [
      { id: uuid(), key: 'a', data: 'a', ...getSchema() },
      { id: uuid(), key: 'a copy 2', data: 'a', ...getSchema() },
    ];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 3');
  });

  test('getUniqSchemaKey case4', () => {
    const copiedSchemaKey = 'a';
    const schema: Schema[] = [
      { id: uuid(), key: 'a', data: 'a', ...getSchema() },
      { id: uuid(), key: 'a copy 2', data: 'a', ...getSchema() },
    ];
    const stackUniqSchemaKeys: string[] = ['a copy 3'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case5', () => {
    const copiedSchemaKey = 'a';
    const schema: Schema[] = [
      { id: uuid(), key: 'a', data: 'a', ...getSchema() },
      { id: uuid(), key: 'a copy 3', data: 'a', ...getSchema() },
    ];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case6', () => {
    const copiedSchemaKey = 'a';
    const schema: Schema[] = [
      { id: uuid(), key: 'a', data: 'a', ...getSchema() },
      { id: uuid(), key: 'a copy 3', data: 'a', ...getSchema() },
    ];
    const stackUniqSchemaKeys: string[] = ['a copy 4'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 5');
  });

  test('getUniqSchemaKey case7', () => {
    const copiedSchemaKey = 'a';
    const schema: Schema[] = [{ id: uuid(), key: 'a', data: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = ['a copy 2', 'a copy 3', 'a copy 4'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 5');
  });

  test('getUniqSchemaKey case8', () => {
    const copiedSchemaKey = 'a copy 2';
    const schema: Schema[] = [{ id: uuid(), key: 'a copy 2', data: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = ['a copy 3'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 4');
  });

  test('getUniqSchemaKey case9', () => {
    const copiedSchemaKey = 'a copy 9';
    const schema: Schema[] = [{ id: uuid(), key: 'a copy 9', data: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = ['a copy 10'];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 11');
  });

  test('getUniqSchemaKey case10', () => {
    const copiedSchemaKey = 'a copy 10';
    const schema: Schema[] = [{ id: uuid(), key: 'a copy 10', data: 'a', ...getSchema() }];
    const stackUniqSchemaKeys: string[] = [];
    const uniqSchemaKey = getUniqSchemaKey({ copiedSchemaKey, schema, stackUniqSchemaKeys });
    expect(uniqSchemaKey).toBe('a copy 11');
  });
});
