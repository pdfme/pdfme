import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mm2pt,
  pt2mm,
  pt2px,
  checkGenerateProps,
  checkUIOptions,
  checkFont,
  checkPlugins,
  isHexValid,
  isUrlSafeToFetch,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

describe('sidebar width options', () => {
  it('accepts omitted widths and positive custom widths', () => {
    expect(() => checkUIOptions({})).not.toThrow();
    expect(() =>
      checkUIOptions({ leftSidebarWidth: 100, rightSidebarWidth: 450 }),
    ).not.toThrow();
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('rejects invalid width %s', (width) => {
    expect(() => checkUIOptions({ leftSidebarWidth: width })).toThrow();
    expect(() => checkUIOptions({ rightSidebarWidth: width })).toThrow();
  });
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
      "ERROR MESSAGE: Invalid input: expected array, received string\n" +
      "--------------------------\n" +
      "ERROR POSITION: template.basePdf\n" +
      "ERROR MESSAGE: Invalid input\n" +
      "--------------------------\n" +
      "ERROR POSITION: inputs\n" +
      "ERROR MESSAGE: Invalid input: expected array, received undefined\n" +
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
      "ERROR MESSAGE: Invalid input: expected array, received undefined\n" +
      "--------------------------\n" +
      "ERROR POSITION: inputs\n" +
      "ERROR MESSAGE: Too small: expected array to have >=1 items\n" +
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

    let errorMessage = '';
    try {
      checkGenerateProps(invalidPluginProps);
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }

    expect(errorMessage).toContain('[@pdfme/common] Invalid argument:');
    expect(errorMessage).toContain('ERROR POSITION: plugins.invalid.propPanel.defaultSchema.type');
    expect(errorMessage).toContain('ERROR POSITION: plugins.missingPanel.propPanel');
    expect(errorMessage).toContain('ERROR POSITION: plugins.missingDefaultSchema.propPanel.defaultSchema');
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

  describe('with window defined', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test.each([
      'http://[::ffff:127.0.0.1]/a.pdf',
      'http://[::ffff:a9fe:a9fe]/a.pdf',
      'http://[::]/a.pdf',
      'http://localhost./a.pdf',
      'http://[64:ff9b::a9fe:a9fe]/a.pdf',
      'http://100.64.0.1/a.pdf',
    ])('rejects %s without fetching', async (url) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('window', {});
      vi.stubGlobal('fetch', fetchMock);

      await expect(getB64BasePdf(url)).rejects.toThrow('Invalid or unsafe URL for basePdf');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('fetches a public URL', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('network stubbed'));
      vi.stubGlobal('window', {});
      vi.stubGlobal('fetch', fetchMock);

      await expect(getB64BasePdf('https://example.com/a.pdf')).rejects.toThrow('network stubbed');
      expect(fetchMock).toHaveBeenCalledWith('https://example.com/a.pdf');
    });
  });
});

describe('isUrlSafeToFetch', () => {
  test.each([
    // GHSA-2rg9-wxfw-wrr7 reproduction
    'http://127.0.0.1/',
    'http://169.254.169.254/',
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:7f00:1]/',
    'http://[::ffff:a9fe:a9fe]/',
    'http://[::]/',
    'http://localhost./',
    // Hostnames
    'http://localhost/',
    'http://LOCALHOST/',
    'http://localhost:3000/',
    'http://localhost../',
    'http://foo.localhost/',
    'http://foo.localhost./',
    'http://localhost.localdomain/',
    'http://localhost.localdomain./',
    'http://LOCALHOST.LOCALDOMAIN/',
    'http://ip6-localhost/',
    'http://ip6-localhost./',
    'http://IP6-LOCALHOST/',
    'http://ip6-loopback/',
    'http://ip6-loopback./',
    'http://IP6-Loopback:8080/',
    // Non-public IPv4 ranges
    'http://0.0.0.0/',
    'http://0.1.2.3/',
    'http://10.0.0.1/',
    'http://10.255.255.255/',
    'http://100.64.0.1/',
    'http://100.127.255.255/',
    'http://127.0.0.1:8080/',
    'http://127.1.2.3/',
    'http://127.0.0.1./',
    'http://169.254.0.1/',
    'http://172.16.0.1/',
    'http://172.31.255.255/',
    'http://192.0.0.1/',
    'http://192.0.2.1/',
    'http://192.88.99.1/',
    'http://192.168.1.1/',
    'http://198.18.0.1/',
    'http://198.19.255.255/',
    'http://198.51.100.1/',
    'http://203.0.113.1/',
    'http://224.0.0.1/',
    'http://239.255.255.255/',
    'http://240.0.0.1/',
    'http://255.255.255.255/',
    // Alternative IPv4 notations normalised by the URL parser
    'http://2130706433/',
    'http://0x7f000001/',
    'http://0x7f.0.0.1/',
    'http://0177.0.0.1/',
    'http://127.1/',
    'http://3232235777/',
    'http://0xa9fea9fe/',
    // Non-public IPv6 ranges
    'http://[::1]/',
    'http://[0:0:0:0:0:0:0:1]/',
    'http://[0000:0000:0000:0000:0000:0000:0000:0000]/',
    'http://[::7f00:1]/',
    'http://[::127.0.0.1]/',
    'http://[100::1]/',
    'http://[2001:db8::1]/',
    'http://[fc00::1]/',
    'http://[fd12:3456:789a::1]/',
    'http://[FD00::1]/',
    'http://[fe80::1]/',
    'http://[FE80::1]/',
    'http://[febf::1]/',
    'http://[fec0::1]/',
    'http://[ff02::1]/',
    // IPv4-mapped
    'http://[::ffff:10.0.0.1]/',
    'http://[::ffff:0:0]/',
    'http://[::ffff:c0a8:101]/',
    'http://[0:0:0:0:0:FFFF:7F00:1]/',
    'http://[::FFFF:169.254.169.254]/',
    // NAT64
    'http://[64:ff9b::7f00:1]/',
    'http://[64:ff9b::169.254.169.254]/',
    'http://[64:ff9b::a00:1]/',
    'http://[64:ff9b:1::1]/',
    'http://[64:ff9b:1:ffff::8.8.8.8]/',
    // 6to4
    'http://[2002:7f00:1::]/',
    'http://[2002:a9fe:a9fe::1]/',
    'http://[2002:c0a8:101::1]/',
    // Teredo
    'http://[2001::1]/',
    'http://[2001:0:4136:e378:8000:63bf:3fff:fdd2]/',
    // Non-http schemes
    'file:///etc/passwd',
    'ftp://example.com/font.ttf',
    'data:application/pdf;base64,AAAA',
    'javascript:alert(1)',
    'blob:https://example.com/uuid',
    // Unparsable or empty host
    '',
    'not a url',
    '/relative/path.pdf',
    'http://',
    'http://[::1/',
    'http://[1:2:3:4:5:6:7:8:9]/',
    'http://256.0.0.1/',
    'http://./',
    'http://../',
  ])('rejects %s', (url) => {
    expect(isUrlSafeToFetch(url)).toBe(false);
  });

  test.each([
    'http://example.com/',
    'https://example.com/a.pdf',
    'https://fonts.gstatic.com/s/notosans/v1/font.ttf',
    'https://EXAMPLE.com/',
    'https://example.com./',
    'https://example.com:8443/a.pdf',
    'https://user:pass@example.com/',
    'https://例え.jp/',
    'https://localhost.example.com/',
    'https://localdomain.example.com/',
    'https://ip6-localhost.example.com/',
    'http://8.8.8.8/',
    'http://1.1.1.1:8080/',
    'http://9.255.255.255/',
    'http://11.0.0.1/',
    'http://100.63.255.255/',
    'http://100.128.0.1/',
    'http://172.15.255.255/',
    'http://172.32.0.1/',
    'http://198.20.0.1/',
    'http://223.255.255.255/',
    'http://[2001:4860:4860::8888]/',
    'http://[2606:4700:4700::1111]:8080/',
    'http://[2001:4860:4860:0:0:0:0:8888]/',
    'http://[::ffff:8.8.8.8]/',
    'http://[64:ff9b::808:808]/',
    'http://[2002:808:808::1]/',
  ])('allows %s', (url) => {
    expect(isUrlSafeToFetch(url)).toBe(true);
  });
});
