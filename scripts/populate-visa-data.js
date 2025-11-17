/**
 * Script to populate initial visa data
 *
 * This script calls the Firebase cloud function to generate visa requirements
 * for all countries using OpenAI.
 *
 * Prerequisites:
 * 1. Firebase functions deployed
 * 2. OpenAI API key configured
 * 3. Firebase Admin SDK credentials
 *
 * Usage:
 *   node scripts/populate-visa-data.js [--priority|--full]
 *
 * Options:
 *   --priority: Update only priority countries (faster, ~10 countries)
 *   --full: Full update of all countries (slower, ~80 countries)
 *   (default): Priority countries
 */

const https = require('https');

// Configuration
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';
const FIREBASE_REGION = process.env.FIREBASE_REGION || 'us-central1';

// Parse command line arguments
const args = process.argv.slice(2);
const fullUpdate = args.includes('--full');
const priorityUpdate = args.includes('--priority') || args.length === 0;

console.log('🚀 Visa Data Population Script');
console.log('================================\n');

if (!FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID === 'your-project-id') {
  console.error('❌ Error: FIREBASE_PROJECT_ID not set');
  console.error('Set it as an environment variable or update the script');
  console.error('Example: FIREBASE_PROJECT_ID=my-project node scripts/populate-visa-data.js');
  process.exit(1);
}

console.log(`📍 Project: ${FIREBASE_PROJECT_ID}`);
console.log(`🌎 Region: ${FIREBASE_REGION}`);
console.log(`📦 Update type: ${fullUpdate ? 'Full' : 'Priority'}\n`);

async function populateData() {
  try {
    console.log('⏳ Starting data population...');
    console.log('This may take 10-15 minutes for full update...\n');

    // Note: This is a placeholder - you'll need to use Firebase Admin SDK
    // or call the function through Firebase Authentication

    console.log('⚠️  Important: This script requires proper authentication.');
    console.log('\nTo populate data, please use one of these methods:\n');

    console.log('1️⃣  Using Firebase Console:');
    console.log('   - Go to Firebase Console → Functions');
    console.log('   - Find "updateVisaDataManual"');
    console.log('   - Click "Run" and provide: { "fullUpdate": true }');

    console.log('\n2️⃣  Using Firebase CLI:');
    console.log('   firebase functions:shell');
    console.log('   > updateVisaDataManual({ fullUpdate: true })');

    console.log('\n3️⃣  Using curl (requires auth token):');
    console.log(`   curl -X POST \\`);
    console.log(`     https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/updateVisaDataManual \\`);
    console.log(`     -H "Authorization: Bearer YOUR_ID_TOKEN" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"data":{"fullUpdate":true}}'`);

    console.log('\n4️⃣  Using the app (authenticated user):');
    console.log('   - Create an admin page that calls the function');
    console.log('   - Use Firebase callable functions from the frontend');

    console.log('\n📝 After running, check:');
    console.log('   - Firestore → visa_requirements collection');
    console.log('   - Firestore → visa_data/metadata document');
    console.log('   - Functions logs for progress');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

populateData();
