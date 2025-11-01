/**
 * Thought Processing Cloud Functions
 *
 * Four triggers:
 * 1. processNewThought - Auto-trigger on thought creation
 * 2. manualProcessThought - Manual "Process Now" button
 * 3. reprocessThought - "Reprocess" button with optional revert
 * 4. revertThoughtProcessing - "Revert AI Changes" button
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { CONFIG } from './config';
import { getProcessingContext } from './utils/contextGatherer';
import { callOpenAI } from './utils/openaiClient';
import { processActions, buildThoughtUpdate } from './utils/actionProcessor';

const ANONYMOUS_SESSION_COLLECTION = 'anonymousSessions';
const ANONYMOUS_AI_OVERRIDE_KEY = process.env.ANONYMOUS_AI_OVERRIDE_KEY || functions.config()?.ci?.anonymous_key;

// ===== TRIGGER 1: Auto-process on new thought creation =====

export const processNewThought = functions.firestore
  .document('users/{userId}/thoughts/{thoughtId}')
  .onCreate(async (snap, context) => {
    const thought = snap.data();
    const { userId, thoughtId } = context.params;

    // Skip if already processed or processing
    if (thought.aiProcessingStatus || thought.tags?.includes('processed')) {
      console.log(`Skipping ${thoughtId}: already processed`);
      return;
    }

    // Check rate limit
    const today = new Date().toISOString().split('T')[0];
    const countRef = admin.firestore()
      .collection(`users/${userId}/dailyProcessingCount`)
      .doc(today);

    const countSnap = await countRef.get();
    const currentCount = countSnap.data()?.count || 0;

    if (currentCount >= CONFIG.RATE_LIMITS.MAX_PROCESSING_PER_DAY_PER_USER) {
      console.log(`Rate limit reached for user ${userId} (${currentCount}/${CONFIG.RATE_LIMITS.MAX_PROCESSING_PER_DAY_PER_USER})`);
      return;
    }

    if (!(await isAiAllowedForUser(userId))) {
      console.log(`Skipping auto-processing for anonymous user ${userId}`);
      return;
    }

    // Process the thought
    await processThoughtInternal(userId, thoughtId, 'auto');

    // Increment counter
    await countRef.set({ count: currentCount + 1 }, { merge: true });
  });

// ===== TRIGGER 2: Manual "Process Now" button =====

export const manualProcessThought = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { thoughtId } = data;
  const userId = context.auth.uid;

  if (!thoughtId) {
    throw new functions.https.HttpsError('invalid-argument', 'thoughtId is required');
  }

  await processThoughtInternal(userId, thoughtId, 'manual');

  return { success: true, message: 'Thought processed successfully' };
});

// ===== TRIGGER 3: Reprocess button =====

export const reprocessThought = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { thoughtId, revertFirst } = data;
  const userId = context.auth.uid;

  if (!thoughtId) {
    throw new functions.https.HttpsError('invalid-argument', 'thoughtId is required');
  }

  const thoughtRef = admin.firestore().doc(`users/${userId}/thoughts/${thoughtId}`);
  const thoughtSnap = await thoughtRef.get();

  if (!thoughtSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Thought not found');
  }

  const thought = thoughtSnap.data();

  // Check reprocess limit
  if ((thought?.reprocessCount || 0) >= CONFIG.RATE_LIMITS.MAX_REPROCESS_COUNT) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Maximum reprocess limit reached (${CONFIG.RATE_LIMITS.MAX_REPROCESS_COUNT})`
    );
  }

  // Revert first if requested
  if (revertFirst && thought?.aiAppliedChanges) {
    await revertThoughtInternal(userId, thoughtId);
  }

  // Process the thought
  await processThoughtInternal(userId, thoughtId, 'reprocess');

  return { success: true, message: 'Thought reprocessed successfully' };
});

// ===== TRIGGER 4: Revert AI changes =====

export const revertThoughtProcessing = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { thoughtId } = data;
  const userId = context.auth.uid;

  if (!thoughtId) {
    throw new functions.https.HttpsError('invalid-argument', 'thoughtId is required');
  }

  await revertThoughtInternal(userId, thoughtId);

  return { success: true, message: 'AI changes reverted successfully' };
});

// ===== CORE PROCESSING LOGIC =====

async function processThoughtInternal(
  userId: string,
  thoughtId: string,
  trigger: 'auto' | 'manual' | 'reprocess'
) {
  const thoughtRef = admin.firestore().doc(`users/${userId}/thoughts/${thoughtId}`);
  const thoughtSnap = await thoughtRef.get();

  if (!thoughtSnap.exists) {
    throw new Error('Thought not found');
  }

  const thought = thoughtSnap.data();

  if (!thought) {
    throw new Error('Thought data is null');
  }

  const aiAllowed = await isAiAllowedForUser(userId);
  if (!aiAllowed) {
    await thoughtRef.update({
      aiProcessingStatus: 'blocked',
      aiError: 'Anonymous sessions cannot run AI processing',
    });
    console.log(`AI processing blocked for anonymous user ${userId}`);
    return;
  }

  // Mark as processing
  await thoughtRef.update({
    aiProcessingStatus: 'processing',
  });

  try {
    // Get user context
    console.log(`Gathering context for user ${userId}`);
    const context = await getProcessingContext(userId);

    // Call OpenAI
    console.log(`Processing thought ${thoughtId} with OpenAI`);
    const result = await callOpenAI(thought.text, context);

    // Process actions
    const processedActions = processActions(result.actions, thought);

    // Build update object
    const { update, historyEntry } = buildThoughtUpdate(
      processedActions,
      thought,
      result.usage?.total_tokens || 0,
      trigger
    );

    // Add to processing history
    const processingHistory = thought.processingHistory || [];
    processingHistory.push(historyEntry);
    update.processingHistory = processingHistory;

    // Increment reprocess count if this is a reprocess
    if (trigger === 'reprocess') {
      update.reprocessCount = (thought.reprocessCount || 0) + 1;
    }

    // Update thought
    await thoughtRef.update(update);

    console.log(`Successfully processed thought ${thoughtId}: ${historyEntry.changesApplied} changes, ${historyEntry.suggestionsCount} suggestions`);

  } catch (error) {
    console.error(`Processing failed for thought ${thoughtId}:`, error);

    // Mark as failed
    await thoughtRef.update({
      aiProcessingStatus: 'failed',
      aiError: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

async function isAiAllowedForUser(userId: string): Promise<boolean> {
  const userRecord = await admin.auth().getUser(userId);
  const isAnonymous = userRecord.providerData.length === 0;

  if (!isAnonymous) {
    return true;
  }

  const sessionRef = admin.firestore().collection(ANONYMOUS_SESSION_COLLECTION).doc(userId);
  const sessionSnap = await sessionRef.get();
  const sessionData = sessionSnap.data();

  const expiresAtMillis = sessionData?.expiresAt?.toMillis?.();
  const cleanupPending = sessionData?.cleanupPending === true;
  const overrideKeyMatch = ANONYMOUS_AI_OVERRIDE_KEY && sessionData?.ciOverrideKey === ANONYMOUS_AI_OVERRIDE_KEY;
  const allowAi = sessionData?.allowAi === true || overrideKeyMatch;

  if (!sessionSnap.exists || !allowAi || cleanupPending) {
    await sessionRef.set(
      {
        cleanupPending: true,
        status: 'blocked',
        updatedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );
    return false;
  }

  if (typeof expiresAtMillis === 'number' && expiresAtMillis <= Date.now()) {
    await sessionRef.set(
      {
        cleanupPending: true,
        status: 'expired',
        expiredAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );
    return false;
  }

  return true;
}

// ===== REVERT LOGIC =====

async function revertThoughtInternal(userId: string, thoughtId: string) {
  const thoughtRef = admin.firestore().doc(`users/${userId}/thoughts/${thoughtId}`);
  const thoughtSnap = await thoughtRef.get();

  if (!thoughtSnap.exists) {
    throw new Error('Thought not found');
  }

  const thought = thoughtSnap.data();

  if (!thought?.aiAppliedChanges) {
    throw new Error('No AI changes to revert');
  }

  const { originalText, originalTags, aiAppliedChanges, processingHistory } = thought;

  // Build revert update
  const update: any = {
    text: originalText || thought.text,
    tags: originalTags || [],
    aiProcessingStatus: null,
    aiAppliedChanges: null,
    aiSuggestions: null,
    aiError: null,
    originalText: null,
    originalTags: null,
  };

  // Add revert entry to processing history
  const historyWithRevert = processingHistory || [];
  historyWithRevert.push({
    processedAt: new Date().toISOString(),
    trigger: 'revert',
    status: 'completed',
    revertedChanges: aiAppliedChanges,
  } as any);
  update.processingHistory = historyWithRevert;

  // Update thought
  await thoughtRef.update(update);

  console.log(`Successfully reverted AI changes for thought ${thoughtId}`);
}
