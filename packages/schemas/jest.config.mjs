export default {
  transform: {
    '^.+\\.ts?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.esm.json'
    }]
  },
  moduleNameMapper: {
    '^@pdfme/common$': '<rootDir>/../common/src/index.ts',
    '^../src/(.*)\.js$': '<rootDir>/src/$1.ts',
    '^\\.\\./common/src/(.*)\.js$': '<rootDir>/../common/src/$1.ts',
    '^\\./(.*)\.js$': '<rootDir>/src/$1.ts',
    '^src/(.*)\.js$': '<rootDir>/src/$1.ts',
    '^src/barcodes/(.*)\.js$': '<rootDir>/src/barcodes/$1.ts',
    '^react-is$': '<rootDir>/../../node_modules/react-is/index.js'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lucide|@pdfme)/)/',
    '/node_modules/react-is/'
  ],
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  moduleDirectories: ['node_modules']
};
