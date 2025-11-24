#!/bin/bash

# Quick deployment script for Cloud Run
# Usage: ./deploy.sh [staging|production]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}==>${NC} $1"; }

# Configuration
ENVIRONMENT="${1:-staging}"
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="focus-notebook-backend-${ENVIRONMENT}"
REPO_NAME="backend"

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    print_error "Invalid environment. Use: staging or production"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

if [ -z "$PROJECT_ID" ]; then
    print_error "GCP_PROJECT_ID environment variable is not set"
    echo "Usage: GCP_PROJECT_ID=your-project-id $0 $ENVIRONMENT"
    exit 1
fi

# Confirmation for production
if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    print_warn "⚠️  You are about to deploy to PRODUCTION!"
    print_warn "This will affect live users."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        print_info "Deployment cancelled"
        exit 0
    fi
fi

# Set image tags
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:$(git rev-parse --short HEAD)"
IMAGE_LATEST="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${ENVIRONMENT}-latest"

echo ""
print_info "================================================"
print_info "Deploying Focus Notebook Backend"
print_info "================================================"
print_info "Environment: $ENVIRONMENT"
print_info "Project ID: $PROJECT_ID"
print_info "Region: $REGION"
print_info "Service: $SERVICE_NAME"
print_info "================================================"
echo ""

# Step 1: Run tests
print_step "Running tests..."
cd "$(dirname "$0")/.."

if ! go test -v -race ./...; then
    print_error "Tests failed! Aborting deployment."
    exit 1
fi

print_info "✓ Tests passed"
echo ""

# Step 2: Build and push Docker image
print_step "Building and pushing Docker image..."

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

docker build \
    --tag "$IMAGE_TAG" \
    --tag "$IMAGE_LATEST" \
    --build-arg VERSION="$(git rev-parse HEAD)" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    .

docker push "$IMAGE_TAG"
docker push "$IMAGE_LATEST"

print_info "✓ Docker image pushed"
echo ""

# Step 3: Deploy to Cloud Run
print_step "Deploying to Cloud Run ($ENVIRONMENT)..."

# Set resource configuration based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    CPU="4"
    MEMORY="4Gi"
    MIN_INSTANCES="1"
    MAX_INSTANCES="50"
    SECRET_SUFFIX="production"
else
    CPU="2"
    MEMORY="2Gi"
    MIN_INSTANCES="0"
    MAX_INSTANCES="10"
    SECRET_SUFFIX="staging"
fi

gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_TAG" \
    --platform managed \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --service-account "backend-service-account@${PROJECT_ID}.iam.gserviceaccount.com" \
    --cpu "$CPU" \
    --memory "$MEMORY" \
    --min-instances "$MIN_INSTANCES" \
    --max-instances "$MAX_INSTANCES" \
    --timeout 300 \
    --concurrency 80 \
    --port 8080 \
    --allow-unauthenticated \
    --set-env-vars "ENVIRONMENT=${ENVIRONMENT},GCP_PROJECT_ID=${PROJECT_ID}" \
    --set-secrets "OPENAI_API_KEY=openai-api-key:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,STRIPE_SECRET_KEY=stripe-secret-key-${SECRET_SUFFIX}:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret-${SECRET_SUFFIX}:latest,PLAID_CLIENT_ID=plaid-client-id-${SECRET_SUFFIX}:latest,PLAID_SECRET=plaid-secret-${SECRET_SUFFIX}:latest,ALPHA_VANTAGE_API_KEY=alpha-vantage-api-key:latest"

print_info "✓ Deployed to Cloud Run"
echo ""

# Step 4: Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='value(status.url)')

print_info "Service URL: $SERVICE_URL"
echo ""

# Step 5: Health check
print_step "Running health check..."

sleep 5  # Give service a moment to start

for i in {1..5}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health")

    if [ "$HTTP_CODE" = "200" ]; then
        print_info "✓ Health check passed (HTTP $HTTP_CODE)"
        echo ""
        print_info "================================================"
        print_info "🎉 Deployment Successful!"
        print_info "================================================"
        print_info "Environment: $ENVIRONMENT"
        print_info "Service URL: $SERVICE_URL"
        print_info "Image: $IMAGE_TAG"
        print_info "================================================"
        echo ""
        exit 0
    fi

    print_warn "Health check attempt $i failed (HTTP $HTTP_CODE), retrying..."
    sleep 5
done

print_error "Health check failed after 5 attempts"
print_warn "Check logs with: gcloud run services logs tail $SERVICE_NAME --region=$REGION"
exit 1
