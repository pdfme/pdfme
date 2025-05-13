import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder and TextDecoder to global
Object.assign(global, { TextDecoder, TextEncoder });

// Polyfill structuredClone if not available
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Fix for ESM compatibility
global.exports = {};
global.require = () => ({});
global.module = { exports: {} };

export default {};
