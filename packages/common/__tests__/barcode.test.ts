import { barCodeType2Bcid, mapHexColorForBwipJsLib } from '../src/barcode';

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
