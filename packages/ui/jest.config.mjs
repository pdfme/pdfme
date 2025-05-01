export default {
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['jest-canvas-mock'],
  setupFilesAfterEnv: ['./jest.setup.mjs', './__tests__/test-helpers.mjs'],
  moduleNameMapper: {
    '\\.(png|css)$': '<rootDir>/__mocks__/assetsTransformer.mjs',
    '^@pdfme/common$': '<rootDir>/../common/src/index.ts',
    '^@pdfme/converter$': '<rootDir>/../converter/src/index.node.ts',
    '^@pdfme/schemas$': '<rootDir>/../schemas/src/index.ts',
    '^@pdfme/schemas/utils$': '<rootDir>/../schemas/src/utils.ts',
    '^antd/es/': 'antd/lib/',
    '^form-render/es/': 'form-render/lib/',
    '^rc-picker/es/': 'rc-picker/lib/',
    '^lodash-es$': 'lodash',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.mjs',
    '^../../src/hooks$': '<rootDir>/src/hooks/index.mock.mjs',
    '^pdfjs-dist$': '<rootDir>/__mocks__/pdfjs-dist.mjs',
    '^pdfjs-dist/build/pdf.worker.entry$': '<rootDir>/__mocks__/pdfjs-dist.mjs',
    '^pdfjs-dist/build/pdf.worker.mjs$': '<rootDir>/__mocks__/pdfjs-dist.mjs',
    '^pdfjs-dist/legacy/build/pdf.worker.mjs$': '<rootDir>/__mocks__/pdfjs-dist.mjs',
    '^pdfjs-dist/legacy/build/pdf.mjs$': '<rootDir>/__mocks__/pdfjs-dist.mjs',
    '^pdfjs-dist/build/pdf.mjs$': '<rootDir>/__mocks__/pdfjs-dist.mjs'
  },
  moduleDirectories: ['node_modules'],
  resolver: 'ts-jest-resolver',
  moduleFileExtensions: ['js', 'ts', 'tsx', 'mjs'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true
    }]
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transformIgnorePatterns: ['/node_modules/(?!(lucide-react|@pdfme)/)']
};
