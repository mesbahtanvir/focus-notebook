"use strict";
/**
 * Plaid Webhook Handler
 * Handles webhooks from Plaid for transaction updates and item errors
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
exports.plaidWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const plaidService_1 = require("./services/plaidService");
const db = admin.firestore();
// ============================================================================
// Plaid Webhook Handler
// ============================================================================
exports.plaidWebhook = functions.https.onRequest(async (req, res) => {
    // Verify webhook signature (TODO: implement in production)
    // const signature = req.headers['plaid-verification'];
    const payload = req.body;
    const webhookType = payload.webhook_type;
    const webhookCode = payload.webhook_code;
    const itemId = payload.item_id;
    console.log('Received Plaid webhook:', {
        type: webhookType,
        code: webhookCode,
        itemId,
    });
    try {
        switch (webhookType) {
            case 'TRANSACTIONS':
                await handleTransactionWebhook(webhookCode, itemId, payload);
                break;
            case 'ITEM':
                await handleItemWebhook(webhookCode, itemId, payload);
                break;
            default:
                console.log('Unhandled webhook type:', webhookType);
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// Transaction Webhook Handler
// ============================================================================
async function handleTransactionWebhook(code, itemId, payload) {
    console.log('Handling transaction webhook:', code);
    switch (code) {
        case 'SYNC_UPDATES_AVAILABLE':
        case 'DEFAULT_UPDATE':
        case 'HISTORICAL_UPDATE':
            // Mark item as ok and trigger sync
            await (0, plaidService_1.updateItemStatus)(itemId, 'ok');
            // Get item to retrieve uid and access token
            const itemDoc = await db.collection('plaidItems').doc(itemId).get();
            if (!itemDoc.exists) {
                console.error('Item not found:', itemId);
                return;
            }
            const item = itemDoc.data();
            if (!item) {
                console.error('Item data is null:', itemId);
                return;
            }
            const uid = item.uid;
            // Trigger sync asynchronously
            try {
                const accessToken = await (0, plaidService_1.getAccessToken)(itemId);
                await syncTransactionsForItem(itemId, accessToken, uid, item.cursor);
                console.log('Transaction sync completed for item:', itemId);
            }
            catch (error) {
                console.error('Error syncing transactions:', error);
            }
            break;
        case 'TRANSACTIONS_REMOVED':
            // Handle removed transactions
            const removedTransactions = payload.removed_transactions || [];
            for (const txnId of removedTransactions) {
                await db.collection('transactions').doc(txnId).delete();
            }
            console.log(`Removed ${removedTransactions.length} transactions`);
            break;
        default:
            console.log('Unhandled transaction webhook code:', code);
    }
}
// ============================================================================
// Item Webhook Handler
// ============================================================================
async function handleItemWebhook(code, itemId, payload) {
    console.log('Handling item webhook:', code);
    switch (code) {
        case 'ERROR':
            // Extract error details
            const error = payload.error;
            if (!error) {
                console.error('Error webhook missing error details');
                return;
            }
            const errorCode = error.error_code;
            const errorType = error.error_type;
            const errorMessage = error.error_message;
            console.log('Item error:', {
                itemId,
                errorCode,
                errorType,
                errorMessage,
            });
            // Map error to status
            const status = (0, plaidService_1.mapPlaidErrorToStatus)(errorCode);
            const itemError = (0, plaidService_1.createItemError)(errorType, errorCode, errorMessage);
            // Update item status
            await (0, plaidService_1.updateItemStatus)(itemId, status, itemError);
            break;
        case 'PENDING_EXPIRATION':
            // Item will expire soon, prompt user to relink
            await (0, plaidService_1.updateItemStatus)(itemId, 'pending_expiration');
            console.log('Item pending expiration:', itemId);
            break;
        case 'USER_PERMISSION_REVOKED':
            // User revoked permission, mark as needs_relink
            await (0, plaidService_1.updateItemStatus)(itemId, 'needs_relink', {
                code: 'USER_PERMISSION_REVOKED',
                message: 'User revoked access permission',
                at: Date.now(),
            });
            console.log('User revoked permission for item:', itemId);
            break;
        case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
            // Webhook configuration was updated
            console.log('Webhook update acknowledged for item:', itemId);
            break;
        default:
            console.log('Unhandled item webhook code:', code);
    }
}
// ============================================================================
// Transaction Sync Helper (duplicated from plaidFunctions.ts)
// ============================================================================
const plaidService_2 = require("./services/plaidService");
async function syncTransactionsForItem(itemId, accessToken, uid, cursor) {
    let hasMore = true;
    let currentCursor = cursor;
    let batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;
    while (hasMore) {
        const result = await (0, plaidService_2.syncTransactions)(accessToken, currentCursor);
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
}
function normalizeMerchantName(name) {
    const MERCHANT_PATTERNS = {
        'AMZN': 'Amazon',
        'AMAZON': 'Amazon',
        'STARBUCKS': 'Starbucks',
        'UBER': 'Uber',
        'NETFLIX': 'Netflix',
        'SPOTIFY': 'Spotify',
        'WALMART': 'Walmart',
        'TARGET': 'Target',
    };
    const upper = name.toUpperCase();
    for (const [pattern, normalized] of Object.entries(MERCHANT_PATTERNS)) {
        if (upper.includes(pattern)) {
            return normalized;
        }
    }
    return name
        .replace(/^\d{4}\s*-?\s*/g, '')
        .replace(/\s+#\d+/g, '')
        .replace(/\*+/g, '')
        .trim();
}
//# sourceMappingURL=plaidWebhooks.js.map