# Fix Cloud Function 401 Unauthorized Error

## Root Cause

The 401 Unauthorized error occurs because Firebase Callable Functions, when invoked via direct HTTP (not the Firebase SDK), require **public IAM permissions** to be accessible.

## Solution: Grant Cloud Run Invoker Permission

You need to make your callable functions publicly invocable by granting the `allUsers` role the Cloud Run Invoker permission.

### Option 1: Using Google Cloud Console (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `focus-yourthoughts-ca`
3. Navigate to **Cloud Functions** (or **Cloud Run** if using 2nd gen)
4. Find the function: `createLinkToken`
5. Click on the function name
6. Go to the **Permissions** tab
7. Click **Grant Access**
8. Add principal: `allUsers`
9. Select role: **Cloud Run Invoker** (or **Cloud Functions Invoker** for 1st gen)
10. Click **Save**

Repeat for all callable functions:
- `createLinkToken`
- `createRelinkToken`
- `exchangePublicToken`
- `markRelinking`
- `triggerSync`
- `processCSVTransactions`
- `linkTransactionToTrip`
- `dismissTransactionTripSuggestion`
- `deleteCSVStatement`

### Option 2: Using gcloud CLI

Run these commands for each function:

```bash
# For 1st generation functions
gcloud functions add-iam-policy-binding createLinkToken \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=focus-yourthoughts-ca

# For 2nd generation functions (Cloud Run)
gcloud run services add-iam-policy-binding createLinkToken \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/run.invoker \
  --project=focus-yourthoughts-ca
```

### Option 3: Automated Script

Create a file `scripts/make-functions-public.sh`:

```bash
#!/bin/bash

PROJECT_ID="focus-yourthoughts-ca"
REGION="us-central1"
FUNCTIONS=(
  "createLinkToken"
  "createRelinkToken"
  "exchangePublicToken"
  "markRelinking"
  "triggerSync"
  "processCSVTransactions"
  "linkTransactionToTrip"
  "dismissTransactionTripSuggestion"
  "deleteCSVStatement"
)

for FUNCTION in "${FUNCTIONS[@]}"; do
  echo "Making $FUNCTION publicly invocable..."
  gcloud functions add-iam-policy-binding $FUNCTION \
    --region=$REGION \
    --member=allUsers \
    --role=roles/cloudfunctions.invoker \
    --project=$PROJECT_ID 2>&1

  # Also try Cloud Run (for v2 functions)
  gcloud run services add-iam-policy-binding $FUNCTION \
    --region=$REGION \
    --member=allUsers \
    --role=roles/run.invoker \
    --project=$PROJECT_ID 2>&1
done

echo "Done! All functions should now be publicly invocable."
```

Make it executable and run:
```bash
chmod +x scripts/make-functions-public.sh
./scripts/make-functions-public.sh
```

## Important Notes

### Security Considerations

- **This is safe**: Granting `allUsers` the invoker role does NOT bypass authentication
- Your function still checks `context.auth` and rejects unauthenticated requests
- The IAM permission only allows the HTTP request to reach your function
- Your Firebase Auth token is still validated by the function

### Why This is Needed

When you call a Callable Function:
1. **Via Firebase SDK**: Firebase handles IAM automatically
2. **Via Direct HTTP**: You need to grant IAM permissions manually

Since we're proxying through Next.js API routes (direct HTTP), we need the public IAM permission.

## Verify the Fix

After granting permissions, test the function:

```bash
# Get your Firebase ID token from the browser console
# (Run: await firebase.auth().currentUser.getIdToken())

curl -X POST \
  https://us-central1-focus-yourthoughts-ca.cloudfunctions.net/createLinkToken \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN_HERE" \
  -d '{"data":{"platform":"web"}}'
```

If it works, you'll get a link token response. If it still returns 401, the permissions weren't applied correctly.

## Alternative: Use Firebase SDK Directly

If you don't want to make functions publicly invocable, you can use the Firebase Functions SDK directly from the client instead of proxying through Next.js:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createLinkToken = httpsCallable(functions, 'createLinkToken');
const result = await createLinkToken({ platform: 'web' });
```

This approach doesn't require public IAM permissions because Firebase handles authentication differently.
