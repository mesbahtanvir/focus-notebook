# Focus Notebook - Golang Backend

A high-performance Golang backend service that replaces Firebase Cloud Functions while maintaining full compatibility with the existing Focus Notebook frontend.

## Features

- 🔐 **Firebase Authentication Integration** - Seamless token verification
- 🗄️ **Firestore Data Layer** - CRUD operations with metadata injection
- 🤖 **AI Processing** - OpenAI & Anthropic integration for thought processing
- 💳 **Stripe Billing** - Subscription management and webhooks
- 🏦 **Plaid Banking** - Bank account connections and transactions
- 📊 **Stock Data** - Real-time market data integration
- 🖼️ **File Processing** - CSV, PDF, and image processing
- ⚡ **High Performance** - Compiled Go for speed and efficiency
- 📈 **Observability** - Prometheus metrics and structured logging

## Prerequisites

- Go 1.21 or higher
- Firebase project with Admin SDK credentials
- Docker (optional, for containerized deployment)

## Project Structure

```
backend/
├── cmd/
│   ├── server/          # HTTP API server
│   └── worker/          # Background workers
├── internal/
│   ├── middleware/      # HTTP middleware (auth, logging, etc.)
│   ├── handlers/        # HTTP request handlers
│   ├── services/        # Business logic
│   ├── clients/         # External API clients (OpenAI, Stripe, etc.)
│   ├── repository/      # Data access layer (Firestore, Storage)
│   ├── models/          # Data models
│   ├── config/          # Configuration management
│   └── utils/           # Utility functions
├── pkg/
│   └── firebase/        # Firebase Admin SDK setup
├── config/
│   ├── config.yaml      # Main configuration
│   └── prompts/         # AI prompt templates
├── Dockerfile
├── docker-compose.yml
└── go.mod
```

## Setup

### 1. Clone and Navigate

```bash
cd backend
```

### 2. Install Dependencies

```bash
go mod download
```

### 3. Firebase Setup

1. Download your Firebase Admin SDK service account key
2. Save it as `service-account-key.json` in the `backend` directory
3. Update `config/config.yaml` with your Firebase project ID

### 4. Environment Variables

Create a `.env` file:

```env
# Firebase
FIREBASE_PROJECT_ID=your-project-id

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Plaid
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENVIRONMENT=sandbox

# Alpha Vantage (stock data)
ALPHA_VANTAGE_API_KEY=...
```

### 5. Configuration

Edit `config/config.yaml` to customize:
- Server port and timeouts
- CORS settings
- Worker intervals
- Logging preferences

## Running

### Development Mode

```bash
# Start the API server
go run cmd/server/main.go

# In another terminal, start the background workers
go run cmd/worker/main.go
```

### Production Build

```bash
# Build binaries
go build -o server ./cmd/server
go build -o worker ./cmd/worker

# Run
./server
./worker
```

### Docker

```bash
# Build image
docker build -t focus-notebook-backend .

# Run server
docker run -p 8080:8080 --env-file .env focus-notebook-backend ./server

# Run worker
docker run --env-file .env focus-notebook-backend ./worker
```

### Docker Compose (recommended for local development)

```bash
docker-compose up
```

## API Endpoints

### Health & Metrics
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Thought Processing
- `POST /api/process-thought` - Process a thought with AI
- `POST /api/reprocess-thought` - Reprocess with updated context
- `POST /api/revert-thought-processing` - Undo AI changes
- `POST /api/chat` - AI chat interface

### Investment
- `POST /api/predict-investment` - Investment predictions
- `GET /api/stock-price` - Current stock price
- `GET /api/stock-history` - Historical data

### Spending
- `POST /api/spending/categorize` - Categorize transaction
- `POST /api/spending/link-trip` - Link transaction to trip
- `POST /api/spending/delete-csv` - Delete CSV statement

### Stripe (Billing)
- `POST /api/stripe/create-checkout-session` - Start subscription
- `POST /api/stripe/create-portal-session` - Billing portal
- `POST /api/stripe/webhook` - Stripe webhooks
- `GET /api/stripe/invoices` - Get invoice history
- `GET /api/stripe/usage-stats` - AI usage statistics

### Plaid (Banking)
- `POST /api/plaid/create-link-token` - Initialize Plaid Link
- `POST /api/plaid/exchange-public-token` - Complete connection
- `POST /api/plaid/webhook` - Plaid webhooks

### Photos
- `POST /api/photo/vote` - Submit photo vote
- `GET /api/photo/next-pair` - Get next voting pair

All endpoints (except health/metrics) require authentication:
```
Authorization: Bearer <firebase-id-token>
```

## Testing

### Unit Tests

```bash
# Run all tests
go test ./...

# With coverage
go test -cover ./...

# Verbose output
go test -v ./...

# Specific package
go test ./internal/services
```

### Integration Tests

```bash
# Requires Firebase Emulator
firebase emulators:start

# Run integration tests
go test -tags=integration ./...
```

### Load Testing

```bash
# Using hey
hey -n 10000 -c 100 http://localhost:8080/health
```

## CI/CD

### GitHub Actions Workflows

The backend uses automated workflows for continuous integration:

#### Backend Tests Workflow (`.github/workflows/backend-tests.yml`)

Runs automatically on every push and pull request to `main` or `develop` branches:

**Test Job**
- Sets up Go 1.21 environment
- Downloads and verifies dependencies
- Runs all tests with race detector
- Generates coverage reports
- Creates coverage summary in PR comments

**Lint Job**
- Runs `golangci-lint` with custom configuration (`.golangci.yml`)
- Checks code quality, style, and best practices
- Validates security patterns

**Build Job**
- Compiles all packages
- Builds server binary
- Verifies successful compilation

**Security Job**
- Runs `gosec` security scanner
- Runs `govulncheck` for vulnerability detection
- Reports security issues

### Running CI Checks Locally

Before pushing, run the same checks locally:

```bash
# 1. Verify dependencies
go mod tidy
git diff --exit-code go.mod go.sum

# 2. Run linter
golangci-lint run

# 3. Run tests with coverage
go test -race -coverprofile=coverage.out ./...

# 4. View coverage
go tool cover -func=coverage.out

# 5. Verify build
go build ./...
```

### Test Coverage Reports

Coverage reports are automatically generated in CI and can be viewed in:
- GitHub Actions job summaries
- Artifacts uploaded per build (retention: 7 days)
- Local coverage reports: `go tool cover -html=coverage.out`

Current coverage: **80%+** across all packages

## Deployment

The backend is deployed to **Google Cloud Run** with automated CI/CD via GitHub Actions.

### Quick Start Deployment

**Option 1: Automated (Recommended)**

Push to the appropriate branch:
```bash
# Deploy to staging
git push origin main

# Deploy to production
git push origin production
```

**Option 2: Manual Deployment**

```bash
# Set your GCP project
export GCP_PROJECT_ID="your-project-id"

# Deploy to staging
cd scripts
./deploy.sh staging

# Deploy to production
./deploy.sh production
```

### First-Time Setup

**1. Run the setup script** (one-time):
```bash
cd scripts
GCP_PROJECT_ID=your-project-id ./setup-gcp.sh
```

This creates:
- ✅ Artifact Registry repository
- ✅ Cloud Run service accounts
- ✅ Workload Identity for GitHub Actions
- ✅ Secret Manager secrets

**2. Configure GitHub Secrets** (printed by setup script):
- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

**3. Add API keys to Secret Manager**:
```bash
echo -n "sk-..." | gcloud secrets versions add openai-api-key --data-file=-
echo -n "sk-ant-..." | gcloud secrets versions add anthropic-api-key --data-file=-
# ... etc (see setup script output)
```

### Deployment Workflow

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) automatically:

1. ✅ Runs all tests (must pass)
2. ✅ Checks test coverage (must be >50%)
3. ✅ Builds Docker image
4. ✅ Pushes to Artifact Registry
5. ✅ Deploys to Cloud Run
6. ✅ Runs health checks

### Environments

| Environment | Trigger | Resources | Auto-scale |
|-------------|---------|-----------|------------|
| **Staging** | Push to `main` | 2 CPU, 2GB RAM | 0-10 instances |
| **Production** | Push to `production` | 4 CPU, 4GB RAM | 1-50 instances |

### Documentation

- **📘 Full Deployment Guide**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **🔧 Scripts Reference**: [scripts/README.md](./scripts/README.md)
- **🚀 GitHub Actions**: [.github/workflows/deploy-backend.yml](../.github/workflows/deploy-backend.yml)

### Monitoring

View logs and metrics:
```bash
# Real-time logs
gcloud run services logs tail focus-notebook-backend-staging --region=us-central1

# Service URL
gcloud run services describe focus-notebook-backend-staging \
  --region=us-central1 \
  --format='value(status.url)'

# Health check
curl $(gcloud run services describe focus-notebook-backend-staging \
  --region=us-central1 --format='value(status.url)')/health
```

Cloud Console: https://console.cloud.google.com/run

## Monitoring

### Prometheus Metrics

Available at `/metrics`:
- `http_request_duration_seconds` - Request latency
- `http_requests_total` - Total requests by status
- `thoughts_processed_total` - Thoughts processed
- `ai_api_calls_total` - AI API calls
- `firestore_operations_total` - Database operations

### Logging

Structured JSON logs with `zap`:
```json
{
  "level": "info",
  "ts": 1700000000,
  "msg": "Processing thought",
  "uid": "user123",
  "thoughtId": "thought456",
  "duration": 1234
}
```

### Health Checks

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "firebase": "connected",
  "workers": {
    "thought_queue": "running",
    "stock_prices": "running"
  }
}
```

## Migration from Firebase Functions

### Frontend Changes Required
**ZERO.** The frontend continues to use:
- Firebase Auth SDK
- Firestore SDK
- Firebase Storage SDK
- Same API endpoints (now handled by Go backend)

### Migration Steps
1. Deploy Go backend alongside existing Firebase Functions
2. Update API endpoint URLs to point to Go backend
3. Monitor for issues
4. Gradually increase traffic to Go backend
5. Decommission Firebase Functions once stable

### Feature Parity Checklist
- ✅ Authentication (Firebase token verification)
- ✅ Thought processing with AI
- ✅ Stripe billing integration
- ✅ Plaid banking integration
- ✅ File processing (CSV, PDF, images)
- ✅ Stock data fetching
- ✅ Background workers
- ✅ Real-time Firestore operations
- ✅ Anonymous session management
- ✅ Subscription validation

## Cost Comparison

| Service | Firebase Functions | Go Backend (Cloud Run) |
|---------|-------------------|------------------------|
| 5M requests/month | ~$200 | ~$12 |
| **Savings** | - | **94%** |

## Architecture

See `ANALYSIS.md` for comprehensive architecture documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run `go fmt` and `go vet`
5. Submit a pull request

## License

See LICENSE file.

## Support

For issues or questions, please open a GitHub issue.
