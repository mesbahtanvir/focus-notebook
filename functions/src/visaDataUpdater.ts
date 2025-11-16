/**
 * Cloud Functions for Visa Data Updates
 * Automatically updates visa requirements data using OpenAI
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { logger } from 'firebase-functions/v2';

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

// Comprehensive country list
const COUNTRIES: Country[] = [
  // Africa
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', region: 'Africa' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'Africa' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', region: 'Africa' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'Africa' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', region: 'Africa' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'Africa' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', region: 'Africa' },

  // Asia
  { code: 'CN', name: 'China', flag: '🇨🇳', region: 'Asia' },
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', region: 'Asia' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', region: 'Asia' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', region: 'Asia' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'Asia' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', region: 'Asia' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', region: 'Asia' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'Asia' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', region: 'Asia' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', region: 'Asia' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'Asia' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', region: 'Asia' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Asia' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'Asia' },

  // Europe
  { code: 'AT', name: 'Austria', flag: '🇦🇹', region: 'Europe' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', region: 'Europe' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'Europe' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'Europe' },
  { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', region: 'Europe' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', region: 'Europe' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', region: 'Europe' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', region: 'Europe' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'Europe' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'Europe' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'Europe' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'Europe' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', region: 'Europe' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },

  // North America
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'North America' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', region: 'North America' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', region: 'North America' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', region: 'North America' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'North America' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', region: 'North America' },
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'North America' },

  // South America
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'South America' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', region: 'South America' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'South America' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', region: 'South America' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', region: 'South America' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', region: 'South America' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', region: 'South America' },

  // Oceania
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯', region: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania' },
];

// Top priority countries for more frequent updates
const PRIORITY_COUNTRIES = [
  'US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP', 'CN', 'IN', 'BR',
  'IT', 'ES', 'KR', 'MX', 'SG', 'AE', 'NL', 'CH', 'SE', 'NO',
];

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

  // Process destinations in batches
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);

    const prompt = `You are a visa requirements expert. Provide accurate visa requirements for citizens of ${sourceCountry.name} (${sourceCountry.code}) traveling to the following countries.

For each destination, provide:
1. Visa type: "visa-free", "e-visa", "visa-on-arrival", or "visa-required"
2. Duration allowed (e.g., "90 days", "30 days", "N/A" for visa-required)
3. Brief description (25-35 words highlighting key attractions, culture, or features)
4. Region (use: "Africa", "Asia", "Europe", "North America", "South America", or "Oceania")
5. Basic requirements (e.g., ["Valid passport", "Return ticket"])

Destinations: ${batch.map(c => `${c.name} (${c.code})`).join(', ')}

IMPORTANT: Respond ONLY with valid JSON. No additional text.

JSON format:
{
  "destinations": [
    {
      "countryCode": "JP",
      "countryName": "Japan",
      "visaType": "visa-free",
      "duration": "90 days",
      "description": "Island nation known for cherry blossoms, ancient temples, cutting-edge technology, anime culture, hot springs, and world-class cuisine including sushi and ramen.",
      "region": "Asia",
      "requirements": ["Valid passport with 6 months validity", "Return or onward ticket", "Proof of sufficient funds"],
      "notes": "For tourism, business, or visiting friends/family"
    }
  ]
}`;

    try {
      logger.info(`Querying OpenAI for batch ${i / batchSize + 1} (${batch.length} destinations)`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a visa requirements expert. Always respond with valid JSON only. Be accurate and concise.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
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

    // Incremental update strategy: Update 1/4 of countries each week
    // This means full refresh every 4 weeks (28 days)
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4;
    const countriesPerWeek = Math.ceil(COUNTRIES.length / 4);
    const startIndex = weekNumber * countriesPerWeek;
    const endIndex = Math.min(startIndex + countriesPerWeek, COUNTRIES.length);

    const countriesToUpdate = COUNTRIES.slice(startIndex, endIndex);

    logger.info(`Week ${weekNumber + 1}/4: Updating ${countriesToUpdate.length} countries (${startIndex}-${endIndex})`);

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

  const db = getFirestore();

  try {
    logger.info('Starting manual visa data update', { sourceCountries, fullUpdate });

    let countriesToProcess: Country[];

    if (fullUpdate) {
      // Full update of all countries
      countriesToProcess = COUNTRIES;
    } else if (sourceCountries && sourceCountries.length > 0) {
      // Update specific countries
      countriesToProcess = COUNTRIES.filter(c => sourceCountries.includes(c.code));
    } else {
      // Default: Update priority countries only
      countriesToProcess = COUNTRIES.filter(c => PRIORITY_COUNTRIES.includes(c.code));
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
