export default {
  transform: {
    '^.+\\.ts?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.esm.json'
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/(?:src|__tests__)/.*)\\.js$': '$1.ts',
    '^@pdfme/common$': '<rootDir>/../common/src/index.ts',
    '^@pdfme/converter$': '<rootDir>/../converter/src/index.node.ts',
    '^../converter/src/index.node.ts$': '<rootDir>/../converter/src/index.node.ts',
    '^\\./pdf2img.js$': '<rootDir>/../converter/src/pdf2img.ts',
    '^\\./pdf2size.js$': '<rootDir>/../converter/src/pdf2size.ts'
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  moduleDirectories: ['node_modules'],
  transformIgnorePatterns: [
    '/node_modules/(?!(lucide|@pdfme)/)'
  ]
};
