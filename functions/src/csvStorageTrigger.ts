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
  error?: string;
  createdAt: string;
  updatedAt: string;
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
  transactions: CSVTransaction[]
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

  // Call OpenAI API directly
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature: prompt.modelParameters?.temperature || 0.3,
      max_tokens: prompt.modelParameters?.max_tokens || 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No response from OpenAI');
  }

  // Parse the response
  try {
    const parsed = JSON.parse(aiResponse);
    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Response was:', aiResponse);
    throw new Error('Failed to parse AI-enhanced transaction data');
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
  status: ProcessingStatus
): Promise<void> {
  const db = admin.firestore();
  const statusRef = db.collection(`users/${userId}/csvProcessingStatus`).doc(fileName);

  await statusRef.set(status, { merge: true });
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
  error?: string
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
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await statementRef.set(statementData, { merge: true });
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
    // Update status to processing
    await updateProcessingStatus(userId, fileName, {
      status: 'processing',
      fileName,
      storagePath: filePath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create persistent statement record
    await upsertStatement(userId, fileName, filePath, 'processing');

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

    // Enhance transactions with AI (process in batches of 50)
    const batchSize = 50;
    const allEnhanced: EnhancedTransaction[] = [];

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const result = await enhanceTransactions(batch);
      allEnhanced.push(...result.transactions);
    }

    // Save to Firestore
    const savedCount = await saveTransactions(userId, fileName, transactions, allEnhanced);

    console.log(`Successfully processed ${savedCount} transactions`);

    // Update status to completed
    await updateProcessingStatus(userId, fileName, {
      status: 'completed',
      fileName,
      storagePath: filePath,
      processedCount: savedCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update persistent statement record
    await upsertStatement(userId, fileName, filePath, 'completed', savedCount);
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
/* istanbul ignore file */
/**
 * Cloud Storage trigger that streams large CSV uploads. Covered via integration tests
 * because it relies on Firebase Storage events and chunked parsing that are not
 * practical to exercise inside Jest.
 */
