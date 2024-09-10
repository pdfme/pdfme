import { readFileSync } from 'fs';
import * as path from 'path';
import {
  mm2pt,
  pt2mm,
  pt2px,
  checkFont,
  checkPlugins,
  isHexValid,
  getDynamicTemplate,
} from '../src/helper';
import {
  PT_TO_PX_RATIO,
  BLANK_PDF,
  Template,
  Font,
  Plugins,
  Schema,
} from '../src';

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

describe('getDynamicTemplate', () => {
  const height = 10;
  const aPositionY = 10;
  const bPositionY = 30;
  const padding = 10;
  const template: Template = {
    schemas: [
      {
        a: {
          content: 'a',
          type: 'a',
          position: { x: 10, y: aPositionY },
          width: 10,
          height,
        },
        b: {
          content: 'b',
          type: 'b',
          position: { x: 10, y: bPositionY },
          width: 10,
          height,
        },
      },
    ],
    basePdf: { width: 100, height: 100, padding: [padding, padding, padding, padding] },
  };

  const input = { a: 'a', b: 'b' };
  const options = { font: getSampleFont() };
  const _cache = new Map();
  const getDynamicTemplateArg = { template, input, options, _cache };

  const createGetDynamicTemplateArg = (increaseHeights: number[], bHeight?: number) => ({
    ...getDynamicTemplateArg,
    getDynamicHeights: async (value: string, args: { schema: Schema }) => {
      if (args.schema.type === 'a') {
        return Promise.resolve(increaseHeights);
      }
      return Promise.resolve([bHeight || args.schema.height]);
    },
  });

  const verifyBasicStructure = (dynamicTemplate: Template) => {
    expect(dynamicTemplate.schemas).toBeDefined();
    expect(Array.isArray(dynamicTemplate.schemas)).toBe(true);
    expect(dynamicTemplate.basePdf).toEqual({
      width: 100,
      height: 100,
      padding: [padding, padding, padding, padding],
    });
  };

  describe('Single page scenarios', () => {
    test('should handle no page break', async () => {
      const increaseHeights = [10, 10, 10, 10, 10];
      const dynamicTemplate = await getDynamicTemplate(createGetDynamicTemplateArg(increaseHeights));

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(1);
      expect(dynamicTemplate.schemas[0].a.position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0].b.position.y).toEqual(
        increaseHeights.reduce((a, b) => a + b, 0) - height + bPositionY
      );
    });
  });

  describe('Multiple page scenarios', () => {
    test('should handle page break with a on page 1 and b on page 2', async () => {
      const increaseHeights = [20, 20, 20, 20];
      const dynamicTemplate = await getDynamicTemplate(createGetDynamicTemplateArg(increaseHeights));

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);
      expect(dynamicTemplate.schemas[0].a.position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0].b).toBeUndefined();
      expect(dynamicTemplate.schemas[1].b.position.y).toEqual(padding);
    });

    test('should handle page break with a on page 1 and 2, b on page 2', async () => {
      const increaseHeights = [20, 20, 20, 20, 20];
      const dynamicTemplate = await getDynamicTemplate(createGetDynamicTemplateArg(increaseHeights));

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);
      expect(dynamicTemplate.schemas[0].a.position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0].b).toBeUndefined();
      expect(dynamicTemplate.schemas[1].a.position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[1].b.position.y).toEqual(
        increaseHeights.slice(3).reduce((a, b) => a + b, 0) - height + padding
      );
    });

    test('should handle multiple page breaks', async () => {
      const increaseHeights = [50, 50, 50, 50, 50];
      const dynamicTemplate = await getDynamicTemplate(createGetDynamicTemplateArg(increaseHeights));

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(5);

      // Verify 'a' elements
      for (let i = 0; i < 4; i++) {
        expect(dynamicTemplate.schemas[i].a).toBeDefined();
        expect(dynamicTemplate.schemas[i].a.position.y).toEqual(i === 0 ? aPositionY : padding);
        expect(dynamicTemplate.schemas[i].a.height).toEqual(i === 3 ? 100 : 50);
        expect(dynamicTemplate.schemas[i].b).toBeUndefined();
      }

      // Verify 'b' element
      expect(dynamicTemplate.schemas[4].b).toBeDefined();
      expect(dynamicTemplate.schemas[4].b.position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[4].b.height).toEqual(10);
    });

    test('should handle both a and b on next page', async () => {
      const increaseHeights = [80, 10, 10];
      const dynamicTemplate = await getDynamicTemplate(createGetDynamicTemplateArg(increaseHeights));

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);

      // Check first page
      expect(dynamicTemplate.schemas[0].a).toBeDefined();
      expect(dynamicTemplate.schemas[0].a.position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0].a.height).toEqual(80);
      expect(dynamicTemplate.schemas[0].b).toBeUndefined();

      // Check second page
      expect(dynamicTemplate.schemas[1].a).toBeDefined();
      expect(dynamicTemplate.schemas[1].a.position.y).toEqual(padding);
      expect(dynamicTemplate.schemas[1].a.height).toEqual(20);

      expect(dynamicTemplate.schemas[1].b).toBeDefined();
      expect(dynamicTemplate.schemas[1].b.position.y).toBeGreaterThanOrEqual(
        dynamicTemplate.schemas[1].a.position.y + dynamicTemplate.schemas[1].a.height
      );
    });
  });

  describe('Element height modifications', () => {
    test('should handle increased height for b', async () => {
      const increaseHeights = [10, 10, 10, 10, 10];
      const bHeight = 30;
      const dynamicTemplate = await getDynamicTemplate(createGetDynamicTemplateArg(increaseHeights, bHeight));

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(2);

      // Check 'a' element
      expect(dynamicTemplate.schemas[0].a).toBeDefined();
      expect(dynamicTemplate.schemas[0].a.position.y).toEqual(aPositionY);
      expect(dynamicTemplate.schemas[0].a.height).toEqual(50);

      // Check 'b' element
      const bSchema = dynamicTemplate.schemas.find((schema) => schema.b)!;
      expect(bSchema).toBeDefined();
      expect(bSchema.b.position.y).toEqual(padding);
      expect(bSchema.b.height).toEqual(bHeight);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty increase heights', async () => {
      const increaseHeights: number[] = [];
      const dynamicTemplate = await getDynamicTemplate(createGetDynamicTemplateArg(increaseHeights));

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBe(1);
      expect(dynamicTemplate.schemas[0].a).toBeUndefined();
      expect(dynamicTemplate.schemas[0].b).toBeDefined();
    });

    test('should handle very large increase heights', async () => {
      const increaseHeights = [1000, 1000];
      const dynamicTemplate = await getDynamicTemplate(createGetDynamicTemplateArg(increaseHeights));

      verifyBasicStructure(dynamicTemplate);
      expect(dynamicTemplate.schemas.length).toBeGreaterThan(1);
    });
  });
});