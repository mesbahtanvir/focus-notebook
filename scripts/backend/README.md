# Deployment Scripts

This directory contains scripts for deploying the Go backend to Google Cloud Run.

## Scripts Overview

### `setup-gcp.sh` - Initial GCP Setup

Sets up all required GCP resources for deployment.

**Usage**:
```bash
GCP_PROJECT_ID=your-project-id ./setup-gcp.sh
```

**What it does**:
- ✅ Enables required GCP APIs
- ✅ Creates Artifact Registry repository
- ✅ Creates service accounts with proper IAM roles
- ✅ Sets up Workload Identity for GitHub Actions
- ✅ Creates Secret Manager secrets

**Run this once** before your first deployment.

---

### `deploy.sh` - Quick Manual Deployment

Deploys the backend to Cloud Run.

**Usage**:
```bash
# Deploy to staging
GCP_PROJECT_ID=your-project-id ./deploy.sh staging

# Deploy to production
GCP_PROJECT_ID=your-project-id ./deploy.sh production
```

**What it does**:
1. Runs tests (fails if tests don't pass)
2. Builds Docker image
3. Pushes to Artifact Registry
4. Deploys to Cloud Run
5. Runs health check

**Optional environment variables**:
- `GCP_PROJECT_ID` (required): Your GCP project ID
- `GCP_REGION` (optional): Region to deploy to (default: `us-central1`)

---

## Prerequisites

Before running these scripts:

1. **Install gcloud CLI**:
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Linux
   curl https://sdk.cloud.google.com | bash

   # Windows
   # Download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Install Docker**:
   ```bash
   # macOS
   brew install --cask docker

   # Linux
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Windows
   # Download from: https://www.docker.com/products/docker-desktop
   ```

---

## Deployment Workflow

### First Time Setup

```bash
# 1. Set your project ID
export GCP_PROJECT_ID="your-project-id"

# 2. Run setup script
./setup-gcp.sh

# 3. Add secret values (shown by setup script)
echo -n "sk-..." | gcloud secrets versions add openai-api-key --data-file=-
# ... add other secrets

# 4. Configure GitHub Secrets (shown by setup script)
# Go to GitHub → Settings → Secrets and variables → Actions
# Add the three secrets printed by setup-gcp.sh
```

### Regular Deployments

**Option 1: Automated (Recommended)**

Push to the appropriate branch:
```bash
# Deploy to staging
git push origin main

# Deploy to production
git push origin production
```

**Option 2: Manual**

Use the deploy script:
```bash
# Deploy to staging
GCP_PROJECT_ID=your-project-id ./deploy.sh staging

# Deploy to production
GCP_PROJECT_ID=your-project-id ./deploy.sh production
```

---

## Environment Variables

### Required

- `GCP_PROJECT_ID`: Your Google Cloud project ID

### Optional

- `GCP_REGION`: Region to deploy to (default: `us-central1`)
- `GITHUB_REPOSITORY`: GitHub repository (default: `mesbahtanvir/focus-notebook`)

---

## Troubleshooting

### "gcloud: command not found"

Install gcloud CLI (see Prerequisites above).

### "Permission denied"

Make scripts executable:
```bash
chmod +x setup-gcp.sh deploy.sh
```

### "API not enabled"

Enable required APIs:
```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

### "Tests failed"

Fix failing tests before deploying:
```bash
cd backend
go test -v ./...
```

### "Health check failed"

Check service logs:
```bash
gcloud run services logs tail focus-notebook-backend-staging --region=us-central1
```

---

## Additional Resources

- [Full Deployment Guide](../docs/DEPLOYMENT.md)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GitHub Actions Workflow](../../.github/workflows/deploy-backend.yml)

---

**Last Updated**: 2025-11-24
