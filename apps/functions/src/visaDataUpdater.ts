/**
 * Cloud Functions for Visa Data Updates
 * Automatically updates visa requirements data using OpenAI
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { logger } from 'firebase-functions/v2';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Country data structure
interface Country {
  code: string;
  name: string;
  flag: string;
  region: string;
}

// OpenAI response structure
interface OpenAIVisaResponse {
  destinations: Array<{
    countryCode: string;
    countryName: string;
    visaType: 'visa-free' | 'e-visa' | 'visa-on-arrival' | 'visa-required';
    duration: string;
    description: string;
    region: string;
    requirements: string[];
    notes?: string;
  }>;
}

// Comprehensive country list (temporarily limited to a small subset to reduce cost)
const COUNTRIES: Country[] = [
  { code: 'BD', name: 'Bangladesh', flag: '\uD83C\uDDE7\uD83C\uDDE9', region: 'Asia' },
  { code: 'CA', name: 'Canada', flag: '\uD83C\uDDE8\uD83C\uDDE6', region: 'North America' },
  { code: 'US', name: 'United States', flag: '\uD83C\uDDFA\uD83C\uDDF8', region: 'North America' },
];

const SOURCE_COUNTRY_CODES = ['BD'];

/**
 * Sleep utility for rate limiting
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initialize OpenAI client
 */
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
};

const PROMPT_FILE_NAME = 'enhance-visa-requirements.prompt.yml';

interface PromptConfig {
  name: string;
  model: string;
  modelParameters: {
    temperature: number;
    max_tokens: number;
  };
  messages: Array<{
    role: string;
    content: string;
  }>;
}

function resolvePromptPath(): string {
  const candidatePaths = [
    path.join(__dirname, '../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../prompts', PROMPT_FILE_NAME),
    path.join(__dirname, '../../../../functions/prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'functions', 'prompts', PROMPT_FILE_NAME),
    path.join(process.cwd(), 'prompts', PROMPT_FILE_NAME),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Prompt file "${PROMPT_FILE_NAME}" not found. Checked: ${candidatePaths.join(', ')}`
  );
}

function loadPromptConfig(): PromptConfig {
  const promptPath = resolvePromptPath();
  const fileContents = fs.readFileSync(promptPath, 'utf8');
  return yaml.parse(fileContents);
}

/**
 * Process a batch of destination countries for a source country
 */
async function processCountryBatch(
  sourceCountry: Country,
  destinations: Country[],
  batchSize: number = 20
): Promise<void> {
  const db = getFirestore();
  const openai = getOpenAIClient();

  logger.info(`Processing ${sourceCountry.name} (${sourceCountry.code})`);

  const promptConfig = loadPromptConfig();

  // Process destinations in batches
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);

    // Build destination list
    const destinationsText = batch.map(c => `${c.name} (${c.code})`).join(', ');

    // Build messages from prompt config
    const messages = promptConfig.messages.map(msg => ({
      role: msg.role,
      content: msg.content
        .replace(/\{\{sourceCountryName\}\}/g, sourceCountry.name)
        .replace(/\{\{sourceCountryCode\}\}/g, sourceCountry.code)
        .replace(/\{\{destinations\}\}/g, destinationsText),
    }));

    try {
      logger.info(`Querying OpenAI for batch ${i / batchSize + 1} (${batch.length} destinations)`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        response_format: { type: 'json_object' },
        temperature: promptConfig.modelParameters.temperature,
        max_tokens: promptConfig.modelParameters.max_tokens,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const data = JSON.parse(content) as OpenAIVisaResponse;

      // Save to Firestore
      const batchWrite = db.batch();
      let savedCount = 0;

      for (const dest of data.destinations) {
        const docId = `${sourceCountry.code}_${dest.countryCode}`;
        const docRef = db.collection('visa_requirements').doc(docId);

        batchWrite.set(docRef, {
          id: docId,
          sourceCountry: {
            code: sourceCountry.code,
            name: sourceCountry.name,
            flag: sourceCountry.flag,
          },
          destinationCountry: {
            code: dest.countryCode,
            name: dest.countryName,
            flag: batch.find(c => c.code === dest.countryCode)?.flag || '',
          },
          visaType: dest.visaType,
          duration: dest.duration,
          description: dest.description,
          region: dest.region,
          requirements: dest.requirements || [],
          notes: dest.notes || '',
          lastUpdated: Timestamp.now().toDate().toISOString(),
          confidence: 'high',
          source: 'openai',
        });

        savedCount++;
      }

      await batchWrite.commit();
      logger.info(`Saved ${savedCount} visa requirements for ${sourceCountry.name}`);

      // Rate limiting: 1 second delay between API calls
      if (i + batchSize < destinations.length) {
        await sleep(1000);
      }

    } catch (error) {
      logger.error(`Error processing batch for ${sourceCountry.name}:`, error);

      // Save error to Firestore for monitoring
      await db.collection('visa_update_errors').add({
        sourceCountry: sourceCountry.code,
        batchNumber: i / batchSize + 1,
        destinations: batch.map(c => c.code),
        error: error instanceof Error ? error.message : String(error),
        timestamp: Timestamp.now(),
      });
    }
  }
}

/**
 * Scheduled function: Update visa data weekly
 * Runs every Sunday at midnight UTC
 */
export const updateVisaDataWeekly = onSchedule({
  schedule: '0 0 * * 0', // Every Sunday at midnight
  timeZone: 'UTC',
  memory: '1GiB',
  timeoutSeconds: 540, // 9 minutes
  maxInstances: 1,
}, async () => {
  const db = getFirestore();

  try {
    logger.info('Starting weekly visa data update');

    // Update metadata
    await db.collection('visa_data').doc('metadata').set({
      updateStatus: 'in-progress',
      lastUpdateStarted: Timestamp.now(),
    }, { merge: true });

    // Incremental update strategy (temporarily restricted to specific source countries)
    const weekNumber = 0;

    const countriesToUpdate = COUNTRIES.filter(c =>
      SOURCE_COUNTRY_CODES.includes(c.code)
    );

    logger.info(`Restricted update: Updating ${countriesToUpdate.length} source countries`);

    let processedCount = 0;
    let errorCount = 0;

    // Process each source country
    for (const sourceCountry of countriesToUpdate) {
      try {
        await processCountryBatch(sourceCountry, COUNTRIES, 20);
        processedCount++;
      } catch (error) {
        logger.error(`Failed to process ${sourceCountry.name}:`, error);
        errorCount++;
      }
    }

    // Update metadata with results
    await db.collection('visa_data').doc('metadata').set({
      updateStatus: 'completed',
      lastFullUpdate: Timestamp.now(),
      totalCountries: COUNTRIES.length,
      lastIncrementalUpdate: {
        weekNumber: weekNumber + 1,
        countriesProcessed: processedCount,
        countriesUpdated: countriesToUpdate.map(c => c.code),
        errorCount,
        timestamp: Timestamp.now(),
      },
    }, { merge: true });

    logger.info(`Visa data update completed: ${processedCount} countries processed, ${errorCount} errors`);

  } catch (error) {
    logger.error('Fatal error during visa data update:', error);

    await db.collection('visa_data').doc('metadata').set({
      updateStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      lastErrorTime: Timestamp.now(),
    }, { merge: true });

    throw error;
  }
});

/**
 * Manual trigger function for testing and priority updates
 * Callable function that can be triggered manually
 */
export const updateVisaDataManual = onCall({
  memory: '1GiB',
  timeoutSeconds: 540,
}, async (request) => {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { sourceCountries, fullUpdate } = request.data as {
    sourceCountries?: string[];
    fullUpdate?: boolean;
  };

  try {
    logger.info('Starting manual visa data update', { sourceCountries, fullUpdate });

    let countriesToProcess: Country[];

    if (fullUpdate) {
      // Restricted full update: only configured source countries
      countriesToProcess = COUNTRIES.filter(c =>
        SOURCE_COUNTRY_CODES.includes(c.code)
      );
    } else if (sourceCountries && sourceCountries.length > 0) {
      // Update specific countries, but restricted to configured source countries
      countriesToProcess = COUNTRIES.filter(
        c => sourceCountries.includes(c.code) && SOURCE_COUNTRY_CODES.includes(c.code)
      );
    } else {
      // Default: update configured source countries only
      countriesToProcess = COUNTRIES.filter(c =>
        SOURCE_COUNTRY_CODES.includes(c.code)
      );
    }

    logger.info(`Processing ${countriesToProcess.length} countries`);

    let processedCount = 0;
    let errorCount = 0;

    for (const sourceCountry of countriesToProcess) {
      try {
        await processCountryBatch(sourceCountry, COUNTRIES, 20);
        processedCount++;
      } catch (error) {
        logger.error(`Failed to process ${sourceCountry.name}:`, error);
        errorCount++;
      }
    }

    return {
      success: true,
      processedCount,
      errorCount,
      countries: countriesToProcess.map(c => c.code),
    };

  } catch (error) {
    logger.error('Error in manual visa data update:', error);
    throw new HttpsError('internal', 'Failed to update visa data');
  }
});

/**
 * Get visa requirements for a specific nationality
 * Callable function for frontend
 */
export const getVisaRequirements = onCall(async (request) => {
  const { nationality } = request.data as { nationality: string };

  if (!nationality) {
    throw new HttpsError('invalid-argument', 'Nationality is required');
  }

  const db = getFirestore();

  try {
    // Query all visa requirements for this source country
    const snapshot = await db
      .collection('visa_requirements')
      .where('sourceCountry.code', '==', nationality)
      .get();

    const requirements = snapshot.docs.map(doc => doc.data());

    return {
      success: true,
      count: requirements.length,
      requirements,
    };

  } catch (error) {
    logger.error('Error fetching visa requirements:', error);
    throw new HttpsError('internal', 'Failed to fetch visa requirements');
  }
});
