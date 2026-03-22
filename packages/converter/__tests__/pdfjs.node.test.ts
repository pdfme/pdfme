import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getPdfJsWasmUrl } from '../src/pdfjs.node.js';

describe('pdf.js node configuration', () => {
  test('resolves the wasm directory from pdfjs-dist', () => {
    const wasmUrl = getPdfJsWasmUrl();

    expect(existsSync(join(wasmUrl, 'jbig2.wasm'))).toBe(true);
    expect(existsSync(join(wasmUrl, 'openjpeg.wasm'))).toBe(true);
  });
});
