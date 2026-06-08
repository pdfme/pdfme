import { TextDecoder, TextEncoder } from 'node:util';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

if (typeof globalThis.TextDecoder === 'undefined' || typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextDecoder, TextEncoder });
}

// jsdom does not provide ResizeObserver. Polyfill with a no-op implementation so
// that libraries like @dnd-kit and Ant Design that require it don't crash.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const createCanvasContext2D = () => {
  const noop = vi.fn();

  return {
    canvas: undefined,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    beginPath: noop,
    clearRect: noop,
    fill: noop,
    fillRect: noop,
    fillText: noop,
    lineTo: noop,
    moveTo: noop,
    rect: noop,
    restore: noop,
    rotate: noop,
    save: noop,
    scale: noop,
    stroke: noop,
    translate: noop,
    measureText: (text: string) => ({ width: text.length * 6 }),
  };
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(() => createCanvasContext2D()),
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
