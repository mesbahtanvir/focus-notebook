/**
 * CSV Storage Trigger Cloud Function
 * Automatically processes CSV files when uploaded to Firebase Storage
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { CONFIG } from './config';
import { logLLMInteraction, formatPromptForLogging, type LlmLogTrigger } from './utils/aiPromptLogger';

const PROMPT_FILE_NAME = 'enhance-transactions.prompt.yml';

function resolvePromptPath(): string {
  const candidatePaths = [
    path.join(__dirname, '../../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../../functions/prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'functions', 'prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'prompts', PROMPT_FILE_NAME),
  ];

  for (const candidate of candidatePaths) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Prompt file "${PROMPT_FILE_NAME}" not found. Checked: ${candidatePaths.join(', ')}`
  );
}

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

interface ProcessingStatus {
  status: 'processing' | 'completed' | 'error';
  fileName: string;
  storagePath?: string;
  processedCount?: number;
  processedBatches?: number;
  totalBatches?: number;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CsvBatchJob {
  userId: string;
  fileName: string;
  storagePath: string;
  batchIndex: number;
  totalBatches: number;
  totalTransactions: number;
  transactions: CSVTransaction[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: FirebaseFirestore.FieldValue | string;
  updatedAt?: FirebaseFirestore.FieldValue | string;
  error?: string;
}

export const CSV_BATCH_QUEUE_COLLECTION = 'csvBatchQueue';

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
    const promptPath = resolvePromptPath();
    const promptContent = await fs.readFile(promptPath, 'utf8');
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
    promptFile: PROMPT_FILE_NAME,
    model: modelName,
    batchSize: transactions.length,
    ...logging?.metadata,
  };
  let logRecorded = false;

  const logResult = async (
    status: 'completed' | 'failed',
    rawResponse: string,
    error?: unknown,
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  ) => {
    if (!logging?.userId) {
      return;
    }
    try {
      await logLLMInteraction({
        userId: logging.userId,
        trigger: logging.trigger ?? 'csv-upload',
        prompt: promptForLog,
        rawResponse,
        promptType: 'enhance-transactions',
        metadata: logMetadata,
        status,
        usage,
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
      await logResult('failed', responseBody, message, data?.usage);
      throw new Error(`OpenAI API error: ${message}`);
    }

    const aiResponse = data?.choices?.[0]?.message?.content;
    const usage = data?.usage;

    if (!aiResponse) {
      await logResult('failed', responseBody, 'No response from OpenAI', usage);
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = parseStructuredAIResponse<AiResponsePayload>(aiResponse);
      const normalized = normalizeAiResponse(parsed, transactions.length);
      await logResult('completed', aiResponse, undefined, usage);
      return normalized;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Response was:', aiResponse);
      await logResult('failed', aiResponse, error, usage);
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
  fileName: string,
  transactions: CSVTransaction[],
  enhanced: EnhancedTransaction[]
): Promise<number> {
  const db = admin.firestore();
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;

  for (let i = 0; i < transactions.length; i++) {
    const raw = transactions[i];
    const enh = enhanced[i];

    if (!enh) continue;

    const transactionId = crypto.randomUUID();
    const docRef = db.collection(`users/${userId}/transactions`).doc(transactionId);

    batch.set(docRef, {
      id: transactionId,
      accountId: 'csv-upload', // Mark as CSV upload
      csvFileName: fileName, // Track which CSV file this came from
      date: raw.date,
      description: raw.description,
      merchant: enh.merchantName,
      amount: raw.amount, // Keep original sign: negative = income, positive = expense
      category: enh.category,
      tags: enh.isSubscription ? ['subscription'] : [],
      notes: enh.notes,
      createdAt: admin.firestore.Timestamp.now().toDate().toISOString(),
      source: 'csv-upload',
      enhanced: true,
    });

    count++;
    batchCount++;

    // Firestore batch limit is 500 - commit at 450 and create new batch
    if (batchCount >= 450) {
      await batch.commit();
      batch = db.batch(); // Create new batch for next set of operations
      batchCount = 0;
    }
  }

  // Commit remaining operations
  if (batchCount > 0) {
    await batch.commit();
  }

  return count;
}

/**
 * Update processing status in Firestore
 */
async function updateProcessingStatus(
  userId: string,
  fileName: string,
  status: Partial<ProcessingStatus>
): Promise<void> {
  const db = admin.firestore();
  const statusRef = db.collection(`users/${userId}/csvProcessingStatus`).doc(fileName);

  const payload: Partial<ProcessingStatus> = {
    fileName,
    ...status,
  };

  if (!payload.updatedAt) {
    payload.updatedAt = new Date().toISOString();
  }

  await statusRef.set(payload, { merge: true });
}

/**
 * Create or update a persistent statement record
 */
async function upsertStatement(
  userId: string,
  fileName: string,
  storagePath: string,
  status: 'processing' | 'completed' | 'error',
  processedCount?: number,
  error?: string,
  options: { totalBatches?: number; processedBatches?: number } = {}
): Promise<void> {
  const db = admin.firestore();
  const statementId = fileName; // Use filename as ID for easy lookups
  const statementRef = db.collection(`users/${userId}/statements`).doc(statementId);

  const statementData = {
    id: statementId,
    fileName,
    storagePath,
    status,
    source: 'csv-upload',
    processedCount: processedCount || 0,
    error: error || null,
    totalBatches: options.totalBatches ?? admin.firestore.FieldValue.delete(),
    processedBatches: options.processedBatches ?? admin.firestore.FieldValue.delete(),
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await statementRef.set(statementData, { merge: true });
}

async function recordBatchCompletion(
  userId: string,
  fileName: string,
  storagePath: string,
  batchIndex: number,
  totalBatches: number,
  savedCount: number
): Promise<{ isComplete: boolean; processedBatches: number; processedCount: number }> {
  const db = admin.firestore();
  const statusRef = db.collection(`users/${userId}/csvProcessingStatus`).doc(fileName);

  let isComplete = false;
  let processedBatches = 0;
  let processedCount = 0;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(statusRef);
    const data = snap.data() || {};
    processedBatches = (data.processedBatches || 0) + 1;
    processedCount = (data.processedCount || 0) + savedCount;
    const total = data.totalBatches || totalBatches;
    isComplete = processedBatches >= total;

    tx.set(
      statusRef,
      {
        fileName,
        storagePath,
        processedBatches,
        processedCount,
        totalBatches: total,
        status: isComplete ? 'completed' : 'processing',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  });

  await upsertStatement(
    userId,
    fileName,
    storagePath,
    isComplete ? 'completed' : 'processing',
    processedCount,
    undefined,
    {
      totalBatches,
      processedBatches,
    }
  );

  return { isComplete, processedBatches, processedCount };
}

/**
 * Cloud Storage trigger for CSV file uploads
 * Automatically processes CSV files when uploaded to users/{userId}/statements/
 */
export const onCSVUpload = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;

  // Only process CSV files in the statements directory
  if (!filePath || !filePath.includes('/statements/') || !filePath.endsWith('.csv')) {
    console.log(`Skipping non-CSV file: ${filePath}`);
    return;
  }

  // Extract userId from path: users/{userId}/statements/{filename}
  const pathParts = filePath.split('/');
  if (pathParts.length < 4 || pathParts[0] !== 'users') {
    console.log(`Invalid path format: ${filePath}`);
    return;
  }

  const userId = pathParts[1];
  const fileName = pathParts[pathParts.length - 1];

  console.log(`Processing CSV upload for user ${userId}: ${fileName}`);

  try {
    // Download CSV from storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    const [csvContent] = await file.download();
    const csvText = csvContent.toString('utf8');

    // Parse CSV
    const transactions = parseCSV(csvText);
    console.log(`Parsed ${transactions.length} transactions`);

    if (transactions.length === 0) {
      throw new Error('No valid transactions found in CSV file');
    }

    const batchSize = 50;
    const totalBatches = Math.ceil(transactions.length / batchSize);
    const nowIso = new Date().toISOString();

    // Update status to reflect queued batches
    await updateProcessingStatus(userId, fileName, {
      status: 'processing',
      fileName,
      storagePath: filePath,
      processedCount: 0,
      processedBatches: 0,
      totalBatches,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Create persistent statement record
    await upsertStatement(userId, fileName, filePath, 'processing', 0, undefined, {
      totalBatches,
      processedBatches: 0,
    });

    const queueRef = admin.firestore().collection(CSV_BATCH_QUEUE_COLLECTION);

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);

      const job: CsvBatchJob = {
        userId,
        fileName,
        storagePath: filePath,
        batchIndex,
        totalBatches,
        totalTransactions: transactions.length,
        transactions: batch,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await queueRef.add(job);
    }

    console.log(
      `Queued ${totalBatches} CSV enhancement batches (${transactions.length} transactions) for ${fileName}`
    );
  } catch (error: any) {
    console.error('Error processing CSV:', error);

    // Update status to error
    await updateProcessingStatus(userId, fileName, {
      status: 'error',
      fileName,
      storagePath: filePath,
      error: error.message || 'Unknown error',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update persistent statement record
    await upsertStatement(userId, fileName, filePath, 'error', 0, error.message || 'Unknown error');
  }
});

export const processCsvBatchQueue = functions.firestore
  .document(`${CSV_BATCH_QUEUE_COLLECTION}/{jobId}`)
  .onCreate(async (snapshot, context) => {
    const job = snapshot.data() as CsvBatchJob | undefined;

    if (!job) {
      console.warn('CSV batch job missing data', context.params.jobId);
      return;
    }

    const jobRef = snapshot.ref;

    await jobRef.update({
      status: 'processing',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const result = await enhanceTransactions(job.transactions, {
        userId: job.userId,
        trigger: 'csv-upload',
        metadata: {
          source: 'storage-trigger-batch',
          fileName: job.fileName,
          storagePath: job.storagePath,
          batchIndex: job.batchIndex,
          totalBatches: job.totalBatches,
          batchSize: job.transactions.length,
          totalTransactions: job.totalTransactions,
        },
      });

      const savedCount = await saveTransactions(
        job.userId,
        job.fileName,
        job.transactions,
        result.transactions
      );

      const progress = await recordBatchCompletion(
        job.userId,
        job.fileName,
        job.storagePath,
        job.batchIndex,
        job.totalBatches,
        savedCount
      );

      await jobRef.delete();

      console.log(
        `Processed CSV batch ${job.batchIndex + 1}/${job.totalBatches} for ${job.fileName}; total processed ${progress.processedCount}`
      );
    } catch (error: any) {
      const message = error?.message || 'Unknown error';

      await jobRef.update({
        status: 'error',
        error: message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await updateProcessingStatus(job.userId, job.fileName, {
        status: 'error',
        fileName: job.fileName,
        storagePath: job.storagePath,
        error: message,
      });

      await upsertStatement(job.userId, job.fileName, job.storagePath, 'error', 0, message);

      throw error;
    }
  });
/* istanbul ignore file */
/**
 * Cloud Storage trigger that streams large CSV uploads. Covered via integration tests
 * because it relies on Firebase Storage events and chunked parsing that are not
 * practical to exercise inside Jest.
 */
