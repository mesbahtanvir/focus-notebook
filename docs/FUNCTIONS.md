# Focus Notebook Cloud Functions

Firebase Cloud Functions for AI-powered thought processing.

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key-here
```

**Note:** Get a free Alpha Vantage API key at https://www.alphavantage.co/support/#api-key

### 3. Configure Production Environment Variables

For production deployment, configure environment variables in the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Functions** → **Configuration** (or **Build** → **Functions** → **Environment variables**)
4. Add the following environment variables:

#### Required Variables:

- `OPENAI_API_KEY` - Your OpenAI API key (e.g., `sk-your-actual-api-key-here`)
- `STRIPE_SECRET` - Your Stripe secret key (e.g., `sk_live_your-stripe-secret`)
- `STRIPE_PRICE_ID` - Your subscription price ID (e.g., `price_your-subscription-price-id`)
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret (e.g., `whsec_your-webhook-secret`)
- `STRIPE_PORTAL_CONFIG_ID` - Your Stripe portal config ID (e.g., `bpc_1SQbloDdrpmFOJwOXqZjXWc4`)

#### Optional Variables:

- `ALPHA_VANTAGE_API_KEY` - Your Alpha Vantage API key for stock prices
- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude-powered features
- `PLAID_CLIENT_ID` - Your Plaid client ID for bank integration
- `PLAID_SECRET` - Your Plaid secret
- `PLAID_ENV` - Plaid environment (`sandbox`, `development`, or `production`)
- `APP_BASE_URL` - Your application's base URL (e.g., `https://your-domain.com`)
- `ENCRYPTION_KEY` - Encryption key for sensitive data (optional, falls back to PLAID_SECRET)

**Note:** The Firebase Functions runtime automatically loads environment variables from the `.env` file during local development and from the Firebase Console configuration in production.

## Local Development

### Run Functions Locally

```bash
npm run serve
```

This starts the Firebase Functions Emulator.

### Test Functions

The emulator provides a local HTTP endpoint for testing:

```bash
# Test manual processing
curl -X POST http://localhost:5001/YOUR_PROJECT_ID/us-central1/manualProcessThought \
  -H "Content-Type: application/json" \
  -d '{"data": {"thoughtId": "test-thought-id"}}'
```

## Deployment

### Deploy All Functions

```bash
npm run deploy
```

### Deploy Specific Function

```bash
firebase deploy --only functions:processNewThought
```

## Cloud Functions

### 1. `processNewThought` (Firestore Trigger)

**Trigger:** Automatically runs when a new thought is created in `users/{userId}/thoughts/{thoughtId}`

**What it does:**
- Skips if thought is already processed
- Checks daily rate limit (50 per day per user)
- Processes thought with AI
- Increments daily counter

### 2. `manualProcessThought` (Callable)

**Trigger:** Called when user clicks "Process Now" button

**Parameters:**
```typescript
{
  thoughtId: string
}
```

**Returns:**
```typescript
{
  success: boolean,
  message: string
}
```

### 3. `reprocessThought` (Callable)

**Trigger:** Called when user clicks "Reprocess" button

**Parameters:**
```typescript
{
  thoughtId: string,
  revertFirst: boolean  // Whether to revert AI changes before reprocessing
}
```

**Returns:**
```typescript
{
  success: boolean,
  message: string
}
```

### 4. `revertThoughtProcessing` (Callable)

**Trigger:** Called when user clicks "Revert AI Changes" button

**Parameters:**
```typescript
{
  thoughtId: string
}
```

**Returns:**
```typescript
{
  success: boolean,
  message: string
}
```

### 5. `updateTrackedTickers` (Scheduled - Daily)

**Trigger:** Runs daily at midnight UTC

**What it does:**
- Scans all user portfolios for stock tickers
- Collects unique currencies used across portfolios
- Updates the tracked tickers document in Firestore

### 6. `refreshTrackedTickerPrices` (Scheduled - Daily)

**Trigger:** Runs daily at 12:05 AM UTC

**What it does:**
- Fetches latest prices for all tracked stock tickers from Alpha Vantage
- Respects free-tier rate limits (4 requests/minute)
- Updates latest prices and historical price data in Firestore
- Requires `ALPHA_VANTAGE_API_KEY` environment variable

### 7. `createStripeCheckoutSession` (Callable)

**Trigger:** Called when user initiates subscription upgrade

**Configuration:** Runs with `minInstances: 1` to stay warm and reduce user churn from cold starts

**Parameters:**
```typescript
{
  origin?: string  // Base URL for redirect URLs
}
```

**Returns:**
```typescript
{
  url: string  // Stripe Checkout session URL
}
```

### 8. `stripeWebhook` (HTTP Request)

**Trigger:** Stripe webhook events

**Handles:**
- `checkout.session.completed` - Initial subscription creation
- `customer.subscription.created` - Subscription activation
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Cancellations

## Architecture

### Processing Flow

1. **Get Context** - Fetch user's goals, projects, people, tasks, moods
2. **Call OpenAI** - Process thought with comprehensive prompt
3. **Process Actions** - Separate auto-apply (95%+) from suggestions (70-94%)
4. **Update Thought** - Apply changes and store suggestions
5. **Track History** - Log processing metadata

### Utilities

- **`contextGatherer.ts`** - Fetches user context from Firestore
- **`openaiClient.ts`** - Handles OpenAI API calls and prompt engineering
- **`actionProcessor.ts`** - Processes AI actions into auto-apply and suggestions

### Configuration

See `src/config.ts` for:
- Confidence thresholds
- Rate limits
- OpenAI model selection
- Max context items

## Rate Limiting

- **Daily limit:** 50 thought processings per user per day
- **Reprocess limit:** Maximum 5 reprocesses per thought
- Tracked in Firestore: `users/{userId}/dailyProcessingCount/{date}`

## Cost Management

Each processing uses OpenAI tokens:
- Typical usage: ~500-1500 tokens per thought
- Cost (GPT-4o): ~$0.01-0.02 per thought (varies with prompt length)
- Tracked in `processingHistory` for each thought

## Error Handling

Functions handle errors gracefully:
- Invalid requests → `invalid-argument` error
- Authentication failures → `unauthenticated` error
- Rate limits exceeded → `resource-exhausted` error
- OpenAI errors → Logged and stored in `aiError` field

## Monitoring

View function logs:

```bash
npm run logs
```

Or in Firebase Console:
https://console.firebase.google.com → Functions → Logs

## Security

- All callable functions require authentication
- Users can only process their own thoughts
- API keys stored securely in environment config
- Rate limiting prevents abuse
