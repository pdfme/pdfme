export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.esm.json'
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@pdfme/(.*)$': '<rootDir>/../$1/src'
  },
  testEnvironment: 'node',
  testMatch: [
    '**/*.test.ts'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(air-datepicker)/)'
  ]
};
