module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { useESM: true },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@pdfme/common$': '<rootDir>/../common/src/index.ts',
    '^@pdfme/schemas$': '<rootDir>/../schemas/src/index.ts',
    '^@pdfme/generator$': '<rootDir>/../generator/src/index.ts',
    '^@pdfme/converter$': '<rootDir>/../converter/src/index.ts',
    '^@pdfme/manipulator$': '<rootDir>/../manipulator/src/index.ts',
    '^@pdfme/pdf-lib$': '@pdfme/pdf-lib',
    '^@pdfme/schemas/utils$': '<rootDir>/../schemas/src/utils',
    '^@pdfme/(.*)$': '<rootDir>/../$1/src',
    '^.+\\.(css|less|scss)$': 'identity-obj-proxy',
    '^pdfjs-dist$': '<rootDir>/__mocks__/pdfjs-dist.js',
  },
  transformIgnorePatterns: ['/node_modules/(?!@pdfme|lucide-react)/'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '../common/__tests__/test-helpers.js',
  ],
}; 