export default {
  transform: {
    '^.+\\.ts?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.esm.json'
    }]
  },
  moduleNameMapper: {
    '^@pdfme/common$': '<rootDir>/../common/src/index.ts',
    '^@pdfme/schemas$': '<rootDir>/../schemas/src/index.ts',
    '^@pdfme/schemas/utils$': '<rootDir>/../schemas/src/utils.ts',
    '^.+\\\\.(css|less|scss)$': 'identity-obj-proxy',
    '^./__tests__/utils$': '<rootDir>/__tests__/utils.mjs',
    '^./__tests__/assets/templates$': '<rootDir>/__tests__/assets/templates/index.mjs',
    '^@pdfme/converter$': '<rootDir>/../converter/src/index.node.ts',
    '^\\./(.*)\.js$': '<rootDir>/src/$1.ts'
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  transformIgnorePatterns: [
    '/node_modules/(?!(lucide|@pdfme)/)'
  ],
  moduleDirectories: ['node_modules']
};
