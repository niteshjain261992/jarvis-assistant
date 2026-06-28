/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // Source files use mandatory .js extensions (NodeNext); map them back to TS.
  // The @/ alias must come first so it wins over the generic relative mapping.
  moduleNameMapper: {
    '^@/(.*)\\.js$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    // Transpile-only to CJS for the test runtime; type-checking of tests is
    // covered by the editor (tests/tsconfig.json) and lint.
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'ES2022',
          esModuleInterop: true,
          isolatedModules: true,
          skipLibCheck: true,
        },
        diagnostics: false,
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
