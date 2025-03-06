// Jest setup file for React 18 compatibility
// This helps ensure we're using the correct version of React in tests

// Mock requestAnimationFrame for React 18
global.requestAnimationFrame = function(callback) {
  setTimeout(callback, 0);
};

// Mock matchMedia for components that might use it
global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() {},
  };
};

// Suppress React 18 console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    /Warning: ReactDOM.render is no longer supported in React 18/.test(args[0]) ||
    /Warning: The current testing environment is not configured to support act/.test(args[0]) ||
    /Warning: You seem to have overlapping act/.test(args[0]) ||
    /Warning: An update to .* inside a test was not wrapped in act/.test(args[0]) ||
    /Warning: Can't perform a React state update on a component that hasn't mounted yet/.test(args[0]) ||
    /Warning: The current testing environment is not configured to support act/.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
};
