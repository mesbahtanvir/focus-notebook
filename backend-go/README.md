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
backend-go/
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
cd backend-go
```

### 2. Install Dependencies

```bash
go mod download
```

### 3. Firebase Setup

1. Download your Firebase Admin SDK service account key
2. Save it as `service-account-key.json` in the `backend-go` directory
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

## Deployment

### Cloud Run (Recommended)

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/focus-backend
gcloud run deploy focus-backend \
  --image gcr.io/PROJECT_ID/focus-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Kubernetes

See `k8s/` directory for Kubernetes manifests.

### VPS (DigitalOcean, Linode, etc.)

```bash
# Build binary
GOOS=linux GOARCH=amd64 go build -o server ./cmd/server

# Copy to server
scp server user@your-server:/opt/focus-backend/

# Set up systemd service (see docs/deployment.md)
```

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
