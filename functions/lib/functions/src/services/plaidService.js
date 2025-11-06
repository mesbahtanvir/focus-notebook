"use strict";
/**
 * Plaid Service - Handles all Plaid API interactions
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
exports.plaidClient = void 0;
exports.createLinkToken = createLinkToken;
exports.exchangePublicToken = exchangePublicToken;
exports.getInstitutionById = getInstitutionById;
exports.getAccounts = getAccounts;
exports.syncTransactions = syncTransactions;
exports.getAccessToken = getAccessToken;
exports.mapPlaidErrorToStatus = mapPlaidErrorToStatus;
exports.createItemError = createItemError;
exports.updateItemStatus = updateItemStatus;
const plaid_1 = require("plaid");
const admin = __importStar(require("firebase-admin"));
const encryption_1 = require("../utils/encryption");
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    console.warn('Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.');
}
const configuration = new plaid_1.Configuration({
    basePath: plaid_1.PlaidEnvironments[PLAID_ENV],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
            'PLAID-SECRET': PLAID_SECRET,
        },
    },
});
exports.plaidClient = new plaid_1.PlaidApi(configuration);
async function createLinkToken(options) {
    var _a;
    const { userId, platform = 'web', redirectUri, androidPackageName, accessToken, } = options;
    const request = {
        user: {
            client_user_id: userId,
        },
        client_name: 'Focus Notebook',
        products: [plaid_1.Products.Transactions],
        country_codes: [plaid_1.CountryCode.Us, plaid_1.CountryCode.Ca],
        language: 'en',
    };
    // Update mode (relink)
    if (accessToken) {
        request.access_token = accessToken;
    }
    // Platform-specific configuration
    if (platform === 'ios' || platform === 'android') {
        if (redirectUri) {
            request.redirect_uri = redirectUri;
        }
        if (platform === 'android' && androidPackageName) {
            request.android_package_name = androidPackageName;
        }
    }
    try {
        const response = await exports.plaidClient.linkTokenCreate(request);
        return {
            link_token: response.data.link_token,
            expiration: response.data.expiration,
        };
    }
    catch (error) {
        console.error('Error creating link token:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        throw new Error(`Failed to create link token: ${error.message}`);
    }
}
// ============================================================================
// Public Token Exchange
// ============================================================================
async function exchangePublicToken(publicToken) {
    var _a;
    try {
        const request = {
            public_token: publicToken,
        };
        const response = await exports.plaidClient.itemPublicTokenExchange(request);
        return {
            accessToken: response.data.access_token,
            itemId: response.data.item_id,
        };
    }
    catch (error) {
        console.error('Error exchanging public token:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        throw new Error(`Failed to exchange public token: ${error.message}`);
    }
}
// ============================================================================
// Get Institution Info
// ============================================================================
async function getInstitutionById(institutionId) {
    var _a;
    try {
        const response = await exports.plaidClient.institutionsGetById({
            institution_id: institutionId,
            country_codes: [plaid_1.CountryCode.Us, plaid_1.CountryCode.Ca],
        });
        const institution = response.data.institution;
        return {
            institutionId: institution.institution_id,
            name: institution.name,
            url: institution.url || undefined,
            logo: institution.logo || undefined,
            primaryColor: institution.primary_color || undefined,
        };
    }
    catch (error) {
        console.error('Error fetching institution:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        throw new Error(`Failed to fetch institution: ${error.message}`);
    }
}
// ============================================================================
// Get Accounts
// ============================================================================
async function getAccounts(accessToken) {
    var _a;
    try {
        const request = {
            access_token: accessToken,
        };
        const response = await exports.plaidClient.accountsGet(request);
        return response.data.accounts;
    }
    catch (error) {
        console.error('Error fetching accounts:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        throw new Error(`Failed to fetch accounts: ${error.message}`);
    }
}
// ============================================================================
// Transaction Sync
// ============================================================================
async function syncTransactions(accessToken, cursor) {
    var _a;
    try {
        const request = {
            access_token: accessToken,
            cursor: cursor || undefined,
        };
        const response = await exports.plaidClient.transactionsSync(request);
        return {
            added: response.data.added,
            modified: response.data.modified,
            removed: response.data.removed,
            nextCursor: response.data.next_cursor,
            hasMore: response.data.has_more,
        };
    }
    catch (error) {
        console.error('Error syncing transactions:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        throw new Error(`Failed to sync transactions: ${error.message}`);
    }
}
// ============================================================================
// Retrieve Access Token from Firestore
// ============================================================================
async function getAccessToken(itemId) {
    const itemDoc = await admin.firestore()
        .collection('plaidItems')
        .doc(itemId)
        .get();
    if (!itemDoc.exists) {
        throw new Error(`Item ${itemId} not found`);
    }
    const item = itemDoc.data();
    if (!(item === null || item === void 0 ? void 0 : item.kmsRef)) {
        throw new Error(`Item ${itemId} has no encrypted access token`);
    }
    return (0, encryption_1.decrypt)(item.kmsRef);
}
// ============================================================================
// Error Mapping (Plaid errors -> ItemStatus)
// ============================================================================
function mapPlaidErrorToStatus(errorCode) {
    // Login required or consent needed
    if (errorCode === 'ITEM_LOGIN_REQUIRED' ||
        errorCode === 'CONSENT_REQUIRED' ||
        errorCode === 'INVALID_CREDENTIALS') {
        return 'needs_relink';
    }
    // Institution down
    if (errorCode === 'INSTITUTION_DOWN' ||
        errorCode === 'INSTITUTION_NOT_RESPONDING') {
        return 'institution_down';
    }
    // Pending expiration
    if (errorCode === 'PENDING_EXPIRATION') {
        return 'pending_expiration';
    }
    // Default to error for unknown cases
    return 'error';
}
function createItemError(errorType, errorCode, errorMessage) {
    return {
        code: errorCode,
        message: errorMessage,
        at: Date.now(),
    };
}
// ============================================================================
// Update Item Status
// ============================================================================
async function updateItemStatus(itemId, status, error) {
    const updateData = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (error) {
        updateData.error = error;
    }
    else if (status === 'ok') {
        // Clear error when status is ok
        updateData.error = admin.firestore.FieldValue.delete();
    }
    await admin.firestore()
        .collection('plaidItems')
        .doc(itemId)
        .update(updateData);
}
//# sourceMappingURL=plaidService.js.map