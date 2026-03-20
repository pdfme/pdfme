import { TextDecoder, TextEncoder } from 'node:util';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

Object.assign(globalThis, { TextDecoder, TextEncoder });
(globalThis as typeof globalThis & { jest: typeof vi }).jest = vi;

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = ((value: unknown) =>
    JSON.parse(JSON.stringify(value))) as typeof structuredClone;
}

await import('jest-canvas-mock');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
