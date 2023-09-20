import { createBarCode, barCodeType2Bcid, mapHexColorForBwipJsLib } from '../src/barcode';
import jsQR, { QRCode } from 'jsqr';
import { PNG } from 'pngjs';

/**
 * 生成したQRコード（png）画像から入力データが正常に読み取れるかをテスト
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

  const upcaCode = '416000336108';

  describe('generate qrcode with default colours', () => {
    for (const t of tests) {
      // eslint-disable-next-line no-loop-func
      test(`${t[0]}: ${t[1]}`, async () => {
        const buffer = (await createBarCode({
          type: 'qrcode',
          input: t[1],
          width: 10, // mm
          height: 10, // mm
          backgroundcolor: '00000000', // 背景色を指定しないとjsQRでうまく解析できない
        })) as Buffer;
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
        const buffer = (await createBarCode({
          type: 'qrcode',
          input: t[1],
          width: 10, // mm
          height: 10, // mm
          backgroundcolor: 'ffffff',
          barcolor: 'f50505',
        })) as Buffer;
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
});


