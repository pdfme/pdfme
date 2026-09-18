import { Lang, UIOptions } from '../src/schema.js';

describe('Lang schema', () => {
  test('accepts Traditional Chinese', () => {
    expect(Lang.parse('zh-TW')).toBe('zh-TW');
    expect(UIOptions.parse({ lang: 'zh-TW' }).lang).toBe('zh-TW');
  });

  test('accepts Turkish', () => {
    expect(Lang.parse('tr')).toBe('tr');
    expect(UIOptions.parse({ lang: 'tr' }).lang).toBe('tr');
  });

  test('rejects unknown language codes', () => {
    expect(() => Lang.parse('zh-HK')).toThrow();
  });
});
