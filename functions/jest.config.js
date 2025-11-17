module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
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
    // Exclude additional untested features (tests to be added later)
    '!src/spendingMaintenance.ts',
    '!src/visaDataUpdater.ts',
    '!src/utils/aiPromptLogger.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 65,
      lines: 70,
      statements: 70,
    },
  },
};
