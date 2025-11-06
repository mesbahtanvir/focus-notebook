"use strict";
/**
 * Firebase Cloud Functions for Focus Notebook AI Processing
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
exports.syncStripeSubscription = exports.stripeWebhook = exports.createStripePortalSession = exports.createStripeCheckoutSession = exports.generateMonthlySpendingReports = exports.createDailyPortfolioSnapshots = exports.cleanupExpiredAnonymousUsers = exports.refreshTrackedTickerPrices = exports.updateTrackedTickers = exports.processThoughtQueueWorker = exports.revertThoughtProcessing = exports.reprocessThought = exports.manualProcessThought = exports.processNewThought = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// Import cloud functions
const processThought_1 = require("./processThought");
Object.defineProperty(exports, "processNewThought", { enumerable: true, get: function () { return processThought_1.processNewThought; } });
Object.defineProperty(exports, "manualProcessThought", { enumerable: true, get: function () { return processThought_1.manualProcessThought; } });
Object.defineProperty(exports, "reprocessThought", { enumerable: true, get: function () { return processThought_1.reprocessThought; } });
Object.defineProperty(exports, "revertThoughtProcessing", { enumerable: true, get: function () { return processThought_1.revertThoughtProcessing; } });
Object.defineProperty(exports, "processThoughtQueueWorker", { enumerable: true, get: function () { return processThought_1.processThoughtQueueWorker; } });
const marketData_1 = require("./marketData");
Object.defineProperty(exports, "refreshTrackedTickerPrices", { enumerable: true, get: function () { return marketData_1.refreshTrackedTickerPrices; } });
Object.defineProperty(exports, "updateTrackedTickers", { enumerable: true, get: function () { return marketData_1.updateTrackedTickers; } });
const cleanupAnonymous_1 = require("./cleanupAnonymous");
Object.defineProperty(exports, "cleanupExpiredAnonymousUsers", { enumerable: true, get: function () { return cleanupAnonymous_1.cleanupExpiredAnonymousUsers; } });
const portfolioSnapshots_1 = require("./portfolioSnapshots");
Object.defineProperty(exports, "createDailyPortfolioSnapshots", { enumerable: true, get: function () { return portfolioSnapshots_1.createDailyPortfolioSnapshots; } });
const monthlySpendingReport_1 = require("./monthlySpendingReport");
Object.defineProperty(exports, "generateMonthlySpendingReports", { enumerable: true, get: function () { return monthlySpendingReport_1.generateMonthlySpendingReports; } });
const stripeBilling_1 = require("./stripeBilling");
Object.defineProperty(exports, "createStripeCheckoutSession", { enumerable: true, get: function () { return stripeBilling_1.createStripeCheckoutSession; } });
Object.defineProperty(exports, "createStripePortalSession", { enumerable: true, get: function () { return stripeBilling_1.createStripePortalSession; } });
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripeBilling_1.stripeWebhook; } });
Object.defineProperty(exports, "syncStripeSubscription", { enumerable: true, get: function () { return stripeBilling_1.syncStripeSubscription; } });
//# sourceMappingURL=index.js.map