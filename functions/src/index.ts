/**
 * Firebase Cloud Functions for Focus Notebook AI Processing
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Import cloud functions
import { processNewThought, manualProcessThought, reprocessThought, revertThoughtProcessing } from './processThought';
import { refreshTrackedTickerPrices, updateTrackedTickers } from './marketData';
import { cleanupExpiredAnonymousUsers } from './cleanupAnonymous';

// Export cloud functions
export {
  processNewThought,
  manualProcessThought,
  reprocessThought,
  revertThoughtProcessing,
  updateTrackedTickers,
  refreshTrackedTickerPrices,
  cleanupExpiredAnonymousUsers,
};
