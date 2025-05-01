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
    '^@pdfme/generator$': '<rootDir>/../generator/src/index.ts',
    '^../src/index.node.js$': '<rootDir>/src/index.node.ts',
    '^./pdf2img.js$': '<rootDir>/src/pdf2img.ts',
    '^./pdf2size.js$': '<rootDir>/src/pdf2size.ts',
    '^\\./src/(.*)\.js$': '<rootDir>/src/$1.ts',
    '^\\./(.*)\.js$': '<rootDir>/src/$1.ts',
    '\\.js$': ['<rootDir>/../generator/src/$1.ts']
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs']
};
