import { readFileSync } from 'fs';
import * as path from 'path';
import {
  mm2pt,
  pt2mm,
  pt2px,
  checkFont,
  checkPlugins,
  isHexValid,
  calculateDiffMap,
  normalizePositionsAndPageBreak,
} from '../src/helper';
import { PT_TO_PX_RATIO, BLANK_PDF, Template, Font, Plugins, Schema, CommonOptions } from '../src';

const sansData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSansJP.ttf`));
const serifData = readFileSync(path.join(__dirname, `/assets/fonts/SauceHanSerifJP.ttf`));

const getSampleFont = (): Font => ({
  SauceHanSansJP: { fallback: true, data: sansData },
  SauceHanSerifJP: { data: serifData },
});

const getTemplate = (): Template => ({
  basePdf: BLANK_PDF,
  schemas: [
    {
      a: {
        content: 'a',
        type: 'text',
        fontName: 'SauceHanSansJP',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
      b: {
        content: 'b',
        type: 'text',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    },
  ],
});

describe('mm2pt test', () => {
  it('converts millimeters to points', () => {
    expect(mm2pt(1)).toEqual(2.8346);
    expect(mm2pt(10)).toEqual(28.346);
    expect(mm2pt(4395.12)).toEqual(12458.407152);
  });
});

describe('pt2mm test', () => {
  it('converts points to millimeters', () => {
    expect(pt2mm(1)).toEqual(0.3528);
    expect(pt2mm(2.8346)).toEqual(1.00004688); // close enough!
    expect(pt2mm(10)).toEqual(3.528);
    expect(pt2mm(5322.98)).toEqual(1877.947344);
  });
});

describe('pt2px test', () => {
  it('converts points to pixels', () => {
    expect(pt2px(1)).toEqual(PT_TO_PX_RATIO);
    expect(pt2px(1)).toEqual(1.333);
    expect(pt2px(2.8346)).toEqual(3.7785218);
    expect(pt2px(10)).toEqual(13.33);
    expect(pt2px(5322.98)).toEqual(7095.532339999999);
  });
});

describe('isHexValid test', () => {
  test('valid hex', () => {
    expect(isHexValid('#fff')).toEqual(true);
    expect(isHexValid('#ffffff')).toEqual(true);
    expect(isHexValid('#ffffff00')).toEqual(true);
    expect(isHexValid('#ffffff00')).toEqual(true);
  });

  test('invalid hex', () => {
    expect(isHexValid('#ff')).toEqual(false);
    expect(isHexValid('#fffff')).toEqual(false);
    expect(isHexValid('#ffffff000')).toEqual(false);
    expect(isHexValid('#ffffff0000')).toEqual(false);
    expect(isHexValid('#ffffff00000')).toEqual(false);
    expect(isHexValid('#ffffff000000')).toEqual(false);
    expect(isHexValid('#pdfme123')).toEqual(false);
  });
});

describe('checkFont test', () => {
  test('success test: no fontName in Schemas', () => {
    const _getTemplate = (): Template => ({
      basePdf: BLANK_PDF,
      schemas: [
        {
          a: {
            content: 'a',
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            content: 'b',
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
        `[@pdfme/common] fallback flag is not found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`
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
        `[@pdfme/common] 2 fallback flags found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`
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
            content: 'a',
            fontName: 'SauceHanSansJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            content: 'b',
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
        `[@pdfme/common] SauceHanSansJP2 of template.schemas is not found in font.
Check this document: https://pdfme.com/docs/custom-fonts`
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
            content: 'a',
            fontName: 'SauceHanSansJP2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          b: {
            type: 'text',
            content: 'b',
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
        `[@pdfme/common] SauceHanSansJP2,SauceHanSerifJP2 of template.schemas is not found in font.
Check this document: https://pdfme.com/docs/custom-fonts`
      );
    }
  });
});

describe('checkPlugins test', () => {
  const plugins: Plugins = {
    myText: {
      pdf: async () => {},
      ui: async () => {},
      propPanel: {
        schema: {},
        defaultSchema: {
          type: 'myText',
          content: '',
          position: { x: 0, y: 0 },
          width: 100,
          height: 100,
        },
      },
    },
    myImage: {
      pdf: async () => {},
      ui: async () => {},
      propPanel: {
        schema: {},
        defaultSchema: {
          type: 'myImage',
          content: '',
          position: { x: 0, y: 0 },
          width: 100,
          height: 100,
        },
      },
    },
  };
  test('success test: no type in Schemas(no plugins)', () => {
    try {
      const template = getTemplate();
      template.schemas = [];
      checkPlugins({ template, plugins: {} });
      expect.anything();
    } catch (e) {
      fail();
    }
  });
  test('success test: no type in Schemas(with plugins)', () => {
    try {
      const template = getTemplate();
      template.schemas = [];
      checkPlugins({ template, plugins });
      expect.anything();
    } catch (e) {
      fail();
    }
  });
  test('success test: type in Schemas(single)', () => {
    try {
      const template = getTemplate();
      template.schemas[0].a.type = 'myText';
      template.schemas[0].b.type = 'myText';
      checkPlugins({ template, plugins });
      expect.anything();
    } catch (e) {
      fail();
    }
  });
  test('success test: type in Schemas(multiple)', () => {
    try {
      const template = getTemplate();
      template.schemas[0].a.type = 'myText';
      template.schemas[0].b.type = 'myImage';
      checkPlugins({ template, plugins });
      expect.anything();
    } catch (e) {
      fail();
    }
  });
  test('fail test: type in Schemas not found in plugins(single)', () => {
    try {
      const template = getTemplate();
      template.schemas[0].a.type = 'fail';
      template.schemas[0].b.type = 'myImage';
      checkPlugins({ template, plugins });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        `[@pdfme/common] fail of template.schemas is not found in plugins.`
      );
    }
  });
  test('fail test: type in Schemas not found in plugins(multiple)', () => {
    try {
      const template = getTemplate();
      template.schemas[0].a.type = 'fail';
      template.schemas[0].b.type = 'fail2';
      checkPlugins({ template, plugins });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        `[@pdfme/common] fail,fail2 of template.schemas is not found in plugins.`
      );
    }
  });
});

describe.skip('getDynamicTemplate test', () => {
  const options = { font: getSampleFont() };
  const _cache = new Map();
  const input = {};
  const modifyTemplate = async (arg: {
    template: Template;
    input: Record<string, string>;
    _cache: Map<any, any>;
    options: CommonOptions;
  }) => Promise.resolve(arg.template);
  const getDynamicHeight = (_: string, args: { schema: Schema }) => {
    const { schema } = args;
    if (schema.type === 'test') return Promise.resolve(schema.height + 100);
    return Promise.resolve(schema.height);
  };
  const generateTemplateConfig = (template: Template) => ({
    template,
    input,
    _cache,
    options,
    modifyTemplate,
    getDynamicHeight,
  });

  const getTemplateForDynamicTemplate = () => {
    const template = getTemplate();
    template.basePdf = { width: 210, height: 297, padding: [10, 10, 10, 10] };
    const schema = template.schemas[0];
    const schemaA = schema.a;
    schemaA.position = { x: 0, y: 50 };
    schemaA.height = 10;
    const schemaB = schema.b;
    schemaB.position = { x: 0, y: 75 };
    schemaB.height = 10;
    return template;
  };

  const getSingleDynamicTemplate = () => {
    const template = getTemplateForDynamicTemplate();
    const schema = template.schemas[0];
    schema.test = { type: 'test', position: { x: 0, y: 10 }, width: 100, height: 10 };
    return template;
  };

  const getMultiDynamicTemplate = () => {
    const template = getTemplateForDynamicTemplate();
    const schema = template.schemas[0];
    schema.test = { type: 'test', position: { x: 0, y: 10 }, width: 100, height: 10 };
    schema.test2 = { type: 'test', position: { x: 0, y: 20 }, width: 100, height: 10 };
    return template;
  };

  describe('calculateDiffMap test', () => {
    test('single dynamic schema', async () => {
      const template = getSingleDynamicTemplate();
      const tableConfig = generateTemplateConfig(template);

      const diffMap = await calculateDiffMap(tableConfig);
      expect(diffMap).toEqual(new Map([[20, 100]]));
    });

    test('multi dynamic schemas', async () => {
      const template = getMultiDynamicTemplate();
      const tableConfig = generateTemplateConfig(template);

      const diffMap = await calculateDiffMap(tableConfig);
      expect(diffMap).toEqual(
        new Map([
          [20, 100],
          [130, 200],
        ])
      );
    });
  });

  // TODO Re-verify if the correct tests are written and revise the implementation of normalizePositionsAndPageBreak to pass the tests
  describe('normalizePositionsAndPageBreak test', () => {
    test('single dynamic schema', () => {
      const template = getTemplateForDynamicTemplate();
      const diffMap = new Map([[60, 100]]);
      const newTemplate = normalizePositionsAndPageBreak(template, diffMap);
      expect(newTemplate).toEqual({
        basePdf: template.basePdf,
        schemas: [
          {
            a: {
              content: 'a',
              type: 'text',
              fontName: 'SauceHanSansJP',
              // y: 50->50
              position: { x: 0, y: 50 },
              width: 100,
              height: 10,
            },
            b: {
              content: 'b',
              type: 'text',
              // y: 75->175
              position: { x: 0, y: 175 },
              width: 100,
              height: 10,
            },
          },
        ],
      });
    });

    test('single dynamic schema (page break)', () => {
      const template = getTemplateForDynamicTemplate();
      const diffMap = new Map([[60, 300]]);
      const newTemplate = normalizePositionsAndPageBreak(template, diffMap);
      expect(newTemplate).toEqual({
        basePdf: template.basePdf,
        schemas: [
          {
            a: {
              content: 'a',
              type: 'text',
              fontName: 'SauceHanSansJP',
              // y: 50->50
              position: { x: 0, y: 50 },
              width: 100,
              height: 10,
            },
          },
          {
            b: {
              content: 'b',
              type: 'text',
              // schema y: 75 + 300
              // page: 297 - (10 + 10)
              // (75 + 300) - (297 - (10 + 10)) = 98
              // y: 75->98
              position: { x: 0, y: 98 },
              width: 100,
              height: 10,
            },
          },
        ],
      });
    });

    test('multi dynamic schemas', () => {
      const template = getTemplateForDynamicTemplate();
      const diffMap = new Map([
        [45, 10],
        [65, 30],
      ]);
      const newTemplate = normalizePositionsAndPageBreak(template, diffMap);
      expect(newTemplate).toEqual({
        basePdf: template.basePdf,
        schemas: [
          {
            a: {
              content: 'a',
              type: 'text',
              fontName: 'SauceHanSansJP',
              // y: 50->60
              position: { x: 0, y: 60 },
              width: 100,
              height: 10,
            },
            b: {
              content: 'b',
              type: 'text',
              // y: 75->105
              position: { x: 0, y: 105 },
              width: 100,
              height: 10,
            },
          },
        ],
      });
    });

    test('multi dynamic schemas (page break)', () => {
      const template = getTemplateForDynamicTemplate();
      const diffMap = new Map([
        [45, 100],
        [65, 300],
      ]);
      const newTemplate = normalizePositionsAndPageBreak(template, diffMap);
      expect(newTemplate).toEqual({
        basePdf: template.basePdf,
        schemas: [
          {
            a: {
              content: 'a',
              type: 'text',
              fontName: 'SauceHanSansJP',
              // y: 50->150
              position: { x: 0, y: 150 },
              width: 100,
              height: 10,
            },
          },
          {
            b: {
              content: 'b',
              type: 'text',
              // schema y: 75 + 300
              // page: 297 - (10 + 10)
              // (75 + 300) - (297 - (10 + 10)) = 98
              // y: 75->98
              position: { x: 0, y: 98 },
              width: 100,
              height: 10,
            },
          },
        ],
      });
    });

    test('multi dynamic schemas (page break 2 pages)', () => {
      const template = getTemplateForDynamicTemplate();
      const diffMap = new Map([
        [45, 300],
        [65, 300],
      ]);
      const newTemplate = normalizePositionsAndPageBreak(template, diffMap);
      expect(newTemplate).toEqual({
        basePdf: template.basePdf,
        schemas: [
          // TODO Write test
        ],
      });
    });
  });
});
