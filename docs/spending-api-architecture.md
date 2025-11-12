# Spending API Architecture - Why IAM Permissions Are Required

## The 401 Unauthorized Issue Explained

The spending API is experiencing 401 Unauthorized errors that **don't affect other API routes** in the application. This document explains why.

## Architecture Comparison

### Spending API (Requires IAM Permissions)

```
Client Browser
    ↓ [Firebase ID Token]
Next.js API Route (/api/spending/*)
    ↓ [HTTP POST with Bearer token]
Firebase Cloud Functions (via cloudfunctions.net)
    ↓ [Validates token, processes request]
Plaid API / Firestore
```

**Key characteristic**: Makes **direct HTTP calls** to Firebase Cloud Functions

Files involved:
- `src/app/api/spending/[action]/route.ts` - Proxies to Cloud Functions
- `src/app/api/spending/_lib/callFirebaseFunction.ts` - HTTP client
- `functions/src/plaidFunctions.ts` - Cloud Functions (createLinkToken, etc.)

### Other API Routes (No IAM Permissions Needed)

#### Chat & Process Thought APIs
```
Client Browser
    ↓ [Firebase ID Token]
Next.js API Route (/api/chat, /api/process-thought)
    ↓ [Validates token with Firebase Admin SDK]
    ↓ [Processes request server-side]
Response
```

**Key characteristic**: Uses **Firebase Admin SDK** locally, no Cloud Function HTTP calls

Files involved:
- `src/app/api/chat/route.ts`
- `src/app/api/process-thought/route.ts`
- `src/lib/server/verifyAiRequest.ts` - Local token validation

#### Stock Price API
```
Client Browser
    ↓ [No auth required]
Next.js API Route (/api/stock-price)
    ↓ [Calls external API directly]
Alpha Vantage API
```

**Key characteristic**: Calls **external APIs** directly, no Firebase involvement

Files involved:
- `src/app/api/stock-price/route.ts`

## Why IAM Permissions Matter

### The Problem

Firebase Callable Functions (`functions.https.onCall`) have two ways to be invoked:

1. **Via Firebase SDK** (firebase-functions npm package)
   - Firebase handles IAM automatically
   - No manual permissions needed
   - Auth context populated automatically

2. **Via Direct HTTP** (fetch to cloudfunctions.net)
   - ⚠️ Requires manual IAM permissions
   - Must grant `allUsers` the Cloud Run Invoker role
   - Auth token must be in Authorization header

### Why Spending API Uses Direct HTTP

The spending API uses direct HTTP calls because:

1. **Server-side execution**: Next.js API routes run on the server (Vercel), not in the browser
2. **Environment isolation**: Server doesn't have access to Firebase client SDK
3. **Security**: Keeps Plaid credentials server-side in Cloud Functions
4. **Token forwarding**: Proxies the user's auth token to Cloud Functions

### Why Other APIs Don't Have This Issue

- **Chat/Process Thought**: Use Firebase Admin SDK locally - no HTTP calls to Cloud Functions
- **Stock Price**: No Firebase involvement at all
- **Other routes**: Either use Admin SDK or call external APIs directly

## The Solution

Grant public IAM permissions to **all callable functions** in the spending API:

```bash
./scripts/make-functions-public.sh
```

Or manually via Google Cloud Console for each function:
- createLinkToken
- createRelinkToken
- exchangePublicToken
- markRelinking
- triggerSync
- processCSVTransactions
- linkTransactionToTrip
- dismissTransactionTripSuggestion
- deleteCSVStatement

### Is This Safe?

**Yes!** Granting `allUsers` the Cloud Run Invoker role is safe because:

1. ✅ **Authentication still enforced**: Functions check `context.auth` and reject unauthenticated requests
2. ✅ **Authorization still required**: User must have valid Firebase ID token
3. ✅ **No data exposure**: IAM permission only allows HTTP request to reach the function
4. ✅ **Firebase best practice**: Recommended approach for HTTP-invoked callable functions

### What IAM Permission Does

**IAM Permission**: "Can this HTTP request reach the Cloud Function?"
**Firebase Auth**: "Is the user authenticated and authorized?"

Both layers work together:
- IAM allows the request through the door
- Firebase Auth validates who's making the request

## Alternative Architecture (Not Recommended)

You could avoid the IAM requirement by:

1. **Using Firebase SDK directly from client**
   ```typescript
   // In browser
   import { getFunctions, httpsCallable } from 'firebase/functions';
   const functions = getFunctions();
   const createLinkToken = httpsCallable(functions, 'createLinkToken');
   ```

   **Downside**: Less control over request/response, harder to add middleware

2. **Moving logic to Next.js API routes**
   ```typescript
   // In Next.js route
   import { PlaidApi } from 'plaid';
   // Call Plaid directly from Next.js
   ```

   **Downside**: Duplicates logic, harder to maintain, need to manage Plaid SDK in two places

## Current Architecture Benefits

The current architecture (Next.js → Cloud Functions) provides:

- ✅ **Centralized business logic**: All Plaid logic in one place (Cloud Functions)
- ✅ **Security**: Credentials only in Cloud Functions, not in Next.js
- ✅ **Reusability**: Same functions can be called from web, mobile, webhooks
- ✅ **Scalability**: Cloud Functions auto-scale independently
- ✅ **Logging**: Centralized logs in Cloud Functions console

The IAM permission requirement is a small trade-off for these benefits.

## Summary

**The spending API is the only API that requires IAM permissions because it's the only one that makes direct HTTP calls to Firebase Cloud Functions.**

Other APIs either:
- Validate tokens locally with Firebase Admin SDK (chat, process-thought)
- Call external APIs directly (stock-price)
- Handle logic entirely in Next.js routes

This architectural difference is intentional and provides benefits, but requires the one-time IAM permission setup.
