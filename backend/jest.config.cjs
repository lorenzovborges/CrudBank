module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageThreshold: {
    global: {
      lines: 90,
      branches: 90,
      statements: 90,
      functions: 90,
    },
  },
  testTimeout: 120000,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
};
