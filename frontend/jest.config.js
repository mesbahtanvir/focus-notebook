const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',

  // Enable caching for faster test runs
  cache: true,
  cacheDirectory: '.jest-cache',

  // Optimize for CI/local environments
  maxWorkers: process.env.CI ? 2 : '50%',

  // Bail on first failure in CI for faster feedback
  bail: process.env.CI ? 1 : false,

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^\\.\\./\\.\\./shared/(.*)\\.js$': '<rootDir>/../shared/$1.ts',
    '^\\.\\./shared/(.*)\\.js$': '<rootDir>/../shared/$1.ts',
    '^shared/(.*)\\.js$': '<rootDir>/../shared/$1.ts',
  },
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/utils/builders/', // Ignore builder files (not tests)
    '<rootDir>/src/__tests__/utils/testHelpers', // Ignore test helpers (not tests)
    '<rootDir>/e2e/', // Ignore Playwright e2e tests (run separately with Playwright)
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(react-markdown|vfile|vfile-message|unist-util-stringify-position|unist-util-position|unist-util-generated|unist-util-is|unist-util-visit|unist-util-visit-parents|unist-util-find-all-after|unist-util-find-after|unist-util-find-before|unist-util-find-all-before|unist-util-remove-position|unist-util-is|unist-util-stringify-position|unist-util-position|unist-util-generated|bail|is-plain-obj|trough|vfile|vfile-message)/)',
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
