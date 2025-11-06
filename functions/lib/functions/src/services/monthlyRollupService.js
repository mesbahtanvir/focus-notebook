"use strict";
/**
 * Monthly Rollup Service
 * Aggregates transactions into monthly summaries for analytics
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
exports.buildMonthlyRollup = buildMonthlyRollup;
exports.getNotableTransactions = getNotableTransactions;
exports.calculateInputHash = calculateInputHash;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const db = admin.firestore();
async function buildMonthlyRollup(uid, month // YYYY-MM
) {
    var _a, _b, _c, _d, _e;
    // Get all transactions for the month
    const startDate = `${month}-01`;
    const endDate = getMonthEndDate(month);
    const txnsSnapshot = await db
        .collection('transactions')
        .where('uid', '==', uid)
        .where('postedAt', '>=', startDate)
        .where('postedAt', '<=', endDate)
        .where('pending', '==', false)
        .get();
    const transactions = txnsSnapshot.docs.map(doc => doc.data());
    // Check if user is premium
    const userDoc = await db.collection('users').doc(uid).get();
    const isPremium = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.plan) === 'premium';
    // Initialize aggregations
    const categoryTotals = {};
    const categoryCounts = {};
    const merchantTotals = {};
    let totalInflow = 0;
    let totalOutflow = 0;
    // Process transactions
    for (const txn of transactions) {
        const amount = Math.abs(txn.amount);
        const isIncome = txn.amount < 0; // Plaid: negative = credit/income
        // Category aggregation (use premium if available, else base)
        const category = isPremium && ((_b = txn.category_premium) === null || _b === void 0 ? void 0 : _b[0])
            ? txn.category_premium[0]
            : ((_c = txn.category_base) === null || _c === void 0 ? void 0 : _c[0]) || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        // Merchant aggregation
        const merchant = ((_d = txn.merchant) === null || _d === void 0 ? void 0 : _d.normalized) || ((_e = txn.merchant) === null || _e === void 0 ? void 0 : _e.name) || 'Unknown';
        if (!merchantTotals[merchant]) {
            merchantTotals[merchant] = { total: 0, count: 0 };
        }
        merchantTotals[merchant].total += amount;
        merchantTotals[merchant].count += 1;
        // Cashflow
        if (isIncome) {
            totalInflow += amount;
        }
        else {
            totalOutflow += amount;
        }
    }
    // Calculate category breakdown with percentages
    const totalSpending = totalOutflow;
    const categoryBreakdown = Object.entries(categoryTotals)
        .map(([category, total]) => ({
        category,
        total,
        count: categoryCounts[category],
        percentage: totalSpending > 0 ? (total / totalSpending) * 100 : 0,
    }))
        .sort((a, b) => b.total - a.total);
    // Top merchants
    const topMerchants = Object.entries(merchantTotals)
        .map(([merchant, data]) => ({
        merchant,
        total: data.total,
        count: data.count,
    }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    // Detect anomalies (categories with >30% change vs previous month)
    const anomalies = await detectAnomalies(uid, month, categoryTotals);
    const rollup = {
        uid,
        month,
        totalsByCategory: categoryTotals,
        categoryBreakdown,
        topMerchants,
        cashflow: {
            inflow: totalInflow,
            outflow: totalOutflow,
            net: totalInflow - totalOutflow,
        },
        anomalies,
        transactionCount: transactions.length,
        builtAt: Date.now(),
    };
    // Save rollup to Firestore
    const rollupId = `${uid}_${month}`;
    await db.collection('monthlyRollups').doc(rollupId).set(rollup);
    return rollup;
}
// ============================================================================
// Detect Anomalies
// ============================================================================
async function detectAnomalies(uid, currentMonth, currentTotals) {
    var _a;
    // Get previous month
    const [year, month] = currentMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1); // month - 2 because JS months are 0-indexed
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    // Fetch previous month's rollup
    const prevRollupId = `${uid}_${prevMonth}`;
    const prevRollupDoc = await db.collection('monthlyRollups').doc(prevRollupId).get();
    if (!prevRollupDoc.exists) {
        return []; // No previous data to compare
    }
    const prevTotals = ((_a = prevRollupDoc.data()) === null || _a === void 0 ? void 0 : _a.totalsByCategory) || {};
    // Compare categories
    const anomalies = [];
    for (const [category, currentTotal] of Object.entries(currentTotals)) {
        const prevTotal = prevTotals[category] || 0;
        if (prevTotal === 0 && currentTotal > 0) {
            // New category spending
            anomalies.push({
                category,
                deltaPct: 100,
                explanation: 'New spending category this month',
            });
        }
        else if (prevTotal > 0) {
            const deltaPct = ((currentTotal - prevTotal) / prevTotal) * 100;
            // Flag if change > 30%
            if (Math.abs(deltaPct) > 30) {
                anomalies.push({
                    category,
                    deltaPct: Math.round(deltaPct),
                    explanation: deltaPct > 0
                        ? `Spending increased by ${Math.round(deltaPct)}%`
                        : `Spending decreased by ${Math.abs(Math.round(deltaPct))}%`,
                });
            }
        }
    }
    // Also check for categories that disappeared
    for (const category of Object.keys(prevTotals)) {
        if (!currentTotals[category] && prevTotals[category] > 100) {
            // Only flag if previous spending was significant
            anomalies.push({
                category,
                deltaPct: -100,
                explanation: 'No spending in this category this month',
            });
        }
    }
    return anomalies.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}
// ============================================================================
// Helper Functions
// ============================================================================
function getMonthEndDate(month) {
    const [year, monthNum] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    return `${month}-${String(lastDay).padStart(2, '0')}`;
}
// ============================================================================
// Get Notable Transactions (for LLM insights)
// ============================================================================
async function getNotableTransactions(uid, month, limit = 10) {
    const startDate = `${month}-01`;
    const endDate = getMonthEndDate(month);
    // Get top transactions by amount (excluding transfers/income)
    const txnsSnapshot = await db
        .collection('transactions')
        .where('uid', '==', uid)
        .where('postedAt', '>=', startDate)
        .where('postedAt', '<=', endDate)
        .where('pending', '==', false)
        .orderBy('amount', 'desc')
        .limit(limit * 2) // Get more to filter
        .get();
    const transactions = txnsSnapshot.docs
        .map(doc => {
        var _a, _b, _c, _d;
        return ({
            merchant: ((_a = doc.data().merchant) === null || _a === void 0 ? void 0 : _a.normalized) || ((_b = doc.data().merchant) === null || _b === void 0 ? void 0 : _b.name),
            amount: Math.abs(doc.data().amount),
            date: doc.data().postedAt,
            category: ((_c = doc.data().category_premium) === null || _c === void 0 ? void 0 : _c[0]) || ((_d = doc.data().category_base) === null || _d === void 0 ? void 0 : _d[0]),
        });
    })
        .filter(txn => txn.amount > 50) // Exclude small transactions
        .slice(0, limit);
    return transactions;
}
// ============================================================================
// Calculate Input Hash (for LLM caching)
// ============================================================================
function calculateInputHash(rollup, notableTransactions) {
    const input = JSON.stringify({
        rollup: {
            month: rollup.month,
            categoryBreakdown: rollup.categoryBreakdown,
            topMerchants: rollup.topMerchants.slice(0, 5),
            cashflow: rollup.cashflow,
            anomalies: rollup.anomalies,
        },
        notableTransactions,
    });
    return crypto.createHash('sha256').update(input).digest('hex');
}
//# sourceMappingURL=monthlyRollupService.js.map