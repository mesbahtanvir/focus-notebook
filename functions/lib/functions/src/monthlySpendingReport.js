"use strict";
/**
 * Monthly Spending Report Cloud Function
 *
 * Runs on the 1st of each month to analyze transaction data and generate spending insights
 * for all users. Reports include spending patterns, category breakdowns, alerts, and
 * AI-generated recommendations.
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
exports.__private__ = exports.generateMonthlySpendingReports = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Get the previous month in YYYY-MM format
 */
function getPreviousMonth(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    if (month === 0) {
        return `${year - 1}-12`;
    }
    const prevMonth = month.toString().padStart(2, '0');
    return `${year}-${prevMonth}`;
}
/**
 * Get month before the previous month (for comparison)
 */
function getMonthBeforePrevious(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    if (month === 0) {
        return `${year - 1}-11`;
    }
    else if (month === 1) {
        return `${year - 1}-12`;
    }
    const twoMonthsAgo = (month - 1).toString().padStart(2, '0');
    return `${year}-${twoMonthsAgo}`;
}
/**
 * Fetch all transactions for a user in a given month
 */
async function fetchMonthTransactions(userId, month) {
    const [year, monthNum] = month.split('-');
    const startDate = `${year}-${monthNum}-01`;
    // Calculate the last day of the month
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const endDate = `${year}-${monthNum}-${lastDay}`;
    const snapshot = await db
        .collection(`users/${userId}/transactions`)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
    return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
}
/**
 * Analyze transactions and generate insights
 */
function analyzeTransactions(transactions) {
    const accountIds = new Set();
    let totalSpent = 0;
    const categoryMap = new Map();
    const merchantMap = new Map();
    // Process each transaction
    transactions.forEach(tx => {
        // Only count positive amounts (actual spending, not refunds)
        if (tx.amount > 0) {
            totalSpent += tx.amount;
            accountIds.add(tx.accountId);
            // Category breakdown
            const category = tx.category || 'other';
            const categoryData = categoryMap.get(category) || { total: 0, count: 0 };
            categoryData.total += tx.amount;
            categoryData.count += 1;
            categoryMap.set(category, categoryData);
            // Merchant breakdown
            const merchant = tx.merchant || 'Unknown';
            const merchantData = merchantMap.get(merchant) || { total: 0, count: 0 };
            merchantData.total += tx.amount;
            merchantData.count += 1;
            merchantMap.set(merchant, merchantData);
        }
    });
    // Calculate category percentages
    const categoryBreakdown = {};
    categoryMap.forEach((data, category) => {
        categoryBreakdown[category] = {
            total: data.total,
            count: data.count,
            percentage: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
        };
    });
    // Get top 10 merchants by spending
    const topMerchants = Array.from(merchantMap.entries())
        .map(([merchant, data]) => ({
        merchant,
        amount: data.total,
        count: data.count,
    }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    return {
        totalSpent,
        categoryBreakdown,
        topMerchants,
        accountIds: Array.from(accountIds),
    };
}
/**
 * Generate spending alerts based on patterns
 */
function generateAlerts(currentAnalysis, previousTotal, transactions) {
    const alerts = [];
    // Alert: Significant increase in spending (>30%)
    if (previousTotal && previousTotal > 0) {
        const changePercentage = ((currentAnalysis.totalSpent - previousTotal) / previousTotal) * 100;
        if (changePercentage > 30) {
            alerts.push({
                type: 'high_spending',
                severity: 'high',
                message: `Your spending increased by ${changePercentage.toFixed(1)}% compared to last month`,
                details: {
                    currentTotal: currentAnalysis.totalSpent,
                    previousTotal,
                    changePercentage,
                },
            });
        }
        else if (changePercentage > 15) {
            alerts.push({
                type: 'high_spending',
                severity: 'medium',
                message: `Your spending increased by ${changePercentage.toFixed(1)}% compared to last month`,
                details: {
                    currentTotal: currentAnalysis.totalSpent,
                    previousTotal,
                    changePercentage,
                },
            });
        }
    }
    // Alert: Large single transactions (>20% of total spending)
    const largeTransactions = transactions
        .filter(tx => tx.amount > 0 && (tx.amount / currentAnalysis.totalSpent) > 0.2)
        .sort((a, b) => b.amount - a.amount);
    if (largeTransactions.length > 0) {
        const tx = largeTransactions[0];
        alerts.push({
            type: 'large_transaction',
            severity: 'medium',
            message: `Large transaction detected: $${tx.amount.toFixed(2)} at ${tx.merchant}`,
            details: {
                transaction: {
                    amount: tx.amount,
                    merchant: tx.merchant,
                    date: tx.date,
                    category: tx.category,
                },
            },
        });
    }
    // Alert: High spending in unusual categories
    const unusualCategories = ['entertainment', 'shopping', 'travel'];
    Object.entries(currentAnalysis.categoryBreakdown).forEach(([category, data]) => {
        if (unusualCategories.includes(category) && data.percentage > 30) {
            alerts.push({
                type: 'unusual_category',
                severity: 'low',
                message: `High spending in ${category}: ${data.percentage.toFixed(1)}% of total`,
                details: {
                    category,
                    amount: data.total,
                    percentage: data.percentage,
                },
            });
        }
    });
    // Alert: Subscription spending detection
    const subscriptionCategory = currentAnalysis.categoryBreakdown['subscriptions'];
    if (subscriptionCategory && subscriptionCategory.percentage > 20) {
        alerts.push({
            type: 'subscription_increase',
            severity: 'medium',
            message: `Subscriptions account for ${subscriptionCategory.percentage.toFixed(1)}% of spending`,
            details: {
                amount: subscriptionCategory.total,
                count: subscriptionCategory.count,
                percentage: subscriptionCategory.percentage,
            },
        });
    }
    return alerts;
}
/**
 * Call OpenAI API to generate AI insights and recommendations
 */
async function generateAIInsights(month, analysis, previousTotal, alerts, apiKey) {
    var _a, _b;
    if (!apiKey || !apiKey.startsWith('sk-')) {
        functions.logger.info('No valid OpenAI API key, skipping AI insights');
        return null;
    }
    try {
        const changePercentage = previousTotal && previousTotal > 0
            ? ((analysis.totalSpent - previousTotal) / previousTotal) * 100
            : 0;
        const systemPrompt = `You are a financial advisor analyzing monthly spending patterns.
Provide concise, actionable insights about spending behavior and practical recommendations.
Focus on patterns, trends, and opportunities for improvement.`;
        const userPrompt = `Analyze this monthly spending report for ${month}:

Total Spent: $${analysis.totalSpent.toFixed(2)}
${previousTotal ? `Previous Month: $${previousTotal.toFixed(2)} (${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(1)}%)` : 'No previous month data'}

Category Breakdown:
${Object.entries(analysis.categoryBreakdown)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([cat, data]) => `- ${cat}: $${data.total.toFixed(2)} (${data.percentage.toFixed(1)}%)`)
            .join('\n')}

Top Merchants:
${analysis.topMerchants.slice(0, 5).map(m => `- ${m.merchant}: $${m.amount.toFixed(2)}`).join('\n')}

Alerts:
${alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n')}

Provide:
1. A brief summary (2-3 sentences) of the spending behavior
2. 3-5 specific, actionable recommendations

Format your response as JSON:
{
  "summary": "Your summary here",
  "recommendations": ["Recommendation 1", "Recommendation 2", ...]
}`;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 800,
            }),
        });
        if (!response.ok) {
            functions.logger.warn('OpenAI API error', { status: response.status });
            return null;
        }
        const data = await response.json();
        const content = (_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
        if (!content) {
            return null;
        }
        // Parse JSON response (handle markdown code blocks)
        const cleanedContent = content.trim()
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '');
        const parsed = JSON.parse(cleanedContent);
        return {
            summary: parsed.summary || '',
            recommendations: parsed.recommendations || [],
        };
    }
    catch (error) {
        functions.logger.error('Failed to generate AI insights', error);
        return null;
    }
}
/**
 * Generate spending report for a single user
 */
async function generateUserReport(userId, targetMonth) {
    var _a, _b;
    try {
        // Fetch transactions for the target month
        const transactions = await fetchMonthTransactions(userId, targetMonth);
        // Skip if no transactions
        if (transactions.length === 0) {
            functions.logger.info('No transactions found', { userId, month: targetMonth });
            return;
        }
        // Analyze transactions
        const analysis = analyzeTransactions(transactions);
        // Fetch previous month's total for comparison
        const previousMonth = getMonthBeforePrevious();
        const previousInsightSnapshot = await db
            .collection(`users/${userId}/spendingInsights`)
            .where('month', '==', previousMonth)
            .limit(1)
            .get();
        const previousTotal = previousInsightSnapshot.empty
            ? null
            : previousInsightSnapshot.docs[0].data().totalSpent;
        // Generate alerts
        const alerts = generateAlerts(analysis, previousTotal, transactions);
        // Try to get user's OpenAI API key for AI insights
        const userDoc = await db.doc(`users/${userId}`).get();
        const apiKey = ((_b = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.aiConfig) === null || _b === void 0 ? void 0 : _b.openAIApiKey) || '';
        // Generate AI insights if API key is available
        let aiInsights = null;
        if (apiKey) {
            aiInsights = await generateAIInsights(targetMonth, analysis, previousTotal, alerts, apiKey);
        }
        // Prepare spending insight document
        const insight = {
            month: targetMonth,
            accountIds: analysis.accountIds,
            totalSpent: analysis.totalSpent,
            categoryBreakdown: analysis.categoryBreakdown,
            topMerchants: analysis.topMerchants,
            alerts,
            aiSummary: aiInsights === null || aiInsights === void 0 ? void 0 : aiInsights.summary,
            recommendations: aiInsights === null || aiInsights === void 0 ? void 0 : aiInsights.recommendations,
            comparisonToPreviousMonth: previousTotal ? {
                previousTotal,
                changeAmount: analysis.totalSpent - previousTotal,
                changePercentage: ((analysis.totalSpent - previousTotal) / previousTotal) * 100,
            } : undefined,
            createdAt: new Date().toISOString(),
        };
        // Save to Firestore
        const insightRef = db.collection(`users/${userId}/spendingInsights`).doc();
        await insightRef.set(Object.assign({ id: insightRef.id }, insight));
        functions.logger.info('Generated spending report', {
            userId,
            month: targetMonth,
            totalSpent: analysis.totalSpent,
            transactionCount: transactions.length,
            alertCount: alerts.length,
            hasAIInsights: !!aiInsights,
        });
    }
    catch (error) {
        functions.logger.error('Failed to generate user report', {
            userId,
            month: targetMonth,
            error: error.message,
        });
    }
}
/**
 * Main scheduled function: Generate monthly spending reports for all users
 * Runs on the 1st of each month at 01:00 UTC
 */
exports.generateMonthlySpendingReports = functions.pubsub
    .schedule('0 1 1 * *') // At 01:00 on the 1st day of every month
    .timeZone('UTC')
    .onRun(async () => {
    const targetMonth = getPreviousMonth();
    functions.logger.info('Starting monthly spending report generation', {
        month: targetMonth,
        timestamp: new Date().toISOString(),
    });
    try {
        // Fetch all users
        const usersSnapshot = await db.collection('users').get();
        let processed = 0;
        let skipped = 0;
        let errors = 0;
        // Process each user
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            try {
                await generateUserReport(userId, targetMonth);
                processed += 1;
            }
            catch (error) {
                errors += 1;
                functions.logger.error('Failed to process user', {
                    userId,
                    error: error.message,
                });
            }
        }
        functions.logger.info('Monthly spending report generation complete', {
            month: targetMonth,
            totalUsers: usersSnapshot.size,
            processed,
            skipped,
            errors,
        });
    }
    catch (error) {
        functions.logger.error('Fatal error in monthly spending report generation', {
            error: error.message,
        });
        throw error;
    }
});
// Export for testing
exports.__private__ = {
    getPreviousMonth,
    getMonthBeforePrevious,
    fetchMonthTransactions,
    analyzeTransactions,
    generateAlerts,
    generateAIInsights,
    generateUserReport,
};
//# sourceMappingURL=monthlySpendingReport.js.map