import { describe, expect, it } from 'vitest';
import { schemaPlugins, schemaTypes } from '../src/schema-plugins.js';

describe('schema plugin discovery', () => {
  it('collects exported schema plugins by schema type', () => {
    expect(Object.keys(schemaPlugins)).toEqual(
      expect.arrayContaining([
        'text',
        'multiVariableText',
        'list',
        'image',
        'signature',
        'table',
        'qrcode',
        'ean13',
        'code128',
        'radioGroup',
        'checkbox',
        'circleMark',
      ]),
    );
  });

  it('does not leak export container names or aliases into known types', () => {
    expect(schemaTypes.has('barcodes')).toBe(false);
    expect(schemaTypes.has('builtInPlugins')).toBe(false);
    expect(schemaTypes.has('Text')).toBe(false);
    expect(schemaTypes.has('text')).toBe(true);
  });
});
