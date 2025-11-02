export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/background/rule-engine.js',
    'src/storage/schema.js',
    'src/pages/settings/settings-data.js',
    '!src/**/*.test.js',
    '!src/background/service-worker.js', // Too many Chrome API dependencies
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
