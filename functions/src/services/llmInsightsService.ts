/**
 * LLM Insights Service
 * Generate spending insights using Claude with strict JSON schema
 */

import { Anthropic } from '@anthropic-ai/sdk';
import * as admin from 'firebase-admin';
import {
  buildMonthlyRollup,
  getNotableTransactions,
  calculateInputHash,
} from './monthlyRollupService';

const db = admin.firestore();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// LLM Insight Output Schema
// ============================================================================

export interface LLMInsightOutput {
  month: string;
  headlineInsights: string[];
  spendWarnings: Array<{
    category: string;
    deltaPct: number;
    explanation: string;
  }>;
  newSubscriptions: Array<{
    merchant: string;
    amount: number;
    firstSeen: string;
  }>;
  budgetSuggestions: {
    notes: string;
    actions: Array<{
      title: string;
      impact: string;
    }>;
  };
  questionsForUser: string[];
}

// ============================================================================
// Generate Insights
// ============================================================================

export async function generateMonthlyInsights(
  uid: string,
  month: string,
  force: boolean = false
): Promise<string> {
  // Check if analysis already exists
  const analysisId = `${uid}_${month}`;
  const analysisRef = db.collection('llmAnalyses').doc(analysisId);
  const existingDoc = await analysisRef.get();

  if (existingDoc.exists && !force) {
    const existing = existingDoc.data();
    if (existing?.status === 'done') {
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
  let rollup;
  const rollupId = `${uid}_${month}`;
  const rollupDoc = await db.collection('monthlyRollups').doc(rollupId).get();

  if (rollupDoc.exists) {
    rollup = rollupDoc.data();
  } else {
    rollup = await buildMonthlyRollup(uid, month);
  }

  // Get notable transactions
  const notableTransactions = await getNotableTransactions(uid, month, 10);

  // Calculate input hash
  const inputHash = calculateInputHash(rollup, notableTransactions);

  // Check if we can use cached result
  if (existingDoc.exists && existingDoc.data()?.inputHash === inputHash) {
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
  } catch (error: any) {
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

async function callClaudeForInsights(
  rollup: any,
  notableTransactions: any[]
): Promise<LLMInsightOutput> {
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
${rollup.categoryBreakdown.slice(0, 10).map((cat: any) =>
  `- ${cat.category}: $${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%, ${cat.count} txns)`
).join('\n')}

## Top Merchants
${rollup.topMerchants.slice(0, 10).map((m: any) =>
  `- ${m.merchant}: $${m.total.toFixed(2)} (${m.count} txns)`
).join('\n')}

## Anomalies (vs Previous Month)
${rollup.anomalies.length > 0
  ? rollup.anomalies.map((a: any) =>
      `- ${a.category}: ${a.deltaPct > 0 ? '+' : ''}${a.deltaPct}% ${a.explanation || ''}`
    ).join('\n')
  : 'No significant anomalies detected'}

## Notable Transactions
${notableTransactions.slice(0, 10).map((t: any) =>
  `- ${t.merchant}: $${t.amount.toFixed(2)} on ${t.date} (${t.category})`
).join('\n')}

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
      // Extract JSON from response (might be wrapped in markdown)
      let jsonText = content.text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const insights: LLMInsightOutput = JSON.parse(jsonText);

      // Validate required fields
      if (!insights.month || !insights.headlineInsights || !insights.budgetSuggestions) {
        throw new Error('Invalid insight structure returned by LLM');
      }

      return insights;
    }

    throw new Error('Unexpected response format from Claude');
  } catch (error: any) {
    console.error('Claude API error:', error);

    // If JSON parsing fails, try to fix and retry once
    if (error instanceof SyntaxError) {
      console.error('JSON parsing failed. Response:', content);
      throw new Error('Invalid JSON returned by LLM');
    }

    throw error;
  }
}

// ============================================================================
// Get Insights (for API consumption)
// ============================================================================

export async function getInsights(
  uid: string,
  month: string
): Promise<LLMInsightOutput | null> {
  const analysisId = `${uid}_${month}`;
  const analysisDoc = await db.collection('llmAnalyses').doc(analysisId).get();

  if (!analysisDoc.exists) {
    return null;
  }

  const analysis = analysisDoc.data();

  if (analysis?.status !== 'done') {
    return null;
  }

  return analysis.output as LLMInsightOutput;
}

// ============================================================================
// Detect New Subscriptions (for insights)
// ============================================================================

export async function detectNewSubscriptionsForMonth(
  uid: string,
  month: string
): Promise<Array<{ merchant: string; amount: number; firstSeen: string }>> {
  const [year, monthNum] = month.split('-').map(Number);

  // Get all recurring streams for user
  const streamsSnapshot = await db
    .collection('recurringStreams')
    .where('uid', '==', uid)
    .where('active', '==', true)
    .get();

  const newSubs: Array<{ merchant: string; amount: number; firstSeen: string }> = [];

  for (const doc of streamsSnapshot.docs) {
    const stream = doc.data();
    const firstSeenDate = new Date(stream.firstSeen);

    // Check if first seen in this month
    if (
      firstSeenDate.getFullYear() === year &&
      firstSeenDate.getMonth() + 1 === monthNum
    ) {
      newSubs.push({
        merchant: stream.merchant,
        amount: stream.meanAmount,
        firstSeen: stream.firstSeen,
      });
    }
  }

  return newSubs.sort((a, b) => b.amount - a.amount);
}
