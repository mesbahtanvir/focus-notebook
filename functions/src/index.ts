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
  getStripeInvoices,
  getStripePaymentMethod,
  reactivateStripeSubscription,
  getUsageStats,
} from './stripeBilling';
import {
  createLinkToken,
  exchangePublicToken,
  createRelinkToken,
  markRelinking,
  triggerSync,
} from './plaidFunctions';
import { plaidWebhook } from './plaidWebhooks';
import { processCSVTransactions } from './processCSVTransactions';
import { onCSVUpload, processCsvBatchQueue } from './csvStorageTrigger';
import { deleteCSVStatement } from './deleteCSVStatement';
import { onDexaScanUpload } from './dexaScanStorageTrigger';
import {
  processTransactionTripLinks,
  linkTransactionToTrip,
  dismissTransactionTripSuggestion,
} from './tripLinking';
import { deleteAllTransactions } from './spendingMaintenance';
import {
  updateVisaDataWeekly,
  updateVisaDataManual,
  getVisaRequirements,
} from './visaDataUpdater';
import { generatePhotoThumbnail, getSignedImageUrl } from './photoThumbnails';
import { runPlaceInsights } from './placeInsights';
import { submitPhotoVote, getNextPhotoPair, mergePhotos } from './photoVotes';
import {
  createPackingList,
  updatePackingList,
  togglePackedItem,
  setPackingItemStatus,
  addCustomPackingItem,
  deleteCustomPackingItem,
} from './packingList';

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
  getStripeInvoices,
  getStripePaymentMethod,
  reactivateStripeSubscription,
  getUsageStats,
  // Plaid Functions
  createLinkToken,
  exchangePublicToken,
  createRelinkToken,
  markRelinking,
  triggerSync,
  plaidWebhook,
  // CSV Processing
  processCSVTransactions,
  onCSVUpload,
  processCsvBatchQueue,
  deleteCSVStatement,
  // Dexa Scan Processing
  onDexaScanUpload,
  // Trip tagging
  processTransactionTripLinks,
  linkTransactionToTrip,
  dismissTransactionTripSuggestion,
  deleteAllTransactions,
  // Visa Data
  updateVisaDataWeekly,
  updateVisaDataManual,
  getVisaRequirements,
  // Photos
  generatePhotoThumbnail,
  getSignedImageUrl,
  submitPhotoVote,
  getNextPhotoPair,
  mergePhotos,
  // Places
  runPlaceInsights,
  // Packing Lists
  createPackingList,
  updatePackingList,
  togglePackedItem,
  setPackingItemStatus,
  addCustomPackingItem,
  deleteCustomPackingItem,
};
