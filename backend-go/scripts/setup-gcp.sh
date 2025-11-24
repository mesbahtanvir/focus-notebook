#!/bin/bash

# Setup script for Google Cloud Platform deployment
# This script sets up the necessary GCP resources for deploying the Go backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_ACCOUNT_NAME="backend-service-account"
ARTIFACT_REGISTRY_REPO="backend"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it from:"
        print_error "https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    # Check if PROJECT_ID is set
    if [ -z "$PROJECT_ID" ]; then
        print_error "GCP_PROJECT_ID environment variable is not set"
        print_error "Usage: GCP_PROJECT_ID=your-project-id ./setup-gcp.sh"
        exit 1
    fi

    print_info "Prerequisites check passed"
}

# Enable required APIs
enable_apis() {
    print_info "Enabling required GCP APIs..."

    gcloud services enable \
        cloudresourcemanager.googleapis.com \
        compute.googleapis.com \
        run.googleapis.com \
        artifactregistry.googleapis.com \
        secretmanager.googleapis.com \
        iam.googleapis.com \
        iamcredentials.googleapis.com \
        cloudbuild.googleapis.com \
        --project="$PROJECT_ID"

    print_info "APIs enabled successfully"
}

# Create Artifact Registry repository
create_artifact_registry() {
    print_info "Creating Artifact Registry repository..."

    if gcloud artifacts repositories describe "$ARTIFACT_REGISTRY_REPO" \
        --location="$REGION" \
        --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Artifact Registry repository already exists"
    else
        gcloud artifacts repositories create "$ARTIFACT_REGISTRY_REPO" \
            --repository-format=docker \
            --location="$REGION" \
            --description="Docker repository for Focus Notebook backend" \
            --project="$PROJECT_ID"

        print_info "Artifact Registry repository created"
    fi
}

# Create service account
create_service_account() {
    print_info "Creating Cloud Run service account..."

    SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

    if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" \
        --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Service account already exists"
    else
        gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
            --display-name="Focus Notebook Backend Service Account" \
            --description="Service account for Cloud Run backend" \
            --project="$PROJECT_ID"

        print_info "Service account created"
    fi

    # Grant necessary roles
    print_info "Granting IAM roles to service account..."

    ROLES=(
        "roles/firestore.user"
        "roles/storage.objectAdmin"
        "roles/secretmanager.secretAccessor"
        "roles/cloudtrace.agent"
        "roles/logging.logWriter"
        "roles/monitoring.metricWriter"
    )

    for ROLE in "${ROLES[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
            --role="$ROLE" \
            --condition=None \
            > /dev/null

        print_info "  ✓ Granted $ROLE"
    done
}

# Setup Workload Identity for GitHub Actions
setup_workload_identity() {
    print_info "Setting up Workload Identity for GitHub Actions..."

    POOL_NAME="github-actions-pool"
    POOL_ID="projects/${PROJECT_ID}/locations/global/workloadIdentityPools/${POOL_NAME}"
    PROVIDER_NAME="github-provider"
    GITHUB_REPO="${GITHUB_REPOSITORY:-mesbahtanvir/focus-notebook}"

    # Create Workload Identity Pool
    if gcloud iam workload-identity-pools describe "$POOL_NAME" \
        --location=global \
        --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Workload Identity Pool already exists"
    else
        gcloud iam workload-identity-pools create "$POOL_NAME" \
            --location=global \
            --display-name="GitHub Actions Pool" \
            --project="$PROJECT_ID"

        print_info "Workload Identity Pool created"
    fi

    # Create Workload Identity Provider
    if gcloud iam workload-identity-pools providers describe "$PROVIDER_NAME" \
        --workload-identity-pool="$POOL_NAME" \
        --location=global \
        --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Workload Identity Provider already exists"
    else
        gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_NAME" \
            --workload-identity-pool="$POOL_NAME" \
            --location=global \
            --issuer-uri="https://token.actions.githubusercontent.com" \
            --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
            --project="$PROJECT_ID"

        print_info "Workload Identity Provider created"
    fi

    # Create service account for GitHub Actions
    GH_SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

    if gcloud iam service-accounts describe "$GH_SERVICE_ACCOUNT" \
        --project="$PROJECT_ID" &> /dev/null; then
        print_warning "GitHub Actions service account already exists"
    else
        gcloud iam service-accounts create "github-actions" \
            --display-name="GitHub Actions Deployment" \
            --project="$PROJECT_ID"

        print_info "GitHub Actions service account created"
    fi

    # Grant roles to GitHub Actions service account
    print_info "Granting deployment roles to GitHub Actions service account..."

    GH_ROLES=(
        "roles/run.admin"
        "roles/iam.serviceAccountUser"
        "roles/artifactregistry.writer"
        "roles/storage.admin"
    )

    for ROLE in "${GH_ROLES[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:${GH_SERVICE_ACCOUNT}" \
            --role="$ROLE" \
            --condition=None \
            > /dev/null

        print_info "  ✓ Granted $ROLE"
    done

    # Bind Workload Identity
    gcloud iam service-accounts add-iam-policy-binding "$GH_SERVICE_ACCOUNT" \
        --project="$PROJECT_ID" \
        --role="roles/iam.workloadIdentityUser" \
        --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_REPO}"

    print_info "Workload Identity binding created"

    # Print configuration for GitHub Secrets
    echo ""
    print_info "================================================"
    print_info "Add these secrets to your GitHub repository:"
    print_info "================================================"
    echo ""
    echo "GCP_PROJECT_ID: $PROJECT_ID"
    echo "GCP_WORKLOAD_IDENTITY_PROVIDER: projects/${PROJECT_ID}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"
    echo "GCP_SERVICE_ACCOUNT: $GH_SERVICE_ACCOUNT"
    echo ""
}

# Create Secret Manager secrets
create_secrets() {
    print_info "Creating Secret Manager secrets..."

    SECRETS=(
        "openai-api-key"
        "anthropic-api-key"
        "stripe-secret-key-staging"
        "stripe-secret-key-production"
        "stripe-webhook-secret-staging"
        "stripe-webhook-secret-production"
        "plaid-client-id-staging"
        "plaid-client-id-production"
        "plaid-secret-staging"
        "plaid-secret-production"
        "alpha-vantage-api-key"
    )

    for SECRET in "${SECRETS[@]}"; do
        if gcloud secrets describe "$SECRET" \
            --project="$PROJECT_ID" &> /dev/null; then
            print_warning "  Secret $SECRET already exists"
        else
            gcloud secrets create "$SECRET" \
                --replication-policy="automatic" \
                --project="$PROJECT_ID"

            print_info "  ✓ Created secret: $SECRET"
        fi
    done

    print_warning ""
    print_warning "⚠️  Remember to add secret values using:"
    print_warning "    gcloud secrets versions add SECRET_NAME --data-file=- <<< 'YOUR_SECRET_VALUE'"
    print_warning ""
}

# Main execution
main() {
    print_info "Starting GCP setup for Focus Notebook Backend"
    print_info "Project ID: $PROJECT_ID"
    print_info "Region: $REGION"
    echo ""

    check_prerequisites
    enable_apis
    create_artifact_registry
    create_service_account
    setup_workload_identity
    create_secrets

    echo ""
    print_info "================================================"
    print_info "✅ GCP Setup Complete!"
    print_info "================================================"
    echo ""
    print_info "Next steps:"
    print_info "1. Add the GitHub secrets shown above to your repository"
    print_info "2. Add secret values to Secret Manager"
    print_info "3. Push to main branch to trigger deployment"
    echo ""
}

main
