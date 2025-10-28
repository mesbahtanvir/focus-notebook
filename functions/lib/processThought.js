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
Object.defineProperty(exports, "__esModule", { value: true });
exports.revertThoughtProcessing = exports.reprocessThought = exports.manualProcessThought = exports.processNewThought = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const contextGatherer_1 = require("./utils/contextGatherer");
const openaiClient_1 = require("./utils/openaiClient");
const actionProcessor_1 = require("./utils/actionProcessor");
// ===== TRIGGER 1: Auto-process on new thought creation =====
exports.processNewThought = functions.firestore
    .document('users/{userId}/thoughts/{thoughtId}')
    .onCreate(async (snap, context) => {
    var _a, _b;
    const thought = snap.data();
    const { userId, thoughtId } = context.params;
    // Skip if already processed or processing
    if (thought.aiProcessingStatus || ((_a = thought.tags) === null || _a === void 0 ? void 0 : _a.includes('processed'))) {
        console.log(`Skipping ${thoughtId}: already processed`);
        return;
    }
    // Check rate limit
    const today = new Date().toISOString().split('T')[0];
    const countRef = admin.firestore()
        .collection(`users/${userId}/dailyProcessingCount`)
        .doc(today);
    const countSnap = await countRef.get();
    const currentCount = ((_b = countSnap.data()) === null || _b === void 0 ? void 0 : _b.count) || 0;
    if (currentCount >= config_1.CONFIG.RATE_LIMITS.MAX_PROCESSING_PER_DAY_PER_USER) {
        console.log(`Rate limit reached for user ${userId} (${currentCount}/${config_1.CONFIG.RATE_LIMITS.MAX_PROCESSING_PER_DAY_PER_USER})`);
        return;
    }
    // Process the thought
    await processThoughtInternal(userId, thoughtId, 'auto');
    // Increment counter
    await countRef.set({ count: currentCount + 1 }, { merge: true });
});
// ===== TRIGGER 2: Manual "Process Now" button =====
exports.manualProcessThought = functions.https.onCall(async (data, context) => {
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
exports.reprocessThought = functions.https.onCall(async (data, context) => {
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
    if (((thought === null || thought === void 0 ? void 0 : thought.reprocessCount) || 0) >= config_1.CONFIG.RATE_LIMITS.MAX_REPROCESS_COUNT) {
        throw new functions.https.HttpsError('resource-exhausted', `Maximum reprocess limit reached (${config_1.CONFIG.RATE_LIMITS.MAX_REPROCESS_COUNT})`);
    }
    // Revert first if requested
    if (revertFirst && (thought === null || thought === void 0 ? void 0 : thought.aiAppliedChanges)) {
        await revertThoughtInternal(userId, thoughtId);
    }
    // Process the thought
    await processThoughtInternal(userId, thoughtId, 'reprocess');
    return { success: true, message: 'Thought reprocessed successfully' };
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
// ===== CORE PROCESSING LOGIC =====
async function processThoughtInternal(userId, thoughtId, trigger) {
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
    // Mark as processing
    await thoughtRef.update({
        aiProcessingStatus: 'processing',
    });
    try {
        // Get user context
        console.log(`Gathering context for user ${userId}`);
        const context = await (0, contextGatherer_1.getProcessingContext)(userId);
        // Call OpenAI
        console.log(`Processing thought ${thoughtId} with OpenAI`);
        const result = await (0, openaiClient_1.callOpenAI)(thought.text, context);
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