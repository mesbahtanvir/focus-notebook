"use strict";
/**
 * LLM Insights Service
 * Generate spending insights using Claude with strict JSON schema
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
exports.generateMonthlyInsights = generateMonthlyInsights;
exports.getInsights = getInsights;
exports.detectNewSubscriptionsForMonth = detectNewSubscriptionsForMonth;
const sdk_1 = require("@anthropic-ai/sdk");
const admin = __importStar(require("firebase-admin"));
const monthlyRollupService_1 = require("./monthlyRollupService");
const db = admin.firestore();
const anthropic = new sdk_1.Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
// ============================================================================
// Generate Insights
// ============================================================================
async function generateMonthlyInsights(uid, month, force = false) {
    var _a;
    // Check if analysis already exists
    const analysisId = `${uid}_${month}`;
    const analysisRef = db.collection('llmAnalyses').doc(analysisId);
    const existingDoc = await analysisRef.get();
    if (existingDoc.exists && !force) {
        const existing = existingDoc.data();
        if ((existing === null || existing === void 0 ? void 0 : existing.status) === 'done') {
            return analysisId;
        }
    }
    // Create/update analysis document with pending status
    await analysisRef.set({
        uid,
        month,
        model: 'claude-3-5-sonnet-20241022',
        status: 'pending',
        createdAt: Date.now(),
    }, { merge: true });
    // Build or fetch rollup
    const rollupId = `${uid}_${month}`;
    const rollupDoc = await db.collection('monthlyRollups').doc(rollupId).get();
    let rollup;
    if (rollupDoc.exists) {
        rollup = rollupDoc.data();
    }
    else {
        rollup = await (0, monthlyRollupService_1.buildMonthlyRollup)(uid, month);
    }
    // Get notable transactions
    const notableTransactions = await (0, monthlyRollupService_1.getNotableTransactions)(uid, month, 10);
    // Calculate input hash
    const inputHash = (0, monthlyRollupService_1.calculateInputHash)(rollup, notableTransactions);
    // Check if we can use cached result
    if (existingDoc.exists && ((_a = existingDoc.data()) === null || _a === void 0 ? void 0 : _a.inputHash) === inputHash) {
        return analysisId;
    }
    // Update status to processing
    await analysisRef.update({
        status: 'processing',
        inputHash,
    });
    // Generate insights with Claude
    try {
        const insights = await callClaudeForInsights(rollup, notableTransactions);
        // Save results
        await analysisRef.update({
            status: 'done',
            output: insights,
            completedAt: Date.now(),
            tokens: {
                prompt: 0, // Would need to parse usage from response
                completion: 0,
            },
        });
        return analysisId;
    }
    catch (error) {
        console.error('Error generating insights:', error);
        await analysisRef.update({
            status: 'error',
            error: error.message,
            completedAt: Date.now(),
        });
        throw error;
    }
}
// ============================================================================
// Call Claude for Insights
// ============================================================================
async function callClaudeForInsights(rollup, notableTransactions) {
    const systemPrompt = `You are a precise personal-finance analyst. Use only provided aggregates and notable transactions.
Do not invent numbers. If data is missing, state what's missing.
Produce 3–6 headlineInsights; spendWarnings for categories with >30% MoM increase; list newSubscriptions exactly as provided; suggest 2–4 actionable budgetSuggestions; ask 1–3 clarifying questions.
Return valid JSON only conforming to the schema.`;
    const userPrompt = `Analyze this spending data for ${rollup.month}:

## Summary
- Total Outflow: $${rollup.cashflow.outflow.toFixed(2)}
- Total Inflow: $${rollup.cashflow.inflow.toFixed(2)}
- Net Cashflow: $${rollup.cashflow.net.toFixed(2)}
- Transaction Count: ${rollup.transactionCount}

## Category Breakdown
${rollup.categoryBreakdown.slice(0, 10).map((cat) => `- ${cat.category}: $${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%, ${cat.count} txns)`).join('\n')}

## Top Merchants
${rollup.topMerchants.slice(0, 10).map((m) => `- ${m.merchant}: $${m.total.toFixed(2)} (${m.count} txns)`).join('\n')}

## Anomalies (vs Previous Month)
${rollup.anomalies.length > 0
        ? rollup.anomalies.map((a) => `- ${a.category}: ${a.deltaPct > 0 ? '+' : ''}${a.deltaPct}% ${a.explanation || ''}`).join('\n')
        : 'No significant anomalies detected'}

## Notable Transactions
${notableTransactions.slice(0, 10).map((t) => `- ${t.merchant}: $${t.amount.toFixed(2)} on ${t.date} (${t.category})`).join('\n')}

Return a JSON object with this exact structure:
{
  "month": "YYYY-MM",
  "headlineInsights": ["string", "string", ...],
  "spendWarnings": [{"category": "string", "deltaPct": number, "explanation": "string"}, ...],
  "newSubscriptions": [{"merchant": "string", "amount": number, "firstSeen": "YYYY-MM-DD"}, ...],
  "budgetSuggestions": {
    "notes": "string",
    "actions": [{"title": "string", "impact": "string"}, ...]
  },
  "questionsForUser": ["string", ...]
}`;
    let responseText = '';
    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
        });
        const content = message.content[0];
        if (content.type === 'text') {
            responseText = content.text;
            // Extract JSON from response (might be wrapped in markdown)
            let jsonText = content.text.trim();
            // Remove markdown code blocks if present
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }
            else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\n?/g, '');
            }
            const insights = JSON.parse(jsonText);
            // Validate required fields
            if (!insights.month || !insights.headlineInsights || !insights.budgetSuggestions) {
                throw new Error('Invalid insight structure returned by LLM');
            }
            return insights;
        }
        throw new Error('Unexpected response format from Claude');
    }
    catch (error) {
        console.error('Claude API error:', error);
        // If JSON parsing fails, try to fix and retry once
        if (error instanceof SyntaxError) {
            console.error('JSON parsing failed. Response:', responseText);
            throw new Error('Invalid JSON returned by LLM');
        }
        throw error;
    }
}
// ============================================================================
// Get Insights (for API consumption)
// ============================================================================
async function getInsights(uid, month) {
    const analysisId = `${uid}_${month}`;
    const analysisDoc = await db.collection('llmAnalyses').doc(analysisId).get();
    if (!analysisDoc.exists) {
        return null;
    }
    const analysis = analysisDoc.data();
    if ((analysis === null || analysis === void 0 ? void 0 : analysis.status) !== 'done') {
        return null;
    }
    return analysis.output;
}
// ============================================================================
// Detect New Subscriptions (for insights)
// ============================================================================
async function detectNewSubscriptionsForMonth(uid, month) {
    const [year, monthNum] = month.split('-').map(Number);
    // Get all recurring streams for user
    const streamsSnapshot = await db
        .collection('recurringStreams')
        .where('uid', '==', uid)
        .where('active', '==', true)
        .get();
    const newSubs = [];
    for (const doc of streamsSnapshot.docs) {
        const stream = doc.data();
        const firstSeenDate = new Date(stream.firstSeen);
        // Check if first seen in this month
        if (firstSeenDate.getFullYear() === year &&
            firstSeenDate.getMonth() + 1 === monthNum) {
            newSubs.push({
                merchant: stream.merchant,
                amount: stream.meanAmount,
                firstSeen: stream.firstSeen,
            });
        }
    }
    return newSubs.sort((a, b) => b.amount - a.amount);
}
//# sourceMappingURL=llmInsightsService.js.map