# Deployment Guide - Go Backend to Google Cloud Run

This guide explains how to deploy the Focus Notebook Go backend to Google Cloud Run using GitHub Actions.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [GitHub Secrets Configuration](#github-secrets-configuration)
5. [Manual Deployment](#manual-deployment)
6. [Automated Deployment](#automated-deployment)
7. [Environment Configuration](#environment-configuration)
8. [Monitoring & Debugging](#monitoring--debugging)
9. [Rollback](#rollback)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The backend is deployed to **Google Cloud Run**, a serverless container platform that automatically scales based on traffic.

### Architecture

```
GitHub → GitHub Actions → Build Docker Image → Push to Artifact Registry → Deploy to Cloud Run
                          ↓
                    Run Tests (required)
```

### Environments

- **Staging**: Deployed automatically on push to `main` branch
- **Production**: Deployed automatically on push to `production` branch or manually triggered

---

## Prerequisites

Before deploying, ensure you have:

1. **Google Cloud Platform account** with billing enabled
2. **gcloud CLI** installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
3. **Docker** installed (for local testing)
4. **GitHub repository** with admin access
5. **GCP Project ID** ready

---

## Initial Setup

### Step 1: Run the Setup Script

The automated setup script configures all necessary GCP resources:

```bash
cd backend

# Set your GCP Project ID
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"  # Optional, defaults to us-central1
export GITHUB_REPOSITORY="mesbahtanvir/focus-notebook"  # Optional

# Run setup script
./scripts/setup-gcp.sh
```

This script will:
- ✅ Enable required GCP APIs
- ✅ Create Artifact Registry repository
- ✅ Create Cloud Run service account with proper IAM roles
- ✅ Setup Workload Identity for GitHub Actions
- ✅ Create Secret Manager secrets

### Step 2: Add Secret Values

After running the setup script, add your actual secret values:

```bash
# OpenAI API Key
echo -n "sk-..." | gcloud secrets versions add openai-api-key --data-file=-

# Anthropic API Key
echo -n "sk-ant-..." | gcloud secrets versions add anthropic-api-key --data-file=-

# Stripe (Staging)
echo -n "sk_test_..." | gcloud secrets versions add stripe-secret-key-staging --data-file=-
echo -n "whsec_..." | gcloud secrets versions add stripe-webhook-secret-staging --data-file=-

# Stripe (Production)
echo -n "sk_live_..." | gcloud secrets versions add stripe-secret-key-production --data-file=-
echo -n "whsec_..." | gcloud secrets versions add stripe-webhook-secret-production --data-file=-

# Plaid (Staging - Sandbox)
echo -n "plaid-client-id" | gcloud secrets versions add plaid-client-id-staging --data-file=-
echo -n "plaid-secret" | gcloud secrets versions add plaid-secret-staging --data-file=-

# Plaid (Production)
echo -n "plaid-client-id" | gcloud secrets versions add plaid-client-id-production --data-file=-
echo -n "plaid-secret" | gcloud secrets versions add plaid-secret-production --data-file=-

# Alpha Vantage
echo -n "your-api-key" | gcloud secrets versions add alpha-vantage-api-key --data-file=-
```

### Step 3: Verify Setup

```bash
# Check Artifact Registry
gcloud artifacts repositories list --location=us-central1

# Check service accounts
gcloud iam service-accounts list

# Check secrets
gcloud secrets list
```

---

## GitHub Secrets Configuration

Add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Example |
|------------|-------------|---------|
| `GCP_PROJECT_ID` | Your GCP Project ID | `focus-notebook-prod` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider | `projects/123.../workloadIdentityPools/...` |
| `GCP_SERVICE_ACCOUNT` | GitHub Actions service account email | `github-actions@project.iam.gserviceaccount.com` |

The setup script prints these values at the end. Copy them to GitHub Secrets.

---

## Manual Deployment

### Local Build and Test

```bash
cd backend

# Build Docker image
docker build -t focus-notebook-backend:local .

# Run locally
docker run -p 8080:8080 \
  -e ENVIRONMENT=development \
  -e GCP_PROJECT_ID=your-project-id \
  focus-notebook-backend:local

# Test health endpoint
curl http://localhost:8080/health
```

### Deploy to Cloud Run (Manual)

```bash
# Set variables
PROJECT_ID="your-project-id"
REGION="us-central1"
SERVICE_NAME="focus-notebook-backend-staging"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/backend/focus-notebook-backend:latest"

# Build and push image
gcloud builds submit --tag "$IMAGE" backend/

# Deploy to Cloud Run
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --service-account "backend-service-account@${PROJECT_ID}.iam.gserviceaccount.com" \
  --cpu 2 \
  --memory 2Gi \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --port 8080 \
  --set-env-vars "ENVIRONMENT=staging,GCP_PROJECT_ID=${PROJECT_ID}" \
  --set-secrets "OPENAI_API_KEY=openai-api-key:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest"
```

---

## Automated Deployment

Deployment happens automatically via GitHub Actions.

### Staging Deployment

**Trigger**: Push to `main` branch

```bash
git checkout main
git merge feature-branch
git push origin main
```

The workflow will:
1. Run all tests
2. Build Docker image
3. Push to Artifact Registry
4. Deploy to Cloud Run (staging)
5. Run health checks

### Production Deployment

**Trigger**: Push to `production` branch

```bash
git checkout production
git merge main
git push origin production
```

Or use **manual deployment** via GitHub Actions:

1. Go to **Actions** tab in GitHub
2. Select **Deploy Go Backend to Cloud Run**
3. Click **Run workflow**
4. Select environment: **production**
5. Click **Run workflow**

### Workflow Configuration

The workflow is defined in `.github/workflows/deploy-backend.yml`:

- **Test job**: Runs Go tests, checks coverage (must be >50%)
- **Build job**: Builds and pushes Docker image
- **Deploy-staging job**: Deploys to staging environment
- **Deploy-production job**: Deploys to production (requires manual approval)

---

## Environment Configuration

### Environment Variables

Set in Cloud Run:

| Variable | Description | Example |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment name | `staging`, `production` |
| `GCP_PROJECT_ID` | GCP Project ID | `focus-notebook-prod` |
| `PORT` | Server port | `8080` |
| `LOG_LEVEL` | Logging level | `info`, `debug` |

### Secrets (from Secret Manager)

| Secret | Environment | Description |
|--------|-------------|-------------|
| `OPENAI_API_KEY` | Both | OpenAI API key |
| `ANTHROPIC_API_KEY` | Both | Anthropic Claude API key |
| `STRIPE_SECRET_KEY` | Staging/Production | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Staging/Production | Stripe webhook secret |
| `PLAID_CLIENT_ID` | Staging/Production | Plaid client ID |
| `PLAID_SECRET` | Staging/Production | Plaid secret |
| `ALPHA_VANTAGE_API_KEY` | Both | Alpha Vantage API key |

### Resource Allocation

**Staging**:
- CPU: 2 cores
- Memory: 2 GB
- Min instances: 0 (scales to zero)
- Max instances: 10

**Production**:
- CPU: 4 cores
- Memory: 4 GB
- Min instances: 1 (always warm)
- Max instances: 50

---

## Monitoring & Debugging

### View Logs

```bash
# Real-time logs
gcloud run services logs tail focus-notebook-backend-staging --region=us-central1

# Recent logs
gcloud run services logs read focus-notebook-backend-staging \
  --region=us-central1 \
  --limit=50

# Filter logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=focus-notebook-backend-staging" \
  --limit=50 \
  --format=json
```

### View Metrics

**Cloud Console**: https://console.cloud.google.com/run

- Request count
- Request latency
- Error rate
- Container CPU/Memory utilization
- Container instance count

### Health Check

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe focus-notebook-backend-staging \
  --region=us-central1 \
  --format='value(status.url)')

# Check health
curl "${SERVICE_URL}/health"

# Check metrics
curl "${SERVICE_URL}/metrics"
```

---

## Rollback

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list \
  --service=focus-notebook-backend-production \
  --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic focus-notebook-backend-production \
  --to-revisions=focus-notebook-backend-production-00042-abc=100 \
  --region=us-central1
```

### Gradual Traffic Migration

```bash
# Route 90% to new, 10% to old (canary deployment)
gcloud run services update-traffic focus-notebook-backend-production \
  --to-revisions=REVISION_NEW=90,REVISION_OLD=10 \
  --region=us-central1
```

---

## Troubleshooting

### Common Issues

#### 1. **Deployment Fails: Permission Denied**

**Solution**: Verify IAM roles

```bash
# Check service account roles
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions@*"
```

#### 2. **Health Check Failing**

**Solution**: Check logs

```bash
gcloud run services logs tail focus-notebook-backend-staging --region=us-central1
```

Check:
- Port 8080 is exposed
- `/health` endpoint returns 200
- Firebase credentials are valid

#### 3. **Secret Not Found**

**Solution**: Verify secrets exist

```bash
# List all secrets
gcloud secrets list

# Check specific secret
gcloud secrets versions access latest --secret=openai-api-key
```

#### 4. **Container Crashes on Startup**

**Solution**: Check environment variables

```bash
# Describe service
gcloud run services describe focus-notebook-backend-staging \
  --region=us-central1 \
  --format=yaml
```

Verify:
- All required environment variables are set
- Secrets are properly mounted
- Service account has necessary permissions

#### 5. **Slow Cold Starts**

**Solution**: Adjust settings

```bash
# Set minimum instances to 1 (keeps container warm)
gcloud run services update focus-notebook-backend-production \
  --min-instances=1 \
  --region=us-central1
```

---

## Cost Optimization

### Tips to Reduce Costs

1. **Staging**: Set `min-instances=0` (scales to zero when idle)
2. **Right-size resources**: Start with 2 CPU / 2GB RAM, adjust based on metrics
3. **Use CPU throttling**: Enabled by default, reduces cost when idle
4. **Monitor unused services**: Delete staging services when not needed
5. **Request-based billing**: Only pay for actual requests

### Estimated Costs

**Staging** (low traffic):
- ~$5-15/month (scales to zero)

**Production** (moderate traffic):
- ~$50-150/month (depends on traffic)

**Note**: Costs vary based on:
- Number of requests
- Request duration
- CPU/Memory allocation
- Network egress

---

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Artifact Registry Guide](https://cloud.google.com/artifact-registry/docs)
- [Secret Manager Guide](https://cloud.google.com/secret-manager/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions for GCP](https://github.com/google-github-actions)

---

## Support

For issues or questions:
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review Cloud Run logs
- Open an issue on GitHub
- Contact DevOps team

---

**Last Updated**: 2025-11-24
