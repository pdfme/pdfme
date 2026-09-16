import type { Lang } from '@pdfme/common';
import { getDict } from '../src/i18n';

const supportedLangs: Lang[] = [
  'en',
  'zh',
  'zh-TW',
  'ja',
  'ko',
  'ar',
  'th',
  'pl',
  'it',
  'de',
  'es',
  'fr',
];

describe('i18n dictionaries', () => {
  test.each(supportedLangs)('provides a complete dictionary for %s', (lang) => {
    const dict = getDict(lang);
    expect(Object.keys(dict).length).toBeGreaterThan(0);
    expect(dict.cancel).toEqual(expect.any(String));
    expect(dict.close).toEqual(expect.any(String));
    expect(dict['schemas.list.outdentItem']).toEqual(expect.any(String));
  });

  test('uses Traditional Chinese glyphs for zh-TW', () => {
    const zhTW = getDict('zh-TW');
    const zh = getDict('zh');

    expect(zhTW.close).toBe('關閉');
    expect(zhTW.fieldName).toBe('名稱');
    expect(zhTW['schemas.text.overflowVisible']).toBe('可見');
    expect(zhTW.close).not.toBe(zh.close);
    expect(zhTW.fieldName).not.toBe(zh.fieldName);
  });
});
