#!/bin/bash

# Script to make Firebase Callable Functions publicly invocable
# This fixes the 401 Unauthorized error when calling functions via HTTP

set -e

PROJECT_ID="focus-yourthoughts-ca"
REGION="us-central1"

# List all callable functions that need to be made public
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
  "processThought"
)

echo "==========================================="
echo "Making Cloud Functions publicly invocable"
echo "==========================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Functions: ${#FUNCTIONS[@]}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI is not installed"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "ERROR: Not authenticated with gcloud"
    echo "Please run: gcloud auth login"
    exit 1
fi

echo "Granting allUsers the invoker role for each function..."
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

for FUNCTION in "${FUNCTIONS[@]}"; do
  echo "Processing: $FUNCTION"

  # Try 1st generation Cloud Functions
  if gcloud functions add-iam-policy-binding "$FUNCTION" \
    --region="$REGION" \
    --member=allUsers \
    --role=roles/cloudfunctions.invoker \
    --project="$PROJECT_ID" 2>&1 | grep -q "Updated IAM policy"; then
    echo "  ✓ Successfully updated (1st gen)"
    ((SUCCESS_COUNT++))
  else
    # Try 2nd generation Cloud Run
    if gcloud run services add-iam-policy-binding "$FUNCTION" \
      --region="$REGION" \
      --member=allUsers \
      --role=roles/run.invoker \
      --platform=managed \
      --project="$PROJECT_ID" 2>&1 | grep -q "Updated IAM policy"; then
      echo "  ✓ Successfully updated (2nd gen / Cloud Run)"
      ((SUCCESS_COUNT++))
    else
      echo "  ✗ Failed to update (function may not exist or already has permission)"
      ((FAIL_COUNT++))
    fi
  fi
  echo ""
done

echo "==========================================="
echo "Summary"
echo "==========================================="
echo "Successfully updated: $SUCCESS_COUNT"
echo "Failed or skipped: $FAIL_COUNT"
echo ""

if [ $SUCCESS_COUNT -gt 0 ]; then
  echo "✓ Functions are now publicly invocable!"
  echo ""
  echo "NOTE: This is SAFE - your functions still require Firebase Authentication."
  echo "The IAM permission only allows HTTP requests to reach your function."
  echo "Your function's context.auth check still validates the user's identity."
else
  echo "⚠ No functions were updated. Please check:"
  echo "  1. Functions are deployed to the project"
  echo "  2. You have permission to modify IAM policies"
  echo "  3. The function names are correct"
fi

echo ""
echo "To verify, test a function with:"
echo "curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/createLinkToken \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_FIREBASE_ID_TOKEN' \\"
echo "  -d '{\"data\":{\"platform\":\"web\"}}'"
