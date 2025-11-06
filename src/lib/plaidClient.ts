/**
 * Plaid Client Configuration
 *
 * Handles Plaid API client initialization and configuration
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

/**
 * Get Plaid environment from env variable
 */
function getPlaidEnvironment(): string {
  const env = process.env.PLAID_ENV || 'sandbox';

  switch (env) {
    case 'production':
      return PlaidEnvironments.production;
    case 'development':
      return PlaidEnvironments.development;
    case 'sandbox':
    default:
      return PlaidEnvironments.sandbox;
  }
}

/**
 * Get Plaid secret based on environment
 */
function getPlaidSecret(): string {
  const env = process.env.PLAID_ENV || 'sandbox';

  switch (env) {
    case 'production':
      return process.env.PLAID_SECRET_PRODUCTION || '';
    case 'development':
      return process.env.PLAID_SECRET_DEVELOPMENT || '';
    case 'sandbox':
    default:
      return process.env.PLAID_SECRET_SANDBOX || '';
  }
}

/**
 * Create and configure Plaid client
 */
export function createPlaidClient(): PlaidApi {
  const configuration = new Configuration({
    basePath: getPlaidEnvironment(),
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
        'PLAID-SECRET': getPlaidSecret(),
      },
    },
  });

  return new PlaidApi(configuration);
}

/**
 * Check if Plaid is configured
 */
export function isPlaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && getPlaidSecret());
}

/**
 * Get Plaid environment name
 */
export function getPlaidEnv(): 'sandbox' | 'development' | 'production' {
  const env = process.env.PLAID_ENV || 'sandbox';
  return env as 'sandbox' | 'development' | 'production';
}
