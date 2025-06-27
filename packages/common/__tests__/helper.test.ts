import { readFileSync } from 'fs';
import * as path from 'path';
import {
  mm2pt,
  pt2mm,
  pt2px,
  checkGenerateProps,
  checkFont,
  checkPlugins,
  isHexValid,
  migrateTemplate,
} from '../src/helper.js';
import {
  PT_TO_PX_RATIO,
  BLANK_PDF,
  Template,
  Font,
  Plugins,
  SchemaPageArray,
  getB64BasePdf,
} from '../src/index.js';

const sansData = readFileSync(path.join(__dirname, `/assets/fonts/NotoSans-Regular.ttf`));
const serifData = readFileSync(path.join(__dirname, `/assets/fonts/NotoSerif-Regular.ttf`));

const getSampleFont = (): Font => ({
  NotoSans: { fallback: true, data: sansData },
  NotoSerif: { data: serifData },
});

const getTemplate = (): Template => ({
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'a',
        content: 'a',
        type: 'text',
        fontName: 'NotoSans',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
      {
        name: 'b',
        content: 'b',
        type: 'text',
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ],
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

// NOTE: We only test the generator check function because the others
// have a schema that checks for HTMLElement, which isn't available in the test environment
describe('checkGenerateProps', () => {
  test('accepts valid generator schema', () => {
    const validProps = {
      inputs: [{a: 'a', b: 'b'}],
      template: {
        basePdf: 'data:application/pdf;base64,abc123',
        schemas: [
          [
            {
              name: 'field1',
              type: 'text',
              position: { x: 0, y: 0 },
              width: 100,
              height: 100,
              content: 'Test'
            }
          ]
        ]
      },
      options: {
        font: getSampleFont()
      },
      plugins: {
        text: {
          pdf: async () => {},
          ui: async () => {},
          propPanel: {
            schema: {},
            defaultSchema: {
              type: 'text',
              name: 'myText',
              content: '',
              position: { x: 0, y: 0 },
              width: 100,
              height: 100
            }
          }
        }
      }
    };

    expect(() => checkGenerateProps(validProps)).not.toThrow();
  });

  test('throws for invalid template structure', () => {
    const invalidProps = {
      template: {
        schemas: 'not-an-array' // Invalid type
      }
    };

    expect(() => checkGenerateProps(invalidProps)).toThrow("[@pdfme/common] Invalid argument:\n" +
      "--------------------------\n" +
      "ERROR POSITION: template.schemas\n" +
      "ERROR MESSAGE: Expected array, received string\n" +
      "--------------------------\n" +
      "ERROR POSITION: template.basePdf\n" +
      "ERROR MESSAGE: Invalid input\n" +
      "--------------------------\n" +
      "ERROR POSITION: inputs\n" +
      "ERROR MESSAGE: Required\n" +
      "--------------------------");
  });

  test('throws for missing required template field and empty inputs', () => {
    const missingSchemaProps = {
      inputs: [],
      template: {
        basePdf: 'data:application/pdf;base64,abc123',
        // schemas is missing
      }
    };

    expect(() => checkGenerateProps(missingSchemaProps)).toThrow("[@pdfme/common] Invalid argument:\n" +
      "--------------------------\n" +
      "ERROR POSITION: template.schemas\n" +
      "ERROR MESSAGE: Required\n" +
      "--------------------------\n" +
      "ERROR POSITION: inputs\n" +
      "ERROR MESSAGE: Array must contain at least 1 element(s)\n" +
      "--------------------------");
  });

  test('throws for invalid plugin definitions', () => {
    const invalidPluginProps = {
      inputs: [{a: 'a'}],
      template: {
        basePdf: 'data:application/pdf;base64,abc123',
        schemas: [[]]
      },
      plugins: {
        invalid: {
          // missing pdf
          // missing ui
          propPanel: {
            schema: {},
            defaultSchema: {
              // missing type
              name: 'myText',
              content: '',
              position: { x: 0, y: 0 },
              width: 100,
              height: 100
            }
          }
        },
        missingPanel: {
          pdf: async () => {},
          ui: async () => {},
          // missing propPanel
        },
        missingDefaultSchema: {
          pdf: async () => {},
          ui: async () => {},
          propPanel: {}
        }
      }
    };

    expect(() => checkGenerateProps(invalidPluginProps)).toThrow("[@pdfme/common] Invalid argument:\n" +
      "--------------------------\n" +
      "ERROR POSITION: plugins.invalid.ui\n" +
      "ERROR MESSAGE: Required\n" +
      "--------------------------\n" +
      "ERROR POSITION: plugins.invalid.pdf\n" +
      "ERROR MESSAGE: Required\n" +
      "--------------------------\n" +
      "ERROR POSITION: plugins.invalid.propPanel.defaultSchema.type\n" +
      "ERROR MESSAGE: Required\n" +
      "--------------------------\n" +
      "ERROR POSITION: plugins.missingPanel.propPanel\n" +
      "ERROR MESSAGE: Required\n" +
      "--------------------------\n" +
      "ERROR POSITION: plugins.missingDefaultSchema.propPanel.defaultSchema\n" +
      "ERROR MESSAGE: Required\n" +
      "--------------------------");
  });

  test('calls checkFont when font option is provided', () => {
    const propsWithFont = {
      inputs: [{a: 'a'}],
      template: {
        basePdf: 'data:application/pdf;base64,abc123',
        schemas: [[]]
      },
      options: {
        font: { Roboto: { data: new Uint8Array(), fallback: true } }
      }
    };

    checkGenerateProps(propsWithFont);
  });
});

describe('checkFont test', () => {
  test('success test: no fontName in Schemas', () => {
    const _getTemplate = (): Template => ({
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'a',
            content: 'a',
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          {
            name: 'b',
            content: 'b',
            type: 'text',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        ],
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
      NotoSans: { data: sansData },
      NotoSerif: { fallback: true, data: serifData },
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
      NotoSans: { data: sansData },
      NotoSerif: { data: serifData },
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
      NotoSans: { data: sansData, fallback: true },
      NotoSerif: { data: serifData, fallback: true },
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
        [
          {
            name: 'a',
            type: 'text',
            content: 'a',
            fontName: 'NotoSans2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          {
            name: 'b',
            type: 'text',
            content: 'b',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        ],
      ],
    });

    try {
      checkFont({ template: _getTemplate(), font: getSampleFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        `[@pdfme/common] NotoSans2 of template.schemas is not found in font.
Check this document: https://pdfme.com/docs/custom-fonts`
      );
    }
  });

  test('fail test: fontName in Schemas not found in font(single)', () => {
    const _getTemplate = (): Template => ({
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'a',
            type: 'text',
            content: 'a',
            fontName: 'NotoSans2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
          {
            name: 'b',
            type: 'text',
            content: 'b',
            fontName: 'NotoSerif2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 100,
          },
        ],
      ],
    });

    try {
      checkFont({ template: _getTemplate(), font: getSampleFont() });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        `[@pdfme/common] NotoSans2,NotoSerif2 of template.schemas is not found in font.
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
          name: 'myText',
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
          name: 'myImage',
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
      template.schemas[0][0].type = 'myText';
      template.schemas[0][1].type = 'myText';
      checkPlugins({ template, plugins });
      expect.anything();
    } catch (e) {
      fail();
    }
  });
  test('success test: type in Schemas(multiple)', () => {
    try {
      const template = getTemplate();
      template.schemas[0][0].type = 'myText';
      template.schemas[0][1].type = 'myImage';
      checkPlugins({ template, plugins });
      expect.anything();
    } catch (e) {
      fail();
    }
  });
  test('fail test: type in Schemas not found in plugins(single)', () => {
    try {
      const template = getTemplate();
      template.schemas[0][0].type = 'fail';
      template.schemas[0][1].type = 'myImage';
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
      template.schemas[0][0].type = 'fail';
      template.schemas[0][1].type = 'fail2';
      checkPlugins({ template, plugins });
      fail();
    } catch (e: any) {
      expect(e.message).toEqual(
        `[@pdfme/common] fail,fail2 of template.schemas is not found in plugins.`
      );
    }
  });
});

describe('migrateTemplate', () => {
  it('should convert LegacySchemaPageArray to SchemaPageArray', () => {
    const legacyTemplate: any = {
      schemas: [
        {
          field1: {
            type: 'text',
            content: 'Field 1',
            width: 45,
            height: 10,
            position: {
              x: 0,
              y: 0,
            },
          },
          field2: {
            type: 'text',
            content: 'Field 2',
            width: 45,
            height: 10,
            position: {
              x: 0,
              y: 0,
            },
          },
        },
        {
          field3: {
            type: 'text',
            content: 'Field 3',
            width: 45,
            height: 10,
            position: {
              x: 0,
              y: 0,
            },
          },
        },
      ],
    };

    migrateTemplate(legacyTemplate);

    const expectedSchemaPageArray: SchemaPageArray = [
      [
        {
          name: 'field1',
          type: 'text',
          content: 'Field 1',
          width: 45,
          height: 10,
          position: {
            x: 0,
            y: 0,
          },
        },
        {
          name: 'field2',
          type: 'text',
          content: 'Field 2',
          width: 45,
          height: 10,
          position: {
            x: 0,
            y: 0,
          },
        },
      ],
      [
        {
          name: 'field3',
          type: 'text',
          content: 'Field 3',
          width: 45,
          height: 10,
          position: {
            x: 0,
            y: 0,
          },
        },
      ],
    ];

    expect(legacyTemplate.schemas).toEqual(expectedSchemaPageArray);
  });

  it('should not modify already SchemaPageArray', () => {
    const pagedTemplate: any = {
      schemas: [
        [
          {
            name: 'field1',
            type: 'text',
            content: 'Field 1',
            width: 45,
            height: 10,
            position: {
              x: 0,
              y: 0,
            },
          },
          {
            name: 'field2',
            type: 'text',
            content: 'Field 2',
            width: 45,
            height: 10,
            position: {
              x: 0,
              y: 0,
            },
          },
        ],
        [
          {
            name: 'field3',
            type: 'text',
            content: 'Field 3',
            width: 45,
            height: 10,
            position: {
              x: 0,
              y: 0,
            },
          },
        ],
      ],
    };

    const before = JSON.parse(JSON.stringify(pagedTemplate));

    migrateTemplate(pagedTemplate);

    expect(pagedTemplate.schemas).toEqual(before.schemas);
  });
});

describe('getB64BasePdf', () => {
  test('base64 string', async () => {
    const result = await getB64BasePdf(BLANK_PDF);
    expect(typeof result).toBe('string');
  });

  test('Uint8Array', async () => {
    const result = await getB64BasePdf(new Uint8Array([10, 20, 30, 40, 50]));
    expect(typeof result).toBe('string');
  });
});
