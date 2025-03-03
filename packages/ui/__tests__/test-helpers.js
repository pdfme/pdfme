const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, { TextDecoder, TextEncoder });

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock React for dependencies that might be using a different version
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    // Add any specific mocks needed for React 19 compatibility
  };
}, { virtual: true });

// Mock ReactDOM for dependencies that might be using a different version
jest.mock('react-dom', () => {
  const originalReactDOM = jest.requireActual('react-dom');
  return {
    ...originalReactDOM,
    // Add any specific mocks needed for React 19 compatibility
  };
}, { virtual: true });
