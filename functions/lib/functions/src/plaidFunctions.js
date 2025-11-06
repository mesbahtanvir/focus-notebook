"use strict";
/**
 * Cloud Functions for Plaid Integration
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
exports.triggerSync = exports.markRelinking = exports.createRelinkToken = exports.exchangePublicToken = exports.createLinkToken = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const plaidService_1 = require("./services/plaidService");
const encryption_1 = require("./utils/encryption");
const db = admin.firestore();
// ============================================================================
// Create Link Token (New Connection)
// ============================================================================
exports.createLinkToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = context.auth.uid;
    const { platform = 'web', redirectUri } = data;
    try {
        // Get user email
        const userRecord = await admin.auth().getUser(uid);
        const userEmail = userRecord.email;
        const result = await (0, plaidService_1.createLinkToken)({
            userId: uid,
            userEmail,
            platform,
            redirectUri,
        });
        return {
            link_token: result.link_token,
            expires_at: result.expiration,
        };
    }
    catch (error) {
        console.error('Error creating link token:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ============================================================================
// Exchange Public Token (Complete New Connection)
// ============================================================================
exports.exchangePublicToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = context.auth.uid;
    const { public_token } = data;
    if (!public_token) {
        throw new functions.https.HttpsError('invalid-argument', 'public_token is required');
    }
    try {
        // Exchange public token for access token
        const { accessToken, itemId } = await (0, plaidService_1.exchangePublicToken)(public_token);
        // Encrypt access token
        const kmsRef = (0, encryption_1.encrypt)(accessToken);
        // Get item info to retrieve institution_id
        const item = await (0, plaidService_1.getItem)(accessToken);
        const institutionId = item.institutionId || 'unknown';
        // Get institution details
        let institutionName = 'Unknown Institution';
        if (institutionId !== 'unknown') {
            try {
                const institutionInfo = await (0, plaidService_1.getInstitutionById)(institutionId);
                institutionName = institutionInfo.name;
            }
            catch (error) {
                console.warn('Could not fetch institution name:', error);
            }
        }
        // Get accounts
        const accounts = await (0, plaidService_1.getAccounts)(accessToken);
        // Create item document
        const itemRef = db.collection('plaidItems').doc(itemId);
        await itemRef.set({
            uid,
            institutionId,
            institutionName,
            status: 'ok',
            kmsRef,
            lastSyncAt: Date.now(),
            createdAt: Date.now(),
        });
        // Store accounts
        const accountDocs = [];
        for (const account of accounts) {
            const accountRef = db.collection('accounts').doc(account.account_id);
            const accountData = {
                uid,
                itemId,
                type: account.type,
                subtype: account.subtype || null,
                name: account.name,
                mask: account.mask || null,
                balances: {
                    current: account.balances.current || 0,
                    available: account.balances.available || null,
                    isoCurrency: account.balances.iso_currency_code || 'USD',
                    limit: account.balances.limit || null,
                },
                officialName: account.official_name || null,
                updatedAt: Date.now(),
            };
            await accountRef.set(accountData);
            accountDocs.push(Object.assign({ id: account.account_id }, accountData));
        }
        // Trigger initial sync (async)
        await triggerTransactionSync(itemId, accessToken, uid);
        return {
            itemId,
            institutionId,
            institutionName,
            accounts: accountDocs,
        };
    }
    catch (error) {
        console.error('Error exchanging public token:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ============================================================================
// Create Relink Token (Update Mode)
// ============================================================================
exports.createRelinkToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = context.auth.uid;
    const { itemId, platform = 'web' } = data;
    if (!itemId) {
        throw new functions.https.HttpsError('invalid-argument', 'itemId is required');
    }
    try {
        // Get item and verify ownership
        const itemDoc = await db.collection('plaidItems').doc(itemId).get();
        if (!itemDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Item not found');
        }
        const item = itemDoc.data();
        if ((item === null || item === void 0 ? void 0 : item.uid) !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized');
        }
        // Get access token
        const accessToken = await (0, plaidService_1.getAccessToken)(itemId);
        // Get user email
        const userRecord = await admin.auth().getUser(uid);
        // Create link token in update mode
        const result = await (0, plaidService_1.createLinkToken)({
            userId: uid,
            userEmail: userRecord.email,
            platform,
            accessToken, // This triggers update mode
        });
        return {
            link_token: result.link_token,
            expires_at: result.expiration,
        };
    }
    catch (error) {
        console.error('Error creating relink token:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ============================================================================
// Mark Item as Relinking Complete
// ============================================================================
exports.markRelinking = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = context.auth.uid;
    const { itemId } = data;
    if (!itemId) {
        throw new functions.https.HttpsError('invalid-argument', 'itemId is required');
    }
    try {
        // Verify ownership
        const itemDoc = await db.collection('plaidItems').doc(itemId).get();
        if (!itemDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Item not found');
        }
        const item = itemDoc.data();
        if ((item === null || item === void 0 ? void 0 : item.uid) !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized');
        }
        // Update status to ok
        await (0, plaidService_1.updateItemStatus)(itemId, 'ok');
        // Trigger sync
        const accessToken = await (0, plaidService_1.getAccessToken)(itemId);
        await triggerTransactionSync(itemId, accessToken, uid);
        return { ok: true };
    }
    catch (error) {
        console.error('Error marking relinking:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ============================================================================
// Manual Sync Trigger
// ============================================================================
exports.triggerSync = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = context.auth.uid;
    const { itemId } = data;
    if (!itemId) {
        throw new functions.https.HttpsError('invalid-argument', 'itemId is required');
    }
    try {
        // Verify ownership
        const itemDoc = await db.collection('plaidItems').doc(itemId).get();
        if (!itemDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Item not found');
        }
        const item = itemDoc.data();
        if ((item === null || item === void 0 ? void 0 : item.uid) !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized');
        }
        // Get access token and sync
        const accessToken = await (0, plaidService_1.getAccessToken)(itemId);
        const syncResult = await triggerTransactionSync(itemId, accessToken, uid, item === null || item === void 0 ? void 0 : item.cursor);
        return {
            ok: true,
            added: syncResult.added,
            modified: syncResult.modified,
            removed: syncResult.removed,
        };
    }
    catch (error) {
        console.error('Error triggering sync:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ============================================================================
// Transaction Sync Helper
// ============================================================================
async function triggerTransactionSync(itemId, accessToken, uid, cursor) {
    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;
    let hasMore = true;
    let currentCursor = cursor;
    let batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;
    while (hasMore) {
        const result = await (0, plaidService_1.syncTransactions)(accessToken, currentCursor);
        // Process added transactions
        for (const txn of result.added) {
            const txnRef = db.collection('transactions').doc(txn.transaction_id);
            batch.set(txnRef, {
                uid,
                itemId,
                accountId: txn.account_id,
                plaidTransactionId: txn.transaction_id,
                postedAt: txn.date,
                authorizedAt: txn.authorized_date || null,
                pending: txn.pending || false,
                amount: txn.amount,
                isoCurrency: txn.iso_currency_code || 'USD',
                merchant: {
                    name: txn.merchant_name || txn.name,
                    normalized: normalizeMerchantName(txn.merchant_name || txn.name),
                },
                originalDescription: txn.name,
                category_base: txn.category || ['Other'],
                category_premium: null,
                confidence: 0.8,
                isSubscription: false,
                recurringStreamId: null,
                ingestedAt: Date.now(),
                updatedAt: Date.now(),
                source: 'plaid',
            }, { merge: true });
            batchCount++;
            totalAdded++;
            // Commit batch if full
            if (batchCount >= MAX_BATCH_SIZE) {
                await batch.commit();
                batch = db.batch(); // Create new batch after commit
                batchCount = 0;
            }
        }
        // Process modified transactions
        for (const txn of result.modified) {
            const txnRef = db.collection('transactions').doc(txn.transaction_id);
            batch.update(txnRef, {
                pending: txn.pending || false,
                amount: txn.amount,
                updatedAt: Date.now(),
            });
            batchCount++;
            totalModified++;
            if (batchCount >= MAX_BATCH_SIZE) {
                await batch.commit();
                batch = db.batch(); // Create new batch after commit
                batchCount = 0;
            }
        }
        // Process removed transactions
        for (const removed of result.removed) {
            const txnRef = db.collection('transactions').doc(removed.transaction_id);
            batch.delete(txnRef);
            batchCount++;
            totalRemoved++;
            if (batchCount >= MAX_BATCH_SIZE) {
                await batch.commit();
                batch = db.batch(); // Create new batch after commit
                batchCount = 0;
            }
        }
        currentCursor = result.nextCursor;
        hasMore = result.hasMore;
    }
    // Commit remaining batch
    if (batchCount > 0) {
        await batch.commit();
    }
    // Update item with new cursor and lastSyncAt
    await db.collection('plaidItems').doc(itemId).update({
        cursor: currentCursor,
        lastSyncAt: Date.now(),
        updatedAt: Date.now(),
    });
    return {
        added: totalAdded,
        modified: totalModified,
        removed: totalRemoved,
    };
}
// ============================================================================
// Merchant Name Normalization
// ============================================================================
const MERCHANT_PATTERNS = {
    'AMZN': 'Amazon',
    'AMAZON': 'Amazon',
    'STARBUCKS': 'Starbucks',
    'SBX': 'Starbucks',
    'UBER': 'Uber',
    'NETFLIX': 'Netflix',
    'SPOTIFY': 'Spotify',
    'WALMART': 'Walmart',
    'TARGET': 'Target',
    'APPLE.COM': 'Apple',
    'GOOGLE': 'Google',
    'PAYPAL': 'PayPal',
    'VENMO': 'Venmo',
};
function normalizeMerchantName(name) {
    const upper = name.toUpperCase();
    for (const [pattern, normalized] of Object.entries(MERCHANT_PATTERNS)) {
        if (upper.includes(pattern)) {
            return normalized;
        }
    }
    // Clean up common patterns
    return name
        .replace(/^\d{4}\s*-?\s*/g, '') // Remove date prefixes
        .replace(/\s+#\d+/g, '') // Remove store numbers
        .replace(/\*+/g, '') // Remove asterisks
        .trim();
}
//# sourceMappingURL=plaidFunctions.js.map