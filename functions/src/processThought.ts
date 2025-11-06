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
import { resolveToolSpecIds } from '../../shared/toolSpecUtils';
import { getToolSpecById, type ToolSpec } from '../../shared/toolSpecs';
import {
  evaluateAiEntitlement,
  type SubscriptionSnapshot,
  type AiEntitlement,
  type AiEntitlementCode,
  SUBSCRIPTION_STATUS_COLLECTION,
  SUBSCRIPTION_STATUS_DOC_ID,
} from '../../shared/subscription';
import { incrementUsageStats } from './stripeBilling';

const ANONYMOUS_SESSION_COLLECTION = 'anonymousSessions';
const ANONYMOUS_AI_OVERRIDE_KEY = process.env.ANONYMOUS_AI_OVERRIDE_KEY || '';
const PROCESSING_QUEUE_SUBCOLLECTION = 'processingQueue';
const PROCESSING_USAGE_DOC = 'processingUsage/meta';
const MIN_PROCESSING_INTERVAL_MS = 10_000;
const SUBSCRIPTION_CACHE_TTL_MS = 60_000;

const subscriptionCache = new Map<
  string,
  { expiresAt: number; snapshot: SubscriptionSnapshot | null }
>();

type ProcessingTrigger = 'auto' | 'manual' | 'reprocess';

interface ThoughtProcessingJob {
  thoughtId: string;
  trigger: ProcessingTrigger;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'rate_limited';
  requestedAt?: FirebaseFirestore.Timestamp;
  requestedBy?: string;
  toolSpecIds?: string[];
  attempts?: number;
  error?: string;
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

type EnqueueStatus = 'queued' | 'alreadyQueued';

type AiAccessReason = 'ok' | 'anonymous_blocked' | 'subscription_blocked';

interface AiAccessResult {
  allowed: boolean;
  reason: AiAccessReason;
  message?: string;
  entitlement?: AiEntitlement;
}

function getSubscriptionBlockMessage(code: AiEntitlementCode): string {
  switch (code) {
    case 'inactive':
      return 'Your Focus Notebook Pro subscription is inactive. Update billing to resume AI processing.';
    case 'disabled':
      return 'AI processing is disabled for your account. Contact support if this is unexpected.';
    case 'exhausted':
      return 'You have used all available AI processing credits. Add more credits or wait for the next cycle.';
    case 'tier-mismatch':
    case 'no-record':
    default:
      return 'Focus Notebook Pro is required to process thoughts with AI.';
  }
}

function normalizeSubscriptionSnapshot(
  data: FirebaseFirestore.DocumentData,
  id: string
): SubscriptionSnapshot {
  return {
    id,
    tier: (data.tier as SubscriptionSnapshot['tier']) ?? null,
    status: (data.status as SubscriptionSnapshot['status']) ?? null,
    entitlements: data.entitlements ? { ...data.entitlements } : null,
    currentPeriodEnd: data.currentPeriodEnd ?? null,
    cancelAtPeriodEnd:
      typeof data.cancelAtPeriodEnd === 'boolean' ? data.cancelAtPeriodEnd : null,
    updatedAt: data.updatedAt ?? null,
    trialEndsAt: data.trialEndsAt ?? null,
  };
}

async function getSubscriptionSnapshot(userId: string): Promise<SubscriptionSnapshot | null> {
  const cached = subscriptionCache.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.snapshot;
  }

  const ref = admin
    .firestore()
    .doc(`users/${userId}/${SUBSCRIPTION_STATUS_COLLECTION}/${SUBSCRIPTION_STATUS_DOC_ID}`);
  const snap = await ref.get();

  if (!snap.exists) {
    subscriptionCache.set(userId, { snapshot: null, expiresAt: now + SUBSCRIPTION_CACHE_TTL_MS });
    return null;
  }

  const snapshot = normalizeSubscriptionSnapshot(snap.data() || {}, snap.id);
  subscriptionCache.set(userId, { snapshot, expiresAt: now + SUBSCRIPTION_CACHE_TTL_MS });
  return snapshot;
}

async function enqueueProcessingJob(
  userId: string,
  thoughtId: string,
  trigger: ProcessingTrigger,
  options: {
    toolSpecIds?: string[];
    requestedBy?: string;
    allowProcessed?: boolean;
  } = {}
): Promise<{ jobId: string; status: EnqueueStatus }> {
  const access = await isAiAllowedForUser(userId);
  if (!access.allowed) {
    const message =
      access.message || 'Focus Notebook Pro is required to process thoughts with AI.';
    throw new functions.https.HttpsError('permission-denied', message);
  }

  const thoughtRef = admin.firestore().doc(`users/${userId}/thoughts/${thoughtId}`);
  const thoughtSnap = await thoughtRef.get();

  if (!thoughtSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Thought not found');
  }

  const thought = thoughtSnap.data();

  if (!options.allowProcessed && thought?.tags?.includes?.('processed')) {
    throw new functions.https.HttpsError('failed-precondition', 'Thought already processed');
  }

  const queueRef = admin
    .firestore()
    .collection(`users/${userId}/${PROCESSING_QUEUE_SUBCOLLECTION}`);

  if (thought?.aiProcessingStatus === 'pending' || thought?.aiProcessingStatus === 'processing') {
    const existingJob = await queueRef
      .where('thoughtId', '==', thoughtId)
      .where('status', 'in', ['queued', 'processing'])
      .limit(1)
      .get();

    if (!existingJob.empty) {
      return { jobId: existingJob.docs[0].id, status: 'alreadyQueued' };
    }

    return { jobId: '', status: 'alreadyQueued' };
  }

  const existing = await queueRef
    .where('thoughtId', '==', thoughtId)
    .where('status', 'in', ['queued', 'processing'])
    .limit(1)
    .get();

  if (!existing.empty) {
    return { jobId: existing.docs[0].id, status: 'alreadyQueued' };
  }

  const enrolledToolIds = await getUserEnrolledToolIds(userId);

  if (enrolledToolIds.length === 0) {
    throw new functions.https.HttpsError('failed-precondition', 'No tool enrollments found for user.');
  }

  const specIds =
    options.toolSpecIds && options.toolSpecIds.length > 0
      ? options.toolSpecIds.filter((id) => enrolledToolIds.includes(id))
      : resolveToolSpecIds(thought, { enrolledToolIds });

  if (!specIds || specIds.length === 0) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'No enrolled tools available for this thought.'
    );
  }

  const normalizedSpecIds = Array.from(new Set(specIds)).filter((id) => enrolledToolIds.includes(id));

  if (normalizedSpecIds.length === 0) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'No enrolled tools available after filtering.'
    );
  }

  const jobRef = queueRef.doc();
  const jobData: Partial<ThoughtProcessingJob> = {
    thoughtId,
    trigger,
    status: 'queued',
    requestedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    requestedBy: options.requestedBy || userId,
    toolSpecIds: normalizedSpecIds,
    attempts: 0,
  };

  await Promise.all([
    jobRef.set(jobData),
    thoughtRef.update({
      aiProcessingStatus: 'pending',
      aiError: null,
    }),
  ]);

  return { jobId: jobRef.id, status: 'queued' };
}

async function getUserEnrolledToolIds(userId: string): Promise<string[]> {
  const snapshot = await admin
    .firestore()
    .collection(`users/${userId}/toolEnrollments`)
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs
    .filter((doc) => {
      const status = (doc.data().status || 'active') as string;
      return status !== 'inactive';
    })
    .map((doc) => doc.id);
}

async function logLLMInteraction(params: {
  userId: string;
  thoughtId: string;
  trigger: ProcessingTrigger;
  prompt: string;
  rawResponse: string;
  actions: any[];
  toolSpecIds: string[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: string;
}) {
  const { userId, thoughtId, trigger, prompt, rawResponse, actions, toolSpecIds, usage, error } = params;
  const logRef = admin
    .firestore()
    .collection(`users/${userId}/llmLogs`)
    .doc();

  await logRef.set({
    thoughtId,
    trigger,
    prompt,
    rawResponse,
    actions,
    toolSpecIds,
    usage: usage || null,
    error: error || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function ensureIntervalLimit(userId: string): Promise<void> {
  const usageRef = admin.firestore().doc(`users/${userId}/${PROCESSING_USAGE_DOC}`);
  await admin.firestore().runTransaction(async (tx) => {
    const now = admin.firestore.Timestamp.now();
    const usageSnap = await tx.get(usageRef);
    const data = usageSnap.data();
    const lastProcessedAt = data?.lastProcessedAt as FirebaseFirestore.Timestamp | undefined;

    if (lastProcessedAt && now.toMillis() - lastProcessedAt.toMillis() < MIN_PROCESSING_INTERVAL_MS) {
      throw new RateLimitError('Please wait a few seconds before processing another thought.');
    }

    tx.set(
      usageRef,
      {
        lastProcessedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  });
}

async function ensureDailyLimit(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const countRef = admin
    .firestore()
    .collection(`users/${userId}/dailyProcessingCount`)
    .doc(today);

  const countSnap = await countRef.get();
  const currentCount = countSnap.data()?.count || 0;

  if (currentCount >= CONFIG.RATE_LIMITS.MAX_PROCESSING_PER_DAY_PER_USER) {
    throw new RateLimitError(
      `Daily processing limit reached (${CONFIG.RATE_LIMITS.MAX_PROCESSING_PER_DAY_PER_USER}).`
    );
  }
}

async function incrementDailyProcessing(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const countRef = admin
    .firestore()
    .collection(`users/${userId}/dailyProcessingCount`)
    .doc(today);

  await countRef.set(
    {
      count: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function updateThoughtStatus(
  userId: string,
  thoughtId: string,
  status: 'pending' | 'processing' | 'failed' | 'blocked',
  error?: string
) {
  const thoughtRef = admin.firestore().doc(`users/${userId}/thoughts/${thoughtId}`);
  const payload: Record<string, any> = {
    aiProcessingStatus: status,
  };
  if (error) {
    payload.aiError = error;
  } else {
    payload.aiError = null;
  }
  await thoughtRef.update(payload);
}

function loadToolSpecs(thought: FirebaseFirestore.DocumentData | undefined, toolSpecIds?: string[]): ToolSpec[] {
  const ids =
    toolSpecIds && toolSpecIds.length > 0
      ? toolSpecIds
      : resolveToolSpecIds(thought as any);

  return ids
    .filter((id): id is string => Boolean(id))
    .map((id) => {
      try {
        return getToolSpecById(id as any);
      } catch {
        return null;
      }
    })
    .filter((spec): spec is ToolSpec => Boolean(spec))
    .filter((spec, index, self) => self.findIndex((s) => s.id === spec.id) === index);
}

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

    const aiAccess = await isAiAllowedForUser(userId);
    if (!aiAccess.allowed) {
      console.log(
        `Skipping auto-processing for user ${userId}: ${aiAccess.message || 'AI access blocked'}`
      );
      return;
    }

    try {
      await ensureDailyLimit(userId);
      await ensureIntervalLimit(userId);
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.log(`Auto-processing rate limited for user ${userId}: ${error.message}`);
        return;
      }
      throw error;
    }

    try {
      const { status } = await enqueueProcessingJob(userId, thoughtId, 'auto', {
        toolSpecIds: resolveToolSpecIds(thought),
        requestedBy: userId,
      });
      console.log(`Enqueued auto processing job for ${thoughtId}: ${status}`);
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        console.warn(
          `Auto-processing enqueue skipped for thought ${thoughtId}:`,
          error.message
        );
        return;
      }
      console.error('Failed to enqueue auto processing job:', error);
    }
  });

// ===== TRIGGER 2: Manual "Process Now" button =====

export const manualProcessThought = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { thoughtId, toolSpecIds } = data as {
    thoughtId?: string;
    toolSpecIds?: string[];
  };
  const userId = context.auth.uid;

  if (!thoughtId) {
    throw new functions.https.HttpsError('invalid-argument', 'thoughtId is required');
  }

  try {
    await ensureDailyLimit(userId);
    await ensureIntervalLimit(userId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new functions.https.HttpsError('resource-exhausted', error.message);
    }
    throw error;
  }

  const { jobId, status } = await enqueueProcessingJob(userId, thoughtId, 'manual', {
    toolSpecIds,
    requestedBy: userId,
  });

  return {
    success: true,
    jobId,
    queued: status === 'queued',
    message:
      status === 'queued'
        ? 'Thought queued for processing'
        : 'Thought already queued for processing',
  };
});

// ===== TRIGGER 3: Reprocess button =====

export const reprocessThought = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { thoughtId, revertFirst, toolSpecIds } = data as {
    thoughtId?: string;
    revertFirst?: boolean;
    toolSpecIds?: string[];
  };
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

  try {
    await ensureDailyLimit(userId);
    await ensureIntervalLimit(userId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new functions.https.HttpsError('resource-exhausted', error.message);
    }
    throw error;
  }

  const { jobId, status } = await enqueueProcessingJob(userId, thoughtId, 'reprocess', {
    toolSpecIds,
    requestedBy: userId,
    allowProcessed: true,
  });

  return {
    success: true,
    jobId,
    queued: status === 'queued',
    message:
      status === 'queued'
        ? 'Thought reprocess queued successfully'
        : 'Thought already queued for reprocessing',
  };
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

export const processThoughtQueueWorker = functions.firestore
  .document(`users/{userId}/${PROCESSING_QUEUE_SUBCOLLECTION}/{jobId}`)
  .onCreate(async (snap, context) => {
    const { userId, jobId } = context.params as { userId: string; jobId: string };
    const job = snap.data() as ThoughtProcessingJob;
    const jobRef = snap.ref;

    if (!job.thoughtId) {
      console.warn(`Queue job ${jobId} missing thoughtId`);
      await jobRef.update({
        status: 'failed',
        error: 'Missing thoughtId',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    try {
      await ensureDailyLimit(userId);
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(`Job ${jobId} rate limited: ${error.message}`);
        await Promise.all([
          jobRef.update({
            status: 'rate_limited',
            error: error.message,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
          updateThoughtStatus(userId, job.thoughtId, 'failed', error.message),
        ]);
        return;
      }
      throw error;
    }

    const aiAccess = await isAiAllowedForUser(userId);
    if (!aiAccess.allowed) {
      const message =
        aiAccess.message || 'AI processing is not available for this account.';
      await Promise.all([
        jobRef.update({
          status: 'failed',
          error: message,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
        updateThoughtStatus(userId, job.thoughtId, 'blocked', message),
      ]);
      console.warn(`Job ${jobId} blocked for user ${userId}: ${message}`);
      return;
    }

    await jobRef.update({
      status: 'processing',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: admin.firestore.FieldValue.increment(1),
    });

    try {
      await processThoughtInternal(userId, job.thoughtId, job.trigger, job.toolSpecIds);
      await incrementDailyProcessing(userId);
      await jobRef.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Processing job ${jobId} failed:`, error);
      await Promise.all([
        jobRef.update({
          status: 'failed',
          error: message,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
        updateThoughtStatus(userId, job.thoughtId, 'failed', message),
      ]);
    }
  });

// ===== CORE PROCESSING LOGIC =====

async function processThoughtInternal(
  userId: string,
  thoughtId: string,
  trigger: 'auto' | 'manual' | 'reprocess',
  toolSpecIds?: string[]
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

  const aiAccess = await isAiAllowedForUser(userId);
  if (!aiAccess.allowed) {
    const errorMessage =
      aiAccess.message || 'AI processing is not available for this account.';
    await thoughtRef.update({
      aiProcessingStatus: 'blocked',
      aiError: errorMessage,
    });
    console.log(`AI processing blocked for user ${userId}: ${errorMessage}`);
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
    const toolSpecs = loadToolSpecs(thought, toolSpecIds);
    console.log(
      `Processing thought ${thoughtId} with tool specs: ${toolSpecs.map((spec) => spec.id).join(', ')}`
    );

    // Call OpenAI
    console.log(`Processing thought ${thoughtId} with OpenAI`);
    const result = await callOpenAI(thought.text, context, toolSpecs);

    try {
      await logLLMInteraction({
        userId,
        thoughtId,
        trigger,
        prompt: result.prompt,
        rawResponse: result.rawResponse,
        actions: result.actions,
        toolSpecIds: toolSpecs.map((spec) => spec.id),
        usage: result.usage,
      });
    } catch (logError) {
      console.warn('Failed to log LLM interaction:', logError);
    }

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

    // Track usage stats (fire and forget - don't block on this)
    incrementUsageStats(userId).catch((err) => {
      console.error('Failed to track usage stats:', err);
    });

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

async function isAiAllowedForUser(userId: string): Promise<AiAccessResult> {
  const userRecord = await admin.auth().getUser(userId);
  const isAnonymous = userRecord.providerData.length === 0;

  if (!isAnonymous) {
    const subscriptionSnapshot = await getSubscriptionSnapshot(userId);
    const entitlement = evaluateAiEntitlement(subscriptionSnapshot);

    if (!entitlement.allowed) {
      return {
        allowed: false,
        reason: 'subscription_blocked',
        message: getSubscriptionBlockMessage(entitlement.code),
        entitlement,
      };
    }

    return { allowed: true, reason: 'ok', entitlement };
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
    return {
      allowed: false,
      reason: 'anonymous_blocked',
      message: 'Anonymous sessions cannot run AI processing',
    };
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
    return {
      allowed: false,
      reason: 'anonymous_blocked',
      message: 'Anonymous sessions cannot run AI processing',
    };
  }

  return { allowed: true, reason: 'ok' };
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
