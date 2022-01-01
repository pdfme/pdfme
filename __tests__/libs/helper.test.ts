import { readFileSync } from 'fs';
import * as path from 'path';
import { Font, Schemas } from '../../src/libs/type';
import { checkFont } from '../../src/libs/helper';

const sansData = readFileSync(path.join(__dirname, `../assets/fonts/SauceHanSansJP.ttf`));
const serifData = readFileSync(path.join(__dirname, `../assets/fonts/SauceHanSerifJP.ttf`));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { default: true, data: sansData },
  SauceHanSerifJP: { data: serifData },
});

const getSampleSchemas = (): Schemas => [
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
];

describe('checkFont test', () => {
  test('success test: no fontName in Schemas', () => {
    const getSchemas = (): Schemas => [
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
    ];
    try {
      checkFont({ schemas: getSchemas(), font: getSampleFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('success test: fontName in Schemas(default font)', () => {
    try {
      checkFont({ schemas: getSampleSchemas(), font: getSampleFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('success test: fontName in Schemas(not default font)', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData },
      SauceHanSerifJP: { default: true, data: serifData },
    });

    try {
      checkFont({ schemas: getSampleSchemas(), font: getFont() });
      expect.anything();
    } catch (e) {
      fail();
    }
  });

  test('fail test: no default font', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData },
      SauceHanSerifJP: { data: serifData },
    });

    try {
      checkFont({ schemas: getSampleSchemas(), font: getFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        'default flag is not found in font. true default flag must be only one.'
      );
    }
  });

  test('fail test: too many default font', () => {
    const getFont = (): Font => ({
      SauceHanSansJP: { data: sansData, default: true },
      SauceHanSerifJP: { data: serifData, default: true },
    });

    try {
      checkFont({ schemas: getSampleSchemas(), font: getFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        '2 default flags found in font. true default flag must be only one.'
      );
    }
  });

  test('fail test: fontName in Schemas not found in font(single)', () => {
    const getSchemas = (): Schemas => [
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
    ];

    try {
      checkFont({ schemas: getSchemas(), font: getSampleFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual('SauceHanSansJP2 of template.schemas is not found in font.');
    }
  });

  test('fail test: fontName in Schemas not found in font(single)', () => {
    const getSchemas = (): Schemas => [
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
    ];

    try {
      checkFont({ schemas: getSchemas(), font: getSampleFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        'SauceHanSansJP2,SauceHanSerifJP2 of template.schemas is not found in font.'
      );
    }
  });
});
