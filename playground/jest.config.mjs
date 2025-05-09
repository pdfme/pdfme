export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '@pdfme/converter': '<rootDir>/../packages/converter/dist/esm/index.node.js',
    '@pdfme/common': '<rootDir>/../packages/common/dist/esm/src/index.js',
    '@pdfme/generator': '<rootDir>/../packages/generator/dist/esm/src/index.js',
    '@pdfme/manipulator': '<rootDir>/../packages/manipulator/dist/esm/src/index.js',
    '@pdfme/schemas': '<rootDir>/../packages/schemas/dist/esm/src/index.js',
    '@pdfme/ui': '<rootDir>/../packages/ui/dist/esm/src/index.js'
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@pdfme|pdfjs-dist)/)'
  ],
  testMatch: ['**/*.test.ts'],
  // Add globals for Jest in ESM environment
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  // Ensure Node.js features are available in the test environment
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  }
};
