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
 * Parse CSV content into transaction objects
 */
function parseCSV(csvContent: string): CSVTransaction[] {
  const lines = csvContent.trim().split('\n');

  // Skip header row if it exists
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

  const transactions: CSVTransaction[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles basic cases)
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

    if (values.length >= 3) {
      transactions.push({
        date: values[0],
        description: values[1],
        amount: parseFloat(values[2]) || 0,
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
      const allEnhanced: EnhancedTransaction[] = [];

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const result = await enhanceTransactions(batch);
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
