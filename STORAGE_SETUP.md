# Firebase Storage Setup

## Storage Bucket Configuration

The correct storage bucket name is **without** the `.firebasestorage.app` suffix:

```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=focus-yourthoughts-ca
```

❌ **Incorrect**: `focus-yourthoughts-ca.firebasestorage.app`
✅ **Correct**: `focus-yourthoughts-ca`

## Apply CORS Rules

Firebase Storage CORS rules need to be applied separately using `gsutil`. Run this command to apply the CORS configuration from `cors.json`:

```bash
gsutil cors set cors.json gs://focus-yourthoughts-ca
```

### If you don't have gsutil installed:

1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project focus-yourthoughts-ca`
4. Apply CORS: `gsutil cors set cors.json gs://focus-yourthoughts-ca`

### Verify CORS configuration:

```bash
gsutil cors get gs://focus-yourthoughts-ca
```

## Deploy Storage Security Rules

The storage security rules will be deployed automatically when you run:

```bash
firebase deploy --only storage
```

Or as part of a full deployment:

```bash
firebase deploy
```

## Testing

After applying CORS and deploying rules:

1. Upload a CSV file through the Spending Tool
2. Check browser console for any CORS errors
3. Verify file uploads successfully to `users/{userId}/statements/`

## Security Rules Overview

- ✅ Authenticated users can read/write their own statement files
- ❌ All other access is denied
- Files are stored in: `users/{userId}/statements/{timestamp}_{filename}.csv`
