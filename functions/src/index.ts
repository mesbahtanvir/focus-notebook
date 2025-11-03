/**
 * Firebase Cloud Functions for Focus Notebook AI Processing
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Import cloud functions
import {
  processNewThought,
  manualProcessThought,
  reprocessThought,
  revertThoughtProcessing,
  processThoughtQueueWorker,
} from './processThought';
import { refreshTrackedTickerPrices, updateTrackedTickers } from './marketData';
import { cleanupExpiredAnonymousUsers } from './cleanupAnonymous';
import { createDailyPortfolioSnapshots } from './portfolioSnapshots';
import {
  createStripeCheckoutSession,
  createStripePortalSession,
  stripeWebhook,
  syncStripeSubscription,
} from './stripeBilling';

// Export cloud functions
export {
  processNewThought,
  manualProcessThought,
  reprocessThought,
  revertThoughtProcessing,
  processThoughtQueueWorker,
  updateTrackedTickers,
  refreshTrackedTickerPrices,
  cleanupExpiredAnonymousUsers,
  createDailyPortfolioSnapshots,
  createStripeCheckoutSession,
  createStripePortalSession,
  stripeWebhook,
  syncStripeSubscription,
};
