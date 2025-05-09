export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      },
    ],
    '^.+\\.js$': '<rootDir>/jest-transformer/esm-transformer.js'
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@pdfme/(.*)$': '<rootDir>/packages/$1/src',
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/packages/common/jest.setup.js'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(air-datepicker)/)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/playground/e2e/'
  ]
};
