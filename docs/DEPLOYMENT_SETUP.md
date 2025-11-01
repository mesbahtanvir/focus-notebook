# Firebase Cloud Functions Auto-Deployment Setup

This guide explains how to set up automatic deployment of Firebase Cloud Functions on every successful merge to the main branch.

## Overview

The deployment workflow is configured in [.github/workflows/cloud-functions-ci.yml](.github/workflows/cloud-functions-ci.yml) and will:

1. Run tests, linting, and security checks on PRs
2. Automatically deploy to Firebase when changes are merged to `main`
3. Comment on related PRs with deployment status

## Prerequisites

Before the auto-deployment will work, you need to set up the following:

### 1. Firebase Service Account

You need to create a service account with permissions to deploy Cloud Functions.

#### Step-by-step:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Name it something like `github-actions-deployer`
6. Grant the following roles:
   - `Firebase Admin`
   - `Cloud Functions Admin`
   - `Service Account User`
7. Click **Create Key** and select **JSON**
8. Download the JSON key file

### 2. Add GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** and add:

   **FIREBASE_SERVICE_ACCOUNT**
   - Copy the entire contents of the JSON key file you downloaded
   - Paste it as the secret value

   **FIREBASE_PROJECT_ID** (optional, but recommended)
   - Your Firebase project ID (e.g., `my-app-12345`)

### 3. Firebase Project Configuration

Ensure your [firebase.json](firebase.json) is properly configured:

```json
{
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "runtime": "nodejs20"
  }
}
```

### 4. Required Environment Variables

If your Cloud Functions require environment variables (like API keys), you need to set them using Firebase CLI:

```bash
# Set a secret
firebase functions:secrets:set OPENAI_API_KEY

# Or set a config value
firebase functions:config:set openai.key="your-key-here"

# View current config
firebase functions:config:get
```

**IMPORTANT:** Never commit `.env` files or API keys to your repository!

## How It Works

### On Pull Request

When you create a PR that modifies files in the `functions/` directory:

1. Linting and TypeScript checks run
2. Unit tests execute with coverage
3. Security audit checks for vulnerabilities
4. Build validation ensures the functions compile
5. Integration tests run against the Firebase emulator

### On Merge to Main

When your PR is merged to the `main` branch:

1. All the PR checks run again
2. **If all checks pass**, the `deploy` job runs automatically
3. Functions are built and deployed to Firebase
4. A success/failure comment is posted on related PRs

### Deployment Conditions

The deployment job only runs when:
- The event is a `push` (not a PR)
- The branch is `main`
- All previous jobs (`lint-and-test`, `build`, `security-check`, `validate-config`) succeed

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main' && success()
```

## Workflow Structure

```
Pull Request → Lint → Test → Build → Security Check → Validate Config
                                                              ↓
Merge to Main → (All above checks) → Deploy to Firebase → Notify
```

## Manual Deployment

If you need to deploy manually, you can still do so locally:

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build functions
cd functions
npm run build
cd ..

# Deploy
firebase deploy --only functions
```

## Troubleshooting

### Deployment fails with "Permission Denied"

- Verify your service account has the correct roles
- Check that the `FIREBASE_SERVICE_ACCOUNT` secret is set correctly
- Ensure the JSON is properly formatted (no extra spaces or newlines)

### Functions not updating after deployment

- Check the Firebase Console to see if deployment completed
- Look at the workflow logs in GitHub Actions
- Try running `firebase functions:log` to see runtime errors

### Environment variables not working

- Use `firebase functions:secrets:set` for sensitive values
- Verify secrets are accessible in your function code
- Check the Firebase Console > Functions > Configuration

### Build fails in CI but works locally

- Ensure all dependencies are in `package.json` (not just `package-lock.json`)
- Check that TypeScript compiles with `npx tsc --noEmit`
- Verify Node version matches (currently using Node 18)

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Use GitHub Secrets** for all sensitive data
3. **Review the security check** results in each PR
4. **Keep dependencies updated** to avoid vulnerabilities
5. **Use Firebase secrets** for runtime configuration

## Monitoring Deployments

### View Deployment History

1. Go to [GitHub Actions](../../actions)
2. Click on **Cloud Functions CI** workflow
3. Each run shows the deployment status

### Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Functions** to see deployed functions
4. Click on logs to monitor execution

## Customization

### Deploy to Staging First

To add a staging environment before production:

```yaml
deploy-staging:
  if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
  # ... deployment steps ...
  env:
    PROJECT_ID: ${{ secrets.FIREBASE_STAGING_PROJECT_ID }}
    GCP_SA_KEY: ${{ secrets.FIREBASE_STAGING_SERVICE_ACCOUNT }}
```

### Deploy Specific Functions Only

Modify the deployment args to target specific functions:

```yaml
args: deploy --only functions:functionName
```

### Add Approval Gates

For production deployments, add a manual approval:

```yaml
deploy:
  environment:
    name: production
    url: https://your-app.com
```

Then configure the environment in GitHub Settings > Environments.

## Getting Help

- Check the [GitHub Actions logs](../../actions)
- Review [Firebase Functions documentation](https://firebase.google.com/docs/functions)
- See the [w9jds/firebase-action docs](https://github.com/w9jds/firebase-action)

## Related Files

- [.github/workflows/cloud-functions-ci.yml](.github/workflows/cloud-functions-ci.yml) - Workflow definition
- [firebase.json](firebase.json) - Firebase configuration
- [functions/package.json](functions/package.json) - Functions dependencies
- [functions/src/index.ts](functions/src/index.ts) - Cloud Functions code
