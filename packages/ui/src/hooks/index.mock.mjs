import { jest } from '@jest/globals';

// Export mocked hooks
export const useUIPreProcessor = jest.fn().mockImplementation(() => {
  return {
    backgrounds: ['data:image/png;base64,a...'],
    pageSizes: [{ height: 297, width: 210 }],
    scale: 1,
    error: null,
    refresh: () => Promise.resolve(),
  };
});
