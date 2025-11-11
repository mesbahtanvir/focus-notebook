/**
 * CSV Transaction Processing Cloud Function
 * Processes uploaded CSV files and enhances transaction data using AI
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { CONFIG } from './config';
import { logLLMInteraction, formatPromptForLogging, type LlmLogTrigger } from './utils/aiPromptLogger';

const ENHANCE_TRANSACTIONS_PROMPT_PATH = path.join(
  __dirname,
  '../prompts/enhance-transactions.prompt.yml'
);

interface CSVTransaction {
  date: string;
  description: string;
  amount: number;
}

interface EnhancedTransaction {
  originalDescription: string;
  merchantName: string;
  category: string;
  isSubscription: boolean;
  notes: string;
}

interface ProcessCSVRequest {
  fileUrl: string;
  fileName: string;
  storagePath: string;
  userId?: string;
}

interface EnhancementLoggingOptions {
  userId?: string;
  trigger?: LlmLogTrigger;
  metadata?: Record<string, any>;
}

type AiResponsePayload =
  | {
      transactions?: EnhancedTransaction[];
      summary?: any;
    }
  | EnhancedTransaction[]
  | null
  | undefined;

function tryParseJson<T = unknown>(input: string): T | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function parseStructuredAIResponse<T = unknown>(aiResponse: string): T {
  const candidates: string[] = [];
  const trimmed = aiResponse.trim();
  if (trimmed) {
    candidates.push(trimmed);
  }

  const fencedMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = aiResponse.indexOf('{');
  const lastBrace = aiResponse.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(aiResponse.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = tryParseJson<T>(candidate);
    if (parsed) {
      return parsed;
    }
  }

  throw new Error('Failed to parse AI-enhanced transaction data');
}

function buildFallbackSummary(
  transactions: EnhancedTransaction[],
  expectedCount: number
) {
  const categories = transactions
    .map((tx) => tx.category)
    .filter((category): category is string => Boolean(category));

  return {
    totalProcessed: transactions.length || expectedCount,
    categoriesUsed: Array.from(new Set(categories)),
    subscriptionsDetected: transactions.filter((tx) => tx.isSubscription).length,
  };
}

function normalizeAiResponse(
  parsed: AiResponsePayload,
  expectedCount: number
): { transactions: EnhancedTransaction[]; summary: any } {
  if (!parsed) {
    return {
      transactions: [],
      summary: buildFallbackSummary([], expectedCount),
    };
  }

  if (Array.isArray(parsed)) {
    return {
      transactions: parsed,
      summary: buildFallbackSummary(parsed, expectedCount),
    };
  }

  const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const summary = parsed.summary ?? buildFallbackSummary(transactions, expectedCount);

  return {
    transactions,
    summary,
  };
}

/**
 * Load and parse the enhance transactions prompt
 */
async function loadPrompt(): Promise<any> {
  try {
    const promptContent = await fs.readFile(ENHANCE_TRANSACTIONS_PROMPT_PATH, 'utf8');
    return yaml.parse(promptContent);
  } catch (error) {
    console.error('Failed to load prompt:', error);
    throw new Error('Failed to load AI prompt configuration');
  }
}

/**
 * Parse a single CSV line handling quoted fields properly (RFC 4180)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote within quoted field
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator outside quotes
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push the last field
  result.push(current.trim());

  return result;
}

/**
 * Parse CSV content into transaction objects
 * Handles quoted fields with commas (common in Amex statements)
 */
function parseCSV(csvContent: string): CSVTransaction[] {
  const lines = csvContent.trim().split('\n');

  // Skip header row if it exists
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

  const transactions: CSVTransaction[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line properly handling quoted fields
    const values = parseCSVLine(line);

    if (values.length >= 3) {
      // Parse amount - handle negative numbers, currency symbols, parentheses
      let amountStr = values[2].replace(/[$,]/g, '');
      let amount = 0;

      // Handle parentheses notation for negative numbers (common in accounting)
      if (amountStr.includes('(') && amountStr.includes(')')) {
        amountStr = '-' + amountStr.replace(/[()]/g, '');
      }

      amount = parseFloat(amountStr) || 0;

      transactions.push({
        date: values[0],
        description: values[1],
        amount: amount,
      });
    }
  }

  return transactions;
}

/**
 * Enhance transactions using AI
 */
async function enhanceTransactions(
  transactions: CSVTransaction[],
  logging?: EnhancementLoggingOptions
): Promise<{
  transactions: EnhancedTransaction[];
  summary: any;
}> {
  const prompt = await loadPrompt();

  // Build the user message
  const userMessage = prompt.messages
    .find((m: any) => m.role === 'user')
    ?.content.replace('{{transactions}}', JSON.stringify(transactions, null, 2));

  const systemMessage = prompt.messages.find((m: any) => m.role === 'system')?.content;

  // Extract model name (remove provider prefix if present)
  const modelName = prompt.model?.includes('/')
    ? prompt.model.split('/')[1]
    : prompt.model || 'gpt-4o';

  const promptForLog = formatPromptForLogging(systemMessage, userMessage);
  const logMetadata = {
    promptFile: ENHANCE_TRANSACTIONS_PROMPT_PATH,
    model: modelName,
    batchSize: transactions.length,
    ...logging?.metadata,
  };
  let logRecorded = false;

  const logResult = async (
    status: 'completed' | 'failed',
    rawResponse: string,
    error?: unknown
  ) => {
    if (!logging?.userId) {
      return;
    }
    try {
      await logLLMInteraction({
        userId: logging.userId,
        trigger: logging.trigger ?? 'csv-api',
        prompt: promptForLog,
        rawResponse,
        promptType: 'enhance-transactions',
        metadata: logMetadata,
        status,
        error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
      });
      logRecorded = true;
    } catch (logError) {
      console.warn('Failed to log transaction enhancement prompt history', logError);
    }
  };

  // Call OpenAI API directly
  const requestBody: Record<string, unknown> = {
    model: modelName,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: prompt.modelParameters?.temperature || 0.3,
    max_tokens: prompt.modelParameters?.max_tokens || 2000,
    response_format: { type: 'json_object' },
  };

  let responseBody = '';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    responseBody = await response.text();
    const data = responseBody ? JSON.parse(responseBody) : null;

    if (!response.ok) {
      const message = data?.error?.message || 'Unknown error';
      await logResult('failed', responseBody, message);
      throw new Error(`OpenAI API error: ${message}`);
    }

    const aiResponse = data?.choices?.[0]?.message?.content;

    if (!aiResponse) {
      await logResult('failed', responseBody, 'No response from OpenAI');
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = parseStructuredAIResponse<AiResponsePayload>(aiResponse);
      const normalized = normalizeAiResponse(parsed, transactions.length);
      await logResult('completed', aiResponse);
      return normalized;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Response was:', aiResponse);
      await logResult('failed', aiResponse, error);
      throw error;
    }
  } catch (error) {
    if (!logRecorded) {
      await logResult('failed', responseBody, error);
    }
    throw error;
  }
}

/**
 * Save enhanced transactions to Firestore
 */
async function saveTransactions(
  userId: string,
  transactions: CSVTransaction[],
  enhanced: EnhancedTransaction[]
): Promise<number> {
  const db = admin.firestore();
  const batch = db.batch();
  let count = 0;

  for (let i = 0; i < transactions.length; i++) {
    const raw = transactions[i];
    const enh = enhanced[i];

    if (!enh) continue;

    const transactionId = crypto.randomUUID();
    const docRef = db.collection(`users/${userId}/transactions`).doc(transactionId);

    batch.set(docRef, {
      id: transactionId,
      accountId: 'csv-upload', // Mark as CSV upload
      date: raw.date,
      description: raw.description,
      merchant: enh.merchantName,
      amount: Math.abs(raw.amount),
      category: enh.category,
      tags: enh.isSubscription ? ['subscription'] : [],
      notes: enh.notes,
      createdAt: admin.firestore.Timestamp.now().toDate().toISOString(),
      source: 'csv-upload',
      enhanced: true,
    });

    count++;

    // Firestore batch limit is 500
    if (count % 450 === 0) {
      await batch.commit();
    }
  }

  if (count % 450 !== 0) {
    await batch.commit();
  }

  return count;
}

/**
 * HTTP Callable function to process CSV transactions
 * Called from the Next.js API route
 */
export const processCSVTransactions = functions.https.onCall(
  async (data: ProcessCSVRequest, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to process CSV transactions'
      );
    }

    const userId = context.auth.uid;
    const { fileName, storagePath } = data;

    try {
      console.log(`Processing CSV for user ${userId}: ${fileName}`);

      // Download CSV from storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      const [csvContent] = await file.download();
      const csvText = csvContent.toString('utf8');

      // Parse CSV
      const transactions = parseCSV(csvText);
      console.log(`Parsed ${transactions.length} transactions`);

      if (transactions.length === 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'No valid transactions found in CSV file'
        );
      }

    // Enhance transactions with AI (process in batches of 50)
    const batchSize = 50;
    const totalBatches = Math.ceil(transactions.length / batchSize);
    const allEnhanced: EnhancedTransaction[] = [];

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);
      const result = await enhanceTransactions(batch, {
        userId,
        trigger: 'csv-api',
        metadata: {
          source: 'https-callable',
          fileName,
          storagePath,
          batchIndex,
          totalBatches,
          batchSize: batch.length,
          totalTransactions: transactions.length,
        },
      });
      allEnhanced.push(...result.transactions);
    }

      // Save to Firestore
      const savedCount = await saveTransactions(userId, transactions, allEnhanced);

      console.log(`Successfully processed ${savedCount} transactions`);

      return {
        success: true,
        processedCount: savedCount,
        fileName,
      };
    } catch (error: any) {
      console.error('Error processing CSV:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to process CSV: ${error.message}`
      );
    }
  }
);
/* istanbul ignore file */
/**
 * Callable wrapper around the CSV ingestion pipeline. The business logic streams files
 * from Cloud Storage and invokes Plaid which is only verifiable in integration tests, so we
 * exclude it from unit-test coverage.
 */
