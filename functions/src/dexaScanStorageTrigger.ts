/**
 * Dexa Scan Storage Trigger Cloud Function
 * Automatically processes Dexa scan files when uploaded to Firebase Storage
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { CONFIG } from './config';

const PARSE_DEXA_SCAN_PROMPT_PATH = path.join(
  __dirname,
  '../prompts/parse-dexa-scan.prompt.yml'
);

interface ProcessingStatus {
  status: 'processing' | 'completed' | 'error';
  fileName: string;
  storagePath?: string;
  scanId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface DexaScanData {
  scanDate: string;
  weight?: number;
  weightUnit?: string;
  bodyFatPercentage?: number;
  leanMass?: number;
  fatMass?: number;
  boneMineralDensity?: number;
  visceralFat?: number;
  regions?: {
    trunk?: { lean: number; fat: number };
    arms?: { lean: number; fat: number };
    legs?: { lean: number; fat: number };
  };
  summary?: string;
  insights?: string[];
  healthMarkers?: {
    bmiCategory?: string;
    visceralFatRating?: string;
    boneDensityStatus?: string;
  };
  recommendations?: string[];
  metadata?: {
    scanLocation?: string;
    scannerModel?: string;
    technician?: string;
    notes?: string;
  };
}

/**
 * Load and parse the Dexa scan prompt
 */
async function loadPrompt(): Promise<any> {
  try {
    const promptContent = await fs.readFile(PARSE_DEXA_SCAN_PROMPT_PATH, 'utf8');
    return yaml.parse(promptContent);
  } catch (error) {
    console.error('Failed to load prompt:', error);
    throw new Error('Failed to load AI prompt configuration');
  }
}

/**
 * Parse Dexa scan file using AI vision/text analysis
 */
async function parseDexaScan(fileBuffer: Buffer, contentType: string): Promise<DexaScanData> {
  const prompt = await loadPrompt();

  // Extract model name (remove provider prefix if present)
  const modelName = prompt.model?.includes('/')
    ? prompt.model.split('/')[1]
    : prompt.model || 'gpt-4o';

  const systemMessage = prompt.messages.find((m: any) => m.role === 'system')?.content;
  const userMessage = prompt.messages.find((m: any) => m.role === 'user')?.content;

  // Prepare the message content based on file type
  let messageContent: any[];

  if (contentType === 'application/pdf' || contentType.startsWith('image/')) {
    // For images and PDFs, use vision API
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = contentType === 'application/pdf'
      ? `data:application/pdf;base64,${base64Data}`
      : `data:${contentType};base64,${base64Data}`;

    messageContent = [
      {
        type: 'text',
        text: userMessage,
      },
      {
        type: 'image_url',
        image_url: {
          url: dataUrl,
        },
      },
    ];
  } else {
    // Fallback to text analysis
    const textContent = fileBuffer.toString('utf8');
    messageContent = [
      {
        type: 'text',
        text: `${userMessage}\n\nScan Data:\n${textContent}`,
      },
    ];
  }

  // Call OpenAI API with vision support
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
        { role: 'user', content: messageContent },
      ],
      temperature: prompt.modelParameters?.temperature || 0.2,
      max_tokens: prompt.modelParameters?.max_tokens || 3000,
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
    throw new Error('Failed to parse AI-extracted scan data');
  }
}

/**
 * Save scan data to Firestore
 */
async function saveScanData(
  userId: string,
  fileName: string,
  storagePath: string,
  scanData: DexaScanData
): Promise<string> {
  const db = admin.firestore();
  const scanId = crypto.randomUUID();
  const docRef = db.collection(`users/${userId}/dexaScans`).doc(scanId);

  // Normalize weight to lbs if in kg
  let weight = scanData.weight;
  if (weight && scanData.weightUnit === 'kg') {
    weight = weight * 2.20462; // Convert kg to lbs
  }

  await docRef.set({
    id: scanId,
    fileName,
    storagePath,
    scanDate: scanData.scanDate || new Date().toISOString(),
    weight,
    bodyFatPercentage: scanData.bodyFatPercentage,
    leanMass: scanData.leanMass,
    fatMass: scanData.fatMass,
    boneMineralDensity: scanData.boneMineralDensity,
    visceralFat: scanData.visceralFat,
    regions: scanData.regions,
    aiSummary: scanData.summary,
    aiInsights: scanData.insights,
    healthMarkers: scanData.healthMarkers,
    recommendations: scanData.recommendations,
    metadata: scanData.metadata,
    createdAt: admin.firestore.Timestamp.now().toDate().toISOString(),
  });

  return scanId;
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
  const statusRef = db.collection(`users/${userId}/dexaScanProcessingStatus`).doc(fileName);

  await statusRef.set(status, { merge: true });
}

/**
 * Cloud Storage trigger for Dexa scan file uploads
 * Automatically processes Dexa scan files when uploaded to users/{userId}/dexaScans/
 */
export const onDexaScanUpload = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  // Only process Dexa scan files in the dexaScans directory
  if (!filePath || !filePath.includes('/dexaScans/')) {
    console.log(`Skipping non-Dexa scan file: ${filePath}`);
    return;
  }

  // Accept PDF and image files
  if (
    !contentType ||
    (contentType !== 'application/pdf' && !contentType.startsWith('image/'))
  ) {
    console.log(`Skipping unsupported file type: ${contentType}`);
    return;
  }

  // Extract userId from path: users/{userId}/dexaScans/{filename}
  const pathParts = filePath.split('/');
  if (pathParts.length < 4 || pathParts[0] !== 'users') {
    console.log(`Invalid path format: ${filePath}`);
    return;
  }

  const userId = pathParts[1];
  const fileName = pathParts[pathParts.length - 1];

  console.log(`Processing Dexa scan upload for user ${userId}: ${fileName}`);

  try {
    // Update status to processing
    await updateProcessingStatus(userId, fileName, {
      status: 'processing',
      fileName,
      storagePath: filePath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Download file from storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    const [fileBuffer] = await file.download();

    console.log(`Downloaded file: ${fileName} (${fileBuffer.length} bytes)`);

    // Parse scan with AI
    const scanData = await parseDexaScan(fileBuffer, contentType);
    console.log('Successfully parsed Dexa scan data');

    // Save to Firestore
    const scanId = await saveScanData(userId, fileName, filePath, scanData);

    console.log(`Successfully saved scan data with ID: ${scanId}`);

    // Update status to completed
    await updateProcessingStatus(userId, fileName, {
      status: 'completed',
      fileName,
      storagePath: filePath,
      scanId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error processing Dexa scan:', error);

    // Update status to error
    await updateProcessingStatus(userId, fileName, {
      status: 'error',
      fileName,
      storagePath: filePath,
      error: error.message || 'Unknown error',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
});
