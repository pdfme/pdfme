import jsQR, { QRCode } from 'jsqr';
import { PNG } from 'pngjs';
import barcodes from '../src/barcodes/index.js';
import { ASPECT_RATIO_LOCKED_BARCODE_TYPES, BARCODE_TYPES } from '../src/barcodes/constants.js';
import {
  validateBarcodeInput,
  createBarCode,
  createBarCodeSvg,
  barCodeType2Bcid,
  mapHexColorForBwipJsLib,
  resolveBarcodeRenderRuntime,
  getBarcodeAspectRatio,
  getBarcodeFitLayout,
  getNaturalBarcodeSize,
  getSvgViewBoxSize,
  isSquareBarcodeType,
} from '../src/barcodes/helper.js';

describe('validateBarcodeInput test', () => {
  test('qrcode', () => {
    // Less than 500 characters
    const type = 'qrcode';

    const valid = 'https://www.google.com/';
    const valid2 = '漢字を含む文字列';
    const invalid2 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYIIiVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQ';
    const blank = '';
    expect(validateBarcodeInput(type, valid)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('japanpost', () => {
    // https://barcode-place.azurewebsites.net/Barcode/zip
    // Postal code is numbers (0-9) only, address display numbers can use alphanumeric characters (0-9, A-Z) and hyphens (-).
    const type = 'japanpost';

    const valid1 = '10000131-3-2-503';
    const valid2 = '10000131-3-2-B503';
    const invalid1 = 'invalid';
    const invalid2 = '10000131=3=2-503';
    const invalid3 = '10000131=3=2-503';
    const invalid4 = '10000131-3-2-b503';
    const blank = '';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, invalid3)).toEqual(false);
    expect(validateBarcodeInput(type, invalid4)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('ean13', () => {
    // https://barcode-place.azurewebsites.net/Barcode/jan
    // Valid characters are numbers (0-9) only. Standard type is 12 digits without check digit or 13 digits with check digit.
    const type = 'ean13';

    const valid1 = '111111111111';
    const valid2 = '1111111111116';
    const valid3 = '2822224229221';
    const valid4 = '3433333133331';
    const valid5 = '8434244447413';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, valid4)).toEqual(true);
    expect(validateBarcodeInput(type, valid5)).toEqual(true);

    const invalid1 = '111';
    const invalid2 = '111111111111111111111111';
    const invalid3 = 'invalid';
    const invalid4 = '11111a111111';
    const invalid5 = '1111111111111';
    const blank = '';
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, invalid3)).toEqual(false);
    expect(validateBarcodeInput(type, invalid4)).toEqual(false);
    expect(validateBarcodeInput(type, invalid5)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('ean8', () => {
    // https://barcode-place.azurewebsites.net/Barcode/jan
    // Valid characters are numbers (0-9) only. Short type is 7 digits without check digit or 8 digits with check digit.
    const type = 'ean8';

    const valid1 = '1111111';
    const valid2 = '11111115';
    const valid3 = '22222220';
    const valid4 = '33333335';
    const valid5 = '44444440';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, valid4)).toEqual(true);
    expect(validateBarcodeInput(type, valid5)).toEqual(true);

    const invalid1 = '111';
    const invalid2 = '11111111111111111111';
    const invalid3 = 'invalid';
    const invalid4 = '111a111';
    const invalid5 = '44444441';
    const blank = '';
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, invalid3)).toEqual(false);
    expect(validateBarcodeInput(type, invalid4)).toEqual(false);
    expect(validateBarcodeInput(type, invalid5)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('code39', () => {
    // https://barcode-place.azurewebsites.net/Barcode/code39
    // CODE39 supports numbers (0-9), uppercase alphabets (A-Z), symbols (-.$/+%), and spaces.
    const type = 'code39';

    const valid1 = '12345';
    const valid2 = 'ABCDE';
    const valid3 = '1A2B3C4D5G';
    const valid4 = '1-A $2/B+3%C4D5G';
    const invalid1 = '123a45';
    const invalid2 = '1-A$2/B+3%C4=D5G';
    const blank = '';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, valid4)).toEqual(true);
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('code128', () => {
    // https://www.keyence.co.jp/ss/products/autoid/codereader/basic_code128.jsp
    // Characters that can be typed from a computer keyboard (except kanji, hiragana, and katakana) are possible.
    const type = 'code128';

    const valid1 = '12345';
    const valid2 = '1-A$2/B+3%C4=D5G';
    const valid3 = '1-A$2/B+3%C4=D5Ga~';
    const invalid1 = '1-A$2/B+3%C4=D5Gひらがな';
    const invalid2 = '1-A$2/B+3%C4=D5G〜';
    const invalid3 = '1ーA$2・B＋3%C4=D5G〜';
    const blank = '';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, invalid3)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('nw7', () => {
    // https://barcode-place.azurewebsites.net/Barcode/nw7
    // https://en.wikipedia.org/wiki/Codabar
    // NW-7 supports numbers (0-9) and symbols (-.$:/+).
    // For start code/stop code, use any of the alphabets (A-D) at the beginning and end of the code.
    const type = 'nw7';

    const valid1 = 'A12345D';
    const valid2 = 'A$2/+345D';
    const valid3 = 'a4321D';
    const invalid1 = 'A12345G';
    const invalid2 = 'A12a45D';
    const blank = '';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('itf14', () => {
    // https://barcode-place.azurewebsites.net/Barcode/itf
    // Valid characters are numbers (0-9) only. 13 digits without check digit or 14 digits with check digit.
    const type = 'itf14';

    const valid1 = '1111111111111';
    const valid2 = '11111111111113';
    const valid3 = '22222222222226';
    const valid4 = '33333333333339';
    const valid5 = '44444444444442';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, valid4)).toEqual(true);
    expect(validateBarcodeInput(type, valid5)).toEqual(true);
    const invalid1 = '111';
    const invalid2 = '11111111111111111111111111111';
    const invalid3 = '11111111111112';
    const blank = '';
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, invalid3)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('upca', () => {
    // https://barcode-place.azurewebsites.net/Barcode/upc
    // Valid characters are numbers (0-9) only. 11 digits without check digit or 12 digits with check digit.
    const type = 'upca';

    const valid1 = '12345678901';
    const valid2 = '123456789012';
    const valid3 = '123456789036';
    const valid4 = '126456789013';
    const valid5 = '123456759015';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, valid4)).toEqual(true);
    expect(validateBarcodeInput(type, valid5)).toEqual(true);
    const invalid1 = '1234567890';
    const invalid2 = '1234567890123';
    const invalid3 = '123456789011';
    const invalid4 = '126456789014';
    const blank = '';
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, invalid3)).toEqual(false);
    expect(validateBarcodeInput(type, invalid4)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('upce', () => {
    // https://barcode-place.azurewebsites.net/Barcode/upc
    // Valid characters are numbers (0-9) only. The first digit (number system character) can only be 0.
    // 7 digits without check digit or 8 digits with check digit.
    const type = 'upce';

    const valid1 = '0111111';
    const valid2 = '01111118';
    const valid3 = '01111125';
    const valid4 = '01114126';
    const valid5 = '01101126';
    const blank = '';
    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, valid4)).toEqual(true);
    expect(validateBarcodeInput(type, valid5)).toEqual(true);
    const invalid1 = '1111111';
    const invalid2 = '011111111';
    const invalid3 = '01111128';
    const invalid4 = '01114125';
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
    expect(validateBarcodeInput(type, invalid2)).toEqual(false);
    expect(validateBarcodeInput(type, invalid3)).toEqual(false);
    expect(validateBarcodeInput(type, invalid4)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
  });
  test('gs1datamatrix', () => {
    // https://www.gs1.org/docs/barcodes/GS1_DataMatrix_Guideline.pdf
    // find the GTIN application identifier, regex for "(01)" and the digits after it until
    // another "(" or end of string
    const type = 'gs1datamatrix';

    let valid = '(01)12244668801011(17)250712(10)22322SSD3';
    let valid_12 = '(01)1224466880108(17)250712(10)22322SSD3';
    let invalid_bad_checkdigit = '(01)12244668801014(17)250712(10)22322SSD3';
    let invalid_input_length = '(01)12244668801011(17)250712(10)22322SSD3(10)22322SSD3';

    const blank = '';
    expect(validateBarcodeInput(type, valid)).toEqual(true);
    expect(validateBarcodeInput(type, valid_12)).toEqual(true);
    expect(validateBarcodeInput(type, invalid_bad_checkdigit)).toEqual(false);
    expect(validateBarcodeInput(type, blank)).toEqual(false);
    expect(validateBarcodeInput(type, invalid_input_length)).toEqual(false);
  });

  test('pdf417', () => {
    const type = 'pdf417';

    const valid1 = '12345ABCDE';
    const valid2 = 'Test PDF417 barcode generation';
    const valid3 = 'ひらがなカタカナ漢字も使えます';
    const valid4 = 'Special characters: !@#$%^&*()-_=+[]{}|;:,.<>?/';

    // PDF417 supports binary data and virtually any character
    // It can encode up to 1.1 kilobytes of binary data

    // Very long string that should still be valid
    const valid5 = 'a'.repeat(1000);

    // Empty string is not valid
    const blank = '';

    expect(validateBarcodeInput(type, valid1)).toEqual(true);
    expect(validateBarcodeInput(type, valid2)).toEqual(true);
    expect(validateBarcodeInput(type, valid3)).toEqual(true);
    expect(validateBarcodeInput(type, valid4)).toEqual(true);
    expect(validateBarcodeInput(type, valid5)).toEqual(true);
    expect(validateBarcodeInput(type, blank)).toEqual(false);

    // PDF417 has a capacity limit, extremely long strings should fail
    const invalid1 = 'a'.repeat(2000);
    expect(validateBarcodeInput(type, invalid1)).toEqual(false);
  });
});

/**
 * Test whether input data can be correctly read from the generated QR code (png) image
 */
describe('createBarCode', () => {
  // テスト名, input, expected
  const tests = [
    ['URL', 'https://www.google.com/', 'https://www.google.com/'],
    ['ひらがな', 'てすとです', 'てすとです'],
    ['ひらがな2', 'あいうえおあいうえお２', 'あいうえおあいうえお２'],
    ['カタカナ', 'テストです', 'テストです'],
    ['漢字', 'お正月', 'お正月'],
    ['中国語', '新年快乐', '新年快乐'],
    ['タイ語', 'สวัสดีปีใหม่', 'สวัสดีปีใหม่'],
  ];

  describe('generate qrcode with default colours', () => {
    for (const t of tests) {
      // eslint-disable-next-line no-loop-func
      test(`${t[0]}: ${t[1]}`, async () => {
        const buffer = await createBarCode({
          type: 'qrcode',
          input: t[1],
          width: 10, // mm
          height: 10, // mm
          backgroundColor: '00000000', // Background color must be specified for jsQR to analyze properly
        });
        const png = PNG.sync.read(buffer);
        const pngData = new Uint8ClampedArray(png.data);
        const qr = jsQR(pngData, png.width, png.height) as QRCode;
        expect(qr).not.toBeNull();
        const dataBuffer = Buffer.from(qr.binaryData);
        expect(dataBuffer.toString('utf8')).toEqual(t[2]);
      });
    }
  });

  describe('generate qrcode with custom colours', () => {
    for (const t of tests) {
      // eslint-disable-next-line no-loop-func
      test(`${t[0]}: ${t[1]}`, async () => {
        const buffer = await createBarCode({
          type: 'qrcode',
          input: t[1],
          width: 10, // mm
          height: 10, // mm
          backgroundColor: 'ffffff',
          barColor: 'f50505',
        });
        const png = PNG.sync.read(buffer);
        const pngData = new Uint8ClampedArray(png.data);
        const qr = jsQR(pngData, png.width, png.height) as QRCode;
        expect(qr).not.toBeNull();
        const dataBuffer = Buffer.from(qr.binaryData);
        expect(dataBuffer.toString('utf8')).toEqual(t[2]);
      });
    }
  });
});

describe('createBarCodeSvg', () => {
  const validInputs = {
    qrcode: 'https://pdfme.com/',
    japanpost: '10000131-3-2-B503',
    ean13: '1111111111116',
    ean8: '11111115',
    code39: 'ABC-123',
    code128: 'ABC-123',
    nw7: 'A12345B',
    itf14: '12345678901231',
    upca: '123456789012',
    upce: '01234565',
    gs1datamatrix: '(01)12345678901231',
    pdf417: 'Test PDF417 barcode generation',
  } as const;

  test.each(Object.entries(validInputs))('%s emits vector SVG without images', (type, input) => {
    const svg = createBarCodeSvg({
      type: type as keyof typeof validInputs,
      input,
      width: 30,
      height: 20,
      backgroundColor: '#ffffff',
      barColor: '#000000',
      textColor: '#000000',
    });

    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(/<image\b/i);
  });

  test('adds a default fill for SVG paths without an explicit fill', () => {
    const svg = createBarCodeSvg({
      type: 'qrcode',
      input: 'https://pdfme.com/default-fill',
      width: 30,
      height: 30,
      backgroundColor: '',
      barColor: '',
    });

    expect(svg).toMatch(/<svg\b[^>]*fill="#000000"/);
  });

  test('drops the alpha channel of an 8-digit barColor so bwip-js does not misread it as CMYK', () => {
    const svg = createBarCodeSvg({
      type: 'qrcode',
      input: 'https://pdfme.com/alpha-fill',
      width: 30,
      height: 30,
      backgroundColor: '',
      barColor: '#ff000080',
    });

    // The injected default fill must be the opaque color (no alpha to inherit in PDF),
    // and bwip-js must have received 'ff0000', not the CMYK-misread 'ff000080' (#007f7f).
    expect(svg).toMatch(/<svg\b[^>]*fill="#ff0000"/);
    expect(svg).toContain('#ff0000');
    expect(svg).not.toContain('ff000080');
    expect(svg).not.toContain('#007f7f');
  });

  test('renders a 4-digit barColor without bwip-js throwing', () => {
    const svg = createBarCodeSvg({
      type: 'qrcode',
      input: 'https://pdfme.com/short-alpha',
      width: 30,
      height: 30,
      backgroundColor: '',
      barColor: '#f008',
    });

    expect(svg).toContain('<svg');
    expect(svg).not.toContain('f008');
  });
});

describe('barCodeType2Bcid test', () => {
  test('it maps the nw7 barcode type', () => {
    expect(barCodeType2Bcid('nw7')).toEqual('rationalizedCodabar');
  });
  test('it returns all other types as they are', () => {
    expect(barCodeType2Bcid('qrcode')).toEqual('qrcode');
    expect(barCodeType2Bcid('japanpost')).toEqual('japanpost');
    expect(barCodeType2Bcid('ean8')).toEqual('ean8');
    expect(barCodeType2Bcid('ean13')).toEqual('ean13');
    expect(barCodeType2Bcid('code39')).toEqual('code39');
    expect(barCodeType2Bcid('code128')).toEqual('code128');
    expect(barCodeType2Bcid('itf14')).toEqual('itf14');
    expect(barCodeType2Bcid('upca')).toEqual('upca');
    expect(barCodeType2Bcid('upce')).toEqual('upce');
    expect(barCodeType2Bcid('gs1datamatrix')).toEqual('gs1datamatrix');
    expect(barCodeType2Bcid('pdf417')).toEqual('pdf417');
  });
});

describe('resolveBarcodeRenderRuntime', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('uses node-buffer in Node when neither document nor OffscreenCanvas exists', () => {
    expect(typeof globalThis.document).toBe('undefined');
    expect(typeof (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas).toBe('undefined');
    expect(resolveBarcodeRenderRuntime()).toBe('node-buffer');
  });

  test('falls back to node-buffer when OffscreenCanvas exists but toCanvas is missing', async () => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(
          public width: number,
          public height: number,
        ) {}
      },
    );
    expect(resolveBarcodeRenderRuntime()).toBe('node-buffer');

    const buffer = await createBarCode({
      type: 'qrcode',
      input: 'https://pdfme.com/node-export',
      width: 10,
      height: 10,
      backgroundColor: '00000000',
    });
    const png = PNG.sync.read(buffer);
    const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height) as QRCode;
    expect(qr).not.toBeNull();
    expect(Buffer.from(qr.binaryData).toString('utf8')).toEqual('https://pdfme.com/node-export');
  });

  test('prefers document-canvas when both document and OffscreenCanvas exist', () => {
    vi.stubGlobal('document', { createElement: () => ({}) });
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(
          public width: number,
          public height: number,
        ) {}
      },
    );
    expect(resolveBarcodeRenderRuntime()).toBe('document-canvas');
  });
});

describe('mapHexColorForBwipJsLib text', () => {
  test('it strips a hex if there is one', () => {
    expect(mapHexColorForBwipJsLib('#ffffff')).toEqual('ffffff');
    expect(mapHexColorForBwipJsLib('#eee')).toEqual('eee');
    expect(mapHexColorForBwipJsLib('ffffff')).toEqual('ffffff');
  });
  test('it strips a hex from a fallback color if main color not defined', () => {
    expect(mapHexColorForBwipJsLib(undefined, '#ffffff')).toEqual('ffffff');
    expect(mapHexColorForBwipJsLib(undefined, '#eee')).toEqual('eee');
    expect(mapHexColorForBwipJsLib(undefined, 'ffffff')).toEqual('ffffff');
  });
  test('it defaults to black if neither color nor fallback passed', () => {
    expect(mapHexColorForBwipJsLib(undefined)).toEqual('000000');
  });
  test('it drops the alpha channel so bwip-js never receives 8- or 4-digit hex', () => {
    expect(mapHexColorForBwipJsLib('#ff000080')).toEqual('ff0000');
    expect(mapHexColorForBwipJsLib('#f008')).toEqual('f00');
    expect(mapHexColorForBwipJsLib(undefined, '#ff000080')).toEqual('ff0000');
    expect(mapHexColorForBwipJsLib(undefined, '#f008')).toEqual('f00');
  });
  test('it keeps hash-less colors untouched (legacy bwip-js RRGGBB/CCMMYYKK format)', () => {
    expect(mapHexColorForBwipJsLib('ff000080')).toEqual('ff000080');
  });
});

describe('barcode aspect ratio', () => {
  test('omitting width and height renders the natural symbol', () => {
    const natural = createBarCodeSvg({ type: 'qrcode', input: 'https://pdfme.com/' });
    expect(natural).toContain('viewBox="0 0 250 250"');
    const stretched = createBarCodeSvg({
      type: 'qrcode',
      input: 'https://pdfme.com/',
      width: 60,
      height: 30,
    });
    expect(stretched).toContain('viewBox="0 0 850 425"');
  });

  test('getNaturalBarcodeSize ignores the schema box', () => {
    const schema = {
      name: '',
      type: 'qrcode' as const,
      position: { x: 0, y: 0 },
      width: 60,
      height: 30,
      backgroundColor: '#ffffff',
      barColor: '#000000',
    };
    expect(getNaturalBarcodeSize(schema, 'https://pdfme.com/')).toEqual({
      width: 250,
      height: 250,
    });
  });

  test('natural QR png is square and still decodes', async () => {
    const buffer = await createBarCode({
      type: 'qrcode',
      input: 'https://pdfme.com/',
      backgroundColor: 'ffffff',
    });
    const png = PNG.sync.read(buffer);
    expect(png.width).toBe(png.height);
    const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height) as QRCode;
    expect(qr).not.toBeNull();
    expect(Buffer.from(qr.binaryData).toString('utf8')).toEqual('https://pdfme.com/');
  });

  test('getBarcodeFitLayout letterboxes a natural size and falls back to the box', () => {
    // A box at the natural ratio must come back unchanged (exact equality), which keeps
    // its PDF output identical to the plain stretch path.
    for (const box of [30, 15, 33.33, 47.1]) {
      expect(
        getBarcodeFitLayout({ boxWidth: box, boxHeight: box, naturalWidth: 1, naturalHeight: 1 }),
      ).toEqual({ width: box, height: box, offsetX: 0, offsetY: 0 });
    }

    expect(
      getBarcodeFitLayout({ boxWidth: 60, boxHeight: 30, naturalWidth: 250, naturalHeight: 250 }),
    ).toEqual({ width: 30, height: 30, offsetX: 15, offsetY: 0 });

    expect(
      getBarcodeFitLayout({ boxWidth: 30, boxHeight: 60, naturalWidth: 250, naturalHeight: 250 }),
    ).toEqual({ width: 30, height: 30, offsetX: 0, offsetY: 15 });

    const wide = getBarcodeFitLayout({
      boxWidth: 40,
      boxHeight: 20,
      naturalWidth: 1101,
      naturalHeight: 104,
    });
    expect(wide.width).toBeCloseTo(40);
    expect(wide.height).toBeCloseTo((104 * 40) / 1101);
    expect(wide.offsetX).toBeCloseTo(0);
    expect(wide.offsetY).toBeCloseTo((20 - wide.height) / 2);

    expect(getBarcodeFitLayout({ boxWidth: 40, boxHeight: 20 })).toEqual({
      width: 40,
      height: 20,
      offsetX: 0,
      offsetY: 0,
    });
  });

  test('getSvgViewBoxSize parses a viewBox and returns undefined when it is absent', () => {
    expect(getSvgViewBoxSize('<svg viewBox="0 0 505 401"></svg>')).toEqual({
      width: 505,
      height: 401,
    });
    expect(getSvgViewBoxSize('<svg></svg>')).toBeUndefined();
  });

  test('getBarcodeAspectRatio: square types are 1 for any content, pdf417 follows content', () => {
    const base = { position: { x: 0, y: 0 }, width: 40, height: 20, name: '' };
    const colors = { backgroundColor: '#ffffff', barColor: '#000000' };
    expect(
      getBarcodeAspectRatio({ ...base, ...colors, type: 'qrcode', content: 'https://pdfme.com/' }),
    ).toBe(1);
    expect(getBarcodeAspectRatio({ ...base, ...colors, type: 'qrcode', content: '' })).toBe(1);
    expect(
      getBarcodeAspectRatio({ ...base, ...colors, type: 'gs1datamatrix', content: 'invalid' }),
    ).toBe(1);
    expect(
      getBarcodeAspectRatio({ ...base, ...colors, type: 'pdf417', content: 'This is PDF417!' }),
    ).toBeCloseTo(515 / 150);
    expect(
      getBarcodeAspectRatio({ ...base, ...colors, type: 'pdf417', content: 'PDF417 rotated' }),
    ).toBeCloseTo(515 / 135);
    expect(getBarcodeAspectRatio({ ...base, ...colors, type: 'pdf417', content: '' })).toBe(
      undefined,
    );
    expect(
      getBarcodeAspectRatio({ ...base, ...colors, type: 'code128', content: 'ABC-123' }),
    ).toBeUndefined();
  });

  test('bwip-js keeps square types square for short and long content', () => {
    const inputs: [string, string][] = [
      ['qrcode', 'A'],
      ['qrcode', 'https://pdfme.com/'],
      ['qrcode', 'x'.repeat(400)],
      ['gs1datamatrix', '(01)12345678901231'],
      ['gs1datamatrix', '(01)03453120000011(17)191125(10)ABCD1234'],
    ];
    for (const [type, input] of inputs) {
      expect(isSquareBarcodeType(type), type).toBe(true);
      const size = getSvgViewBoxSize(
        createBarCodeSvg({ type: type as 'qrcode' | 'gs1datamatrix', input }),
      );
      expect(size?.width, `${type}:${input.length}`).toBe(size?.height);
    }
    expect(isSquareBarcodeType('pdf417')).toBe(false);
  });

  test('only locked plugins expose getAspectRatio, and their defaults already match it', () => {
    const locked = new Set<string>(ASPECT_RATIO_LOCKED_BARCODE_TYPES);
    for (const type of BARCODE_TYPES) {
      const plugin = barcodes[type];
      if (!locked.has(type)) {
        expect(plugin.getAspectRatio, type).toBeUndefined();
        continue;
      }
      const { defaultSchema } = plugin.propPanel;
      const ratio = plugin.getAspectRatio?.(defaultSchema);
      expect(ratio, type).toBeDefined();
      expect(defaultSchema.width / defaultSchema.height, type).toBeCloseTo(ratio!, 2);
    }
  });

  test('no barcode exposes a fit option', () => {
    const i18n = (key: string) => key;
    for (const type of BARCODE_TYPES) {
      const panel = barcodes[type].propPanel;
      const schemaFn = panel.schema;
      if (typeof schemaFn !== 'function') throw new Error(`${type} schema is not a function`);
      expect(schemaFn({ i18n } as Parameters<typeof schemaFn>[0]), type).not.toHaveProperty('fit');
      expect(panel.defaultSchema, type).not.toHaveProperty('fit');
    }
  });
});
