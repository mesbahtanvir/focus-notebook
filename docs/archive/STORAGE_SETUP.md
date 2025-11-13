# Firebase Storage Setup

## Storage Bucket Configuration

As of **October 30, 2024**, Firebase creates default buckets using the `.firebasestorage.app` domain:

```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=focus-yourthoughts-ca.firebasestorage.app
```

✅ **Recommended (new projects)**: `focus-yourthoughts-ca.firebasestorage.app`  
⚠️ **Legacy (pre‑Oct 2024 projects)**: `focus-yourthoughts-ca.appspot.com`

Both formats are supported by the app, but the new suffix is preferred for freshly created projects.

## Apply CORS Rules

Apply the CORS configuration to your bucket (replace with `.appspot.com` only if you are still on the legacy format):

```bash
gsutil cors set cors.json gs://focus-yourthoughts-ca.firebasestorage.app
```

> If `gsutil` returns `BucketNotFoundException`, open Firebase Console → Storage and click **Get started** to provision the default bucket, then rerun the command.

### If you don't have gsutil installed:

1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project focus-yourthoughts-ca`
4. Apply CORS: `gsutil cors set cors.json gs://focus-yourthoughts-ca.firebasestorage.app`

### Verify CORS configuration:

```bash
gsutil cors get gs://focus-yourthoughts-ca.firebasestorage.app
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
