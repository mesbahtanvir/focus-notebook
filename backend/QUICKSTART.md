# Focus Notebook Backend - Quick Start Guide

Get the Golang backend up and running in under 10 minutes.

## Prerequisites

- Go 1.21+ installed
- Firebase project with Admin SDK credentials
- Docker (optional, for containerized deployment)

## Step 1: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `service-account-key.json` in the `backend/` directory

⚠️ **Important:** Never commit this file to version control! It's already in `.gitignore`.

## Step 2: Configure Environment

Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-...

# Stripe (required for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Other services as needed
```

## Step 3: Choose Your Deployment Method

### Option A: Local Development (Recommended for Testing)

**Install dependencies:**
```bash
go mod download
```

**Run the server:**
```bash
go run cmd/server/main.go
```

Server will start on `http://localhost:8080`

**Test the health endpoint:**
```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "firebase": "connected",
  "uptime_seconds": 5,
  "version": "1.0.0"
}
```

### Option B: Docker (Recommended for Production-like Testing)

**Build and run with docker-compose:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f server
```

**Stop containers:**
```bash
docker-compose down
```

### Option C: Build Binary

**Build the server:**
```bash
go build -o server cmd/server/main.go
```

**Run:**
```bash
./server
```

## Step 4: Test Authentication

The backend requires Firebase ID tokens for authentication. Here's how to test:

### Using the Frontend (Easiest)

1. Start your Next.js frontend: `npm run dev`
2. Sign in to get a Firebase ID token
3. The frontend will automatically send this token in the `Authorization` header
4. No additional configuration needed!

### Using curl (for debugging)

First, get a Firebase ID token from your frontend's browser console:
```javascript
// In browser console after signing in
auth.currentUser.getIdToken().then(token => console.log(token))
```

Then use it in curl:
```bash
TOKEN="your-firebase-id-token"

curl -X POST http://localhost:8080/api/process-thought \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"thoughtId":"test-123","thought":{"text":"Hello"}}'
```

## Step 5: Update Frontend to Use Go Backend

### Development (Testing Both Backends)

You can run both Firebase Functions AND the Go backend simultaneously:

**No changes needed!** The frontend already calls `/api/*` endpoints, which work with both:
- Firebase Functions: Via Next.js API routes that proxy to Cloud Functions
- Go Backend: Via direct HTTP calls to `http://localhost:8080/api/*`

### Switching to Go Backend

Update your frontend's API base URL:

**Option 1: Environment Variable (Recommended)**

Create/update `.env.local` in your frontend:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

**Option 2: Code Change**

Update API calls to use the new base URL:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// Example: Process thought
const response = await fetch(`${API_BASE}/api/process-thought`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ thoughtId, thought, context }),
});
```

## Step 6: Verify Integration

### Check Health
```bash
curl http://localhost:8080/health
```

### Check Metrics (Prometheus)
```bash
curl http://localhost:8080/metrics
```

### Test Protected Endpoint
```bash
# Get token from frontend
TOKEN=$(node -e "console.log(process.env.FIREBASE_TOKEN)")

# Call API
curl -X POST http://localhost:8080/api/process-thought \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"thoughtId":"test","thought":{"text":"Test thought"}}'
```

## Common Issues & Solutions

### Issue: "Failed to initialize Firebase"

**Solution:** Check that:
1. `service-account-key.json` exists in `backend/` directory
2. File has correct permissions (readable)
3. `FIREBASE_PROJECT_ID` in `.env` matches your project

### Issue: "Unauthorized" when calling API

**Solution:**
1. Verify you're sending the `Authorization: Bearer <token>` header
2. Token must be fresh (< 1 hour old)
3. User must be signed in on frontend

### Issue: "Anonymous sessions cannot access AI features"

**Solution:**
- If testing with anonymous user, add this to `.env`:
  ```env
  ANONYMOUS_AI_OVERRIDE_KEY=test-key
  ```
- Then in Firebase Console, set the anonymous session's `ciOverrideKey` field to `test-key`

### Issue: Port 8080 already in use

**Solution:** Change the port in `config/config.yaml`:
```yaml
server:
  port: 8081  # Or any available port
```

## Next Steps

### 1. Implement Additional Endpoints

The current implementation includes:
- ✅ Health check
- ✅ Authentication middleware
- ✅ Thought processing (placeholder)

Still to implement:
- ⏳ OpenAI/Anthropic integration
- ⏳ Stripe billing endpoints
- ⏳ Plaid banking endpoints
- ⏳ Stock data endpoints
- ⏳ File upload processing
- ⏳ Background workers

See `ANALYSIS.md` for the complete architecture.

### 2. Add Background Workers

Edit `cmd/worker/main.go` to implement:
- Thought processing queue
- Stock price updates
- Anonymous session cleanup
- Portfolio snapshots

### 3. Set Up Monitoring

Add monitoring with:
- Prometheus for metrics (already configured)
- Grafana for dashboards
- Alerting for critical errors

### 4. Deploy to Production

Choose your hosting platform:

**Cloud Run (Easiest):**
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/focus-backend
gcloud run deploy focus-backend \
  --image gcr.io/PROJECT_ID/focus-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Kubernetes:**
- See deployment manifests in `k8s/` (to be added)

**VPS (DigitalOcean, Linode, etc.):**
```bash
# Build binary
GOOS=linux GOARCH=amd64 go build -o server cmd/server/main.go

# Copy to server
scp server user@your-server:/opt/focus-backend/

# Set up systemd service (see deployment docs)
```

## Architecture Overview

```
Frontend (Next.js)
    ↓
    ├── Firebase Auth SDK → Firebase Auth
    ├── Firestore SDK → Firestore (real-time)
    ├── Storage SDK → Firebase Storage
    └── HTTP API calls → Golang Backend (you are here!)
                              ↓
                         ├── Auth Middleware (verifies tokens)
                         ├── Business Logic (services)
                         └── Data Access (Firestore, Storage)
```

**Key Point:** The Go backend does NOT replace Firebase. It only replaces Cloud Functions and API routes. The frontend continues to use Firebase SDKs for Auth, Firestore, and Storage.

## Helpful Commands

```bash
# Development
go run cmd/server/main.go          # Run server
go run cmd/worker/main.go          # Run worker
go test ./...                      # Run tests
go fmt ./...                       # Format code
go vet ./...                       # Lint code

# Building
go build -o server cmd/server/main.go
go build -o worker cmd/worker/main.go

# Docker
docker-compose up -d               # Start all services
docker-compose logs -f             # View logs
docker-compose restart server      # Restart server
docker-compose down                # Stop all services

# Docker single service
docker build -t focus-backend .
docker run -p 8080:8080 --env-file .env focus-backend
```

## Support

- **Documentation:** See `ANALYSIS.md` for comprehensive architecture details
- **README:** See `README.md` for full documentation
- **Issues:** Open a GitHub issue if you encounter problems

---

**You're all set!** 🚀

The Golang backend is now running and ready to accept requests from your Frontend.
