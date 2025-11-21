module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': '<rootDir>/jest.transform.js',
  },
  moduleNameMapper: {
    '^firebase-functions/v1$': '<rootDir>/src/__mocks__/firebase-functions-v1.ts',
    '^stripe$': '<rootDir>/src/__mocks__/stripe.ts',
    '^openai$': '<rootDir>/src/__mocks__/openai.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/index.ts',
    '!src/processThought.ts',
    // Exclude Unified Spending Tool (MVP - tests to be added later)
    '!src/plaidFunctions.ts',
    '!src/plaidWebhooks.ts',
    '!src/services/**',
    '!src/stripeBilling.ts',
    '!src/utils/encryption.ts',
    '!src/types/spending-tool.ts',
    // Exclude files without test coverage (to be added later)
    '!src/packingList.ts',
    '!src/photoThumbnails.ts',
    '!src/photoVotes.ts',
    '!src/spendingMaintenance.ts',
    '!src/visaDataUpdater.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
