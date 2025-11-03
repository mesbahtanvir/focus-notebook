"use strict";
/**
 * Thought Processing Cloud Functions
 *
 * Four triggers:
 * 1. processNewThought - Auto-trigger on thought creation
 * 2. manualProcessThought - Manual "Process Now" button
 * 3. reprocessThought - "Reprocess" button with optional revert
 * 4. revertThoughtProcessing - "Revert AI Changes" button
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.processThoughtQueueWorker = exports.revertThoughtProcessing = exports.reprocessThought = exports.manualProcessThought = exports.processNewThought = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const contextGatherer_1 = require("./utils/contextGatherer");
const openaiClient_1 = require("./utils/openaiClient");
const actionProcessor_1 = require("./utils/actionProcessor");
const toolSpecUtils_1 = require("../../shared/toolSpecUtils");
const toolSpecs_1 = require("../../shared/toolSpecs");
const subscription_1 = require("../../shared/subscription");
const ANONYMOUS_SESSION_COLLECTION = 'anonymousSessions';
const ANONYMOUS_AI_OVERRIDE_KEY = process.env.ANONYMOUS_AI_OVERRIDE_KEY || ((_b = (_a = functions.config()) === null || _a === void 0 ? void 0 : _a.ci) === null || _b === void 0 ? void 0 : _b.anonymous_key);
const PROCESSING_QUEUE_SUBCOLLECTION = 'processingQueue';
const PROCESSING_USAGE_DOC = 'processingUsage/meta';
const MIN_PROCESSING_INTERVAL_MS = 10000;
const SUBSCRIPTION_CACHE_TTL_MS = 60000;
const subscriptionCache = new Map();
class RateLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RateLimitError';
    }
}
function getSubscriptionBlockMessage(code) {
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
function normalizeSubscriptionSnapshot(data, id) {
    var _a, _b, _c, _d, _e;
    return {
        id,
        tier: (_a = data.tier) !== null && _a !== void 0 ? _a : null,
        status: (_b = data.status) !== null && _b !== void 0 ? _b : null,
        entitlements: data.entitlements ? Object.assign({}, data.entitlements) : null,
        currentPeriodEnd: (_c = data.currentPeriodEnd) !== null && _c !== void 0 ? _c : null,
        cancelAtPeriodEnd: typeof data.cancelAtPeriodEnd === 'boolean' ? data.cancelAtPeriodEnd : null,
        updatedAt: (_d = data.updatedAt) !== null && _d !== void 0 ? _d : null,
        trialEndsAt: (_e = data.trialEndsAt) !== null && _e !== void 0 ? _e : null,
    };
}
async function getSubscriptionSnapshot(userId) {
    const cached = subscriptionCache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        return cached.snapshot;
    }
    const ref = admin
        .firestore()
        .doc(`users/${userId}/${subscription_1.SUBSCRIPTION_STATUS_COLLECTION}/${subscription_1.SUBSCRIPTION_STATUS_DOC_ID}`);
    const snap = await ref.get();
    if (!snap.exists) {
        subscriptionCache.set(userId, { snapshot: null, expiresAt: now + SUBSCRIPTION_CACHE_TTL_MS });
        return null;
    }
    const snapshot = normalizeSubscriptionSnapshot(snap.data() || {}, snap.id);
    subscriptionCache.set(userId, { snapshot, expiresAt: now + SUBSCRIPTION_CACHE_TTL_MS });
    return snapshot;
}
async function enqueueProcessingJob(userId, thoughtId, trigger, options = {}) {
    var _a, _b;
    const access = await isAiAllowedForUser(userId);
    if (!access.allowed) {
        const message = access.message || 'Focus Notebook Pro is required to process thoughts with AI.';
        throw new functions.https.HttpsError('permission-denied', message);
    }
    const thoughtRef = admin.firestore().doc(`users/${userId}/thoughts/${thoughtId}`);
    const thoughtSnap = await thoughtRef.get();
    if (!thoughtSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Thought not found');
    }
    const thought = thoughtSnap.data();
    if (!options.allowProcessed && ((_b = (_a = thought === null || thought === void 0 ? void 0 : thought.tags) === null || _a === void 0 ? void 0 : _a.includes) === null || _b === void 0 ? void 0 : _b.call(_a, 'processed'))) {
        throw new functions.https.HttpsError('failed-precondition', 'Thought already processed');
    }
    const queueRef = admin
        .firestore()
        .collection(`users/${userId}/${PROCESSING_QUEUE_SUBCOLLECTION}`);
    if ((thought === null || thought === void 0 ? void 0 : thought.aiProcessingStatus) === 'pending' || (thought === null || thought === void 0 ? void 0 : thought.aiProcessingStatus) === 'processing') {
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
    const specIds = options.toolSpecIds && options.toolSpecIds.length > 0
        ? options.toolSpecIds.filter((id) => enrolledToolIds.includes(id))
        : (0, toolSpecUtils_1.resolveToolSpecIds)(thought, { enrolledToolIds });
    if (!specIds || specIds.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'No enrolled tools available for this thought.');
    }
    const normalizedSpecIds = Array.from(new Set(specIds)).filter((id) => enrolledToolIds.includes(id));
    if (normalizedSpecIds.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'No enrolled tools available after filtering.');
    }
    const jobRef = queueRef.doc();
    const jobData = {
        thoughtId,
        trigger,
        status: 'queued',
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
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
async function getUserEnrolledToolIds(userId) {
    const snapshot = await admin
        .firestore()
        .collection(`users/${userId}/toolEnrollments`)
        .get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs
        .filter((doc) => {
        const status = (doc.data().status || 'active');
        return status !== 'inactive';
    })
        .map((doc) => doc.id);
}
async function logLLMInteraction(params) {
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
async function ensureIntervalLimit(userId) {
    const usageRef = admin.firestore().doc(`users/${userId}/${PROCESSING_USAGE_DOC}`);
    await admin.firestore().runTransaction(async (tx) => {
        const now = admin.firestore.Timestamp.now();
        const usageSnap = await tx.get(usageRef);
        const data = usageSnap.data();
        const lastProcessedAt = data === null || data === void 0 ? void 0 : data.lastProcessedAt;
        if (lastProcessedAt && now.toMillis() - lastProcessedAt.toMillis() < MIN_PROCESSING_INTERVAL_MS) {
            throw new RateLimitError('Please wait a few seconds before processing another thought.');
        }
        tx.set(usageRef, {
            lastProcessedAt: now,
            updatedAt: now,
        }, { merge: true });
    });
}
async function ensureDailyLimit(userId) {
    var _a;
    const today = new Date().toISOString().split('T')[0];
    const countRef = admin
        .firestore()
        .collection(`users/${userId}/dailyProcessingCount`)
        .doc(today);
    const countSnap = await countRef.get();
    const currentCount = ((_a = countSnap.data()) === null || _a === void 0 ? void 0 : _a.count) || 0;
    if (currentCount >= config_1.CONFIG.RATE_LIMITS.MAX_PROCESSING_PER_DAY_PER_USER) {
        throw new RateLimitError(`Daily processing limit reached (${config_1.CONFIG.RATE_LIMITS.MAX_PROCESSING_PER_DAY_PER_USER}).`);
    }
}
async function incrementDailyProcessing(userId) {
    const today = new Date().toISOString().split('T')[0];
    const countRef = admin
        .firestore()
        .collection(`users/${userId}/dailyProcessingCount`)
        .doc(today);
    await countRef.set({
        count: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function updateThoughtStatus(userId, thoughtId, status, error) {
    const thoughtRef = admin.firestore().doc(`users/${userId}/thoughts/${thoughtId}`);
    const payload = {
        aiProcessingStatus: status,
    };
    if (error) {
        payload.aiError = error;
    }
    else {
        payload.aiError = null;
    }
    await thoughtRef.update(payload);
}
function loadToolSpecs(thought, toolSpecIds) {
    const ids = toolSpecIds && toolSpecIds.length > 0
        ? toolSpecIds
        : (0, toolSpecUtils_1.resolveToolSpecIds)(thought);
    return ids
        .filter((id) => Boolean(id))
        .map((id) => {
        try {
            return (0, toolSpecs_1.getToolSpecById)(id);
        }
        catch (_a) {
            return null;
        }
    })
        .filter((spec) => Boolean(spec))
        .filter((spec, index, self) => self.findIndex((s) => s.id === spec.id) === index);
}
// ===== TRIGGER 1: Auto-process on new thought creation =====
exports.processNewThought = functions.firestore
    .document('users/{userId}/thoughts/{thoughtId}')
    .onCreate(async (snap, context) => {
    var _a;
    const thought = snap.data();
    const { userId, thoughtId } = context.params;
    // Skip if already processed or processing
    if (thought.aiProcessingStatus || ((_a = thought.tags) === null || _a === void 0 ? void 0 : _a.includes('processed'))) {
        console.log(`Skipping ${thoughtId}: already processed`);
        return;
    }
    const aiAccess = await isAiAllowedForUser(userId);
    if (!aiAccess.allowed) {
        console.log(`Skipping auto-processing for user ${userId}: ${aiAccess.message || 'AI access blocked'}`);
        return;
    }
    try {
        await ensureDailyLimit(userId);
        await ensureIntervalLimit(userId);
    }
    catch (error) {
        if (error instanceof RateLimitError) {
            console.log(`Auto-processing rate limited for user ${userId}: ${error.message}`);
            return;
        }
        throw error;
    }
    try {
        const { status } = await enqueueProcessingJob(userId, thoughtId, 'auto', {
            toolSpecIds: (0, toolSpecUtils_1.resolveToolSpecIds)(thought),
            requestedBy: userId,
        });
        console.log(`Enqueued auto processing job for ${thoughtId}: ${status}`);
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            console.warn(`Auto-processing enqueue skipped for thought ${thoughtId}:`, error.message);
            return;
        }
        console.error('Failed to enqueue auto processing job:', error);
    }
});
// ===== TRIGGER 2: Manual "Process Now" button =====
exports.manualProcessThought = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { thoughtId, toolSpecIds } = data;
    const userId = context.auth.uid;
    if (!thoughtId) {
        throw new functions.https.HttpsError('invalid-argument', 'thoughtId is required');
    }
    try {
        await ensureDailyLimit(userId);
        await ensureIntervalLimit(userId);
    }
    catch (error) {
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
        message: status === 'queued'
            ? 'Thought queued for processing'
            : 'Thought already queued for processing',
    };
});
// ===== TRIGGER 3: Reprocess button =====
exports.reprocessThought = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { thoughtId, revertFirst, toolSpecIds } = data;
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
    if (((thought === null || thought === void 0 ? void 0 : thought.reprocessCount) || 0) >= config_1.CONFIG.RATE_LIMITS.MAX_REPROCESS_COUNT) {
        throw new functions.https.HttpsError('resource-exhausted', `Maximum reprocess limit reached (${config_1.CONFIG.RATE_LIMITS.MAX_REPROCESS_COUNT})`);
    }
    // Revert first if requested
    if (revertFirst && (thought === null || thought === void 0 ? void 0 : thought.aiAppliedChanges)) {
        await revertThoughtInternal(userId, thoughtId);
    }
    try {
        await ensureDailyLimit(userId);
        await ensureIntervalLimit(userId);
    }
    catch (error) {
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
        message: status === 'queued'
            ? 'Thought reprocess queued successfully'
            : 'Thought already queued for reprocessing',
    };
});
// ===== TRIGGER 4: Revert AI changes =====
exports.revertThoughtProcessing = functions.https.onCall(async (data, context) => {
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
exports.processThoughtQueueWorker = functions.firestore
    .document(`users/{userId}/${PROCESSING_QUEUE_SUBCOLLECTION}/{jobId}`)
    .onCreate(async (snap, context) => {
    const { userId, jobId } = context.params;
    const job = snap.data();
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
    }
    catch (error) {
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
        const message = aiAccess.message || 'AI processing is not available for this account.';
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
    }
    catch (error) {
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
async function processThoughtInternal(userId, thoughtId, trigger, toolSpecIds) {
    var _a;
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
        const errorMessage = aiAccess.message || 'AI processing is not available for this account.';
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
        const context = await (0, contextGatherer_1.getProcessingContext)(userId);
        const toolSpecs = loadToolSpecs(thought, toolSpecIds);
        console.log(`Processing thought ${thoughtId} with tool specs: ${toolSpecs.map((spec) => spec.id).join(', ')}`);
        // Call OpenAI
        console.log(`Processing thought ${thoughtId} with OpenAI`);
        const result = await (0, openaiClient_1.callOpenAI)(thought.text, context, toolSpecs);
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
        }
        catch (logError) {
            console.warn('Failed to log LLM interaction:', logError);
        }
        // Process actions
        const processedActions = (0, actionProcessor_1.processActions)(result.actions, thought);
        // Build update object
        const { update, historyEntry } = (0, actionProcessor_1.buildThoughtUpdate)(processedActions, thought, ((_a = result.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || 0, trigger);
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
    }
    catch (error) {
        console.error(`Processing failed for thought ${thoughtId}:`, error);
        // Mark as failed
        await thoughtRef.update({
            aiProcessingStatus: 'failed',
            aiError: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
}
async function isAiAllowedForUser(userId) {
    var _a, _b;
    const userRecord = await admin.auth().getUser(userId);
    const isAnonymous = userRecord.providerData.length === 0;
    if (!isAnonymous) {
        const subscriptionSnapshot = await getSubscriptionSnapshot(userId);
        const entitlement = (0, subscription_1.evaluateAiEntitlement)(subscriptionSnapshot);
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
    const expiresAtMillis = (_b = (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.expiresAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a);
    const cleanupPending = (sessionData === null || sessionData === void 0 ? void 0 : sessionData.cleanupPending) === true;
    const overrideKeyMatch = ANONYMOUS_AI_OVERRIDE_KEY && (sessionData === null || sessionData === void 0 ? void 0 : sessionData.ciOverrideKey) === ANONYMOUS_AI_OVERRIDE_KEY;
    const allowAi = (sessionData === null || sessionData === void 0 ? void 0 : sessionData.allowAi) === true || overrideKeyMatch;
    if (!sessionSnap.exists || !allowAi || cleanupPending) {
        await sessionRef.set({
            cleanupPending: true,
            status: 'blocked',
            updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
        return {
            allowed: false,
            reason: 'anonymous_blocked',
            message: 'Anonymous sessions cannot run AI processing',
        };
    }
    if (typeof expiresAtMillis === 'number' && expiresAtMillis <= Date.now()) {
        await sessionRef.set({
            cleanupPending: true,
            status: 'expired',
            expiredAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
        return {
            allowed: false,
            reason: 'anonymous_blocked',
            message: 'Anonymous sessions cannot run AI processing',
        };
    }
    return { allowed: true, reason: 'ok' };
}
// ===== REVERT LOGIC =====
async function revertThoughtInternal(userId, thoughtId) {
    const thoughtRef = admin.firestore().doc(`users/${userId}/thoughts/${thoughtId}`);
    const thoughtSnap = await thoughtRef.get();
    if (!thoughtSnap.exists) {
        throw new Error('Thought not found');
    }
    const thought = thoughtSnap.data();
    if (!(thought === null || thought === void 0 ? void 0 : thought.aiAppliedChanges)) {
        throw new Error('No AI changes to revert');
    }
    const { originalText, originalTags, aiAppliedChanges, processingHistory } = thought;
    // Build revert update
    const update = {
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
    });
    update.processingHistory = historyWithRevert;
    // Update thought
    await thoughtRef.update(update);
    console.log(`Successfully reverted AI changes for thought ${thoughtId}`);
}
//# sourceMappingURL=processThought.js.map