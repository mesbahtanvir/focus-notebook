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

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Set Firebase Environment Config

```bash
firebase functions:config:set openai.api_key="sk-your-actual-api-key-here"
```

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
