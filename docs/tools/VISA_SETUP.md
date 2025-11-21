# Visa Destination Finder - Setup Guide

This guide will help you populate the visa database for the Visa Destination Finder feature.

## Prerequisites

1. Firebase project set up
2. OpenAI API key
3. Firebase CLI installed (`npm install -g firebase-tools`)

## Step 1: Configure OpenAI API Key

Set the OpenAI API key in Firebase configuration:

```bash
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY_HERE"
```

Or set it as an environment variable in `.env` file in the functions directory:

```bash
# functions/.env
OPENAI_API_KEY=sk-your-api-key-here
```

## Step 2: Deploy Cloud Functions

Deploy the visa data updater functions:

```bash
cd functions
npm run build
firebase deploy --only functions:updateVisaDataWeekly,functions:updateVisaDataManual,functions:getVisaRequirements
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

## Step 3: Populate Initial Data

You have several options to populate the initial visa data:

### Option A: Call the Manual Trigger Function (Recommended)

Use the Firebase console or a script to call the `updateVisaDataManual` function with a full update:

```javascript
// Using Firebase Admin SDK or callable function
const result = await updateVisaDataManual({
  fullUpdate: true
});
```

### Option B: Use Firebase CLI

```bash
firebase functions:shell
```

Then in the shell:

```javascript
updateVisaDataManual({ fullUpdate: true })
```

### Option C: Create a Simple Node Script

Create a file `scripts/populate-visa-data.js`:

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const functions = require('../functions/lib/functions/src/visaDataUpdater');

async function populateData() {
  try {
    console.log('Starting visa data population...');

    // Call the function directly
    const request = {
      auth: { uid: 'admin' }, // Mock auth for admin
      data: { fullUpdate: true }
    };

    const result = await functions.updateVisaDataManual(request);
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

populateData();
```

Run it:

```bash
node scripts/populate-visa-data.js
```

## Step 4: Wait for Data Generation

The initial data population will take some time:

- **Full update**: Processes all ~80 countries in the COUNTRIES list
- **Batch processing**: 20 destinations per API call
- **Rate limiting**: 1 second delay between calls
- **Estimated time**: 10-15 minutes for full population
- **Estimated cost**: $2-5 for initial full update

Progress can be monitored in:
- Firebase Console → Functions → Logs
- Firestore Console → `visa_requirements` collection

## Step 5: Verify Data

Check that data was populated:

1. Go to Firebase Console → Firestore Database
2. Look for the `visa_requirements` collection
3. You should see documents with IDs like `US_JP`, `BD_CA`, etc.
4. Check `visa_data/metadata` for update status

## Step 6: Test the Feature

1. Go to your app at `/tools/travel/visa-finder`
2. Select a nationality (e.g., United States, Bangladesh)
3. Click "Find Destinations"
4. You should see a map and list of destinations

## Ongoing Maintenance

The `updateVisaDataWeekly` function will automatically run every Sunday at midnight UTC to keep data fresh using an incremental update strategy (1/4 of countries per week).

## Troubleshooting

### Error: "No visa data available yet"

- Check that the cloud function ran successfully
- Verify data exists in Firestore `visa_requirements` collection
- Check function logs for errors

### Error: "OPENAI_API_KEY is not configured"

- Ensure you set the API key using `firebase functions:config:set`
- Redeploy functions after setting the key

### Partial Data

- The COUNTRIES list in `visaDataUpdater.ts` contains ~80 major countries
- To add more countries, edit the COUNTRIES array in `functions/src/visaDataUpdater.ts`
- The full list of 195 countries is in `src/data/countries.ts` but not all are in the cloud function

### High Costs

- Adjust the batch size in `processCountryBatch()` to process fewer destinations per call
- Use the incremental update strategy instead of full updates
- Only update priority countries using `sourceCountries` parameter

## Manual Firestore Security Rules

Add these security rules to allow read access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Visa requirements - read-only for all users
    match /visa_requirements/{document=**} {
      allow read: if true;
      allow write: if false; // Only cloud functions can write
    }

    match /visa_data/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Cost Estimation

- **GPT-4o-mini** pricing (approximate):
  - Input: $0.15 per 1M tokens
  - Output: $0.60 per 1M tokens
- **Full update** (80 countries × 80 destinations):
  - ~1,600 API calls
  - ~$2-5 per full update
- **Weekly incremental** (20 countries × 80 destinations):
  - ~400 API calls
  - ~$0.50-1 per weekly update
- **Monthly cost**: ~$2-4 for ongoing maintenance

## Support

For issues or questions, check:
- Function logs in Firebase Console
- Firestore data in Firebase Console
- This documentation

---

**Note**: The initial setup requires one-time data population. After that, the scheduled function will keep data updated automatically.
