# Firebase Setup Guide

Complete guide to set up Firebase authentication and Firestore for Focus Notebook.

## Prerequisites

- Google account
- Node.js and npm installed
- Project already running locally

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `focus-notebook` (or your preferred name)
4. Disable Google Analytics (optional, can enable later)
5. Click **"Create project"**

## Step 2: Enable Authentication

1. In Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Click on **"Google"** sign-in provider
4. Toggle **"Enable"**
5. Enter support email (your email)
6. Click **"Save"**

## Step 3: Create Firestore Database

1. Click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add rules next)
4. Select a location (choose closest to your users)
5. Click **"Enable"**

## Step 4: Configure Firestore Security Rules

1. In Firestore Database, click **"Rules"** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tasks collection
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Thoughts collection
    match /thoughts/{thoughtId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Moods collection
    match /moods/{moodId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Focus sessions collection
    match /focusSessions/{sessionId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

## Step 5: Get Firebase Configuration

1. Click the gear icon ⚙️ next to **"Project Overview"**
2. Click **"Project settings"**
3. Scroll down to **"Your apps"**
4. Click the web icon `</>`
5. Enter app nickname: `focus-notebook-web`
6. Click **"Register app"**
7. Copy the `firebaseConfig` object

## Step 6: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and fill in your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=focus-notebook-xxx.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=focus-notebook-xxx
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=focus-notebook-xxx.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. **Never commit `.env.local`** to version control (it's already in `.gitignore`)

## Step 7: Configure Authorized Domains

1. In Firebase Console, go to **Authentication**
2. Click **"Settings"** tab
3. Scroll to **"Authorized domains"**
4. Add your domains:
   - `localhost` (already there)
   - Your production domain (e.g., `focus-notebook.vercel.app`)

## Step 8: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`

3. Click **"Continue with Google"**

4. Complete the Google sign-in flow

5. You should be redirected to the home page

6. Check your Firebase Console:
   - **Authentication** → You should see your user
   - **Firestore Database** → Collections will be created when you add data

## Step 9: Verify Firestore Collections

After signing in and using the app:

1. Go to **Firestore Database** in Firebase Console
2. You should see collections like:
   - `tasks`
   - `thoughts`
   - `moods`
   - `focusSessions`
3. Each document should have a `userId` field matching your auth UID

## Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to **Authorized domains** in Firebase Console
- Make sure you've added `localhost` for local development

### "Missing or insufficient permissions"
- Check Firestore Security Rules
- Verify rules allow read/write for authenticated users
- Make sure `userId` field is being set correctly

### "Firebase not configured"
- Verify `.env.local` exists and has all required variables
- Restart your development server after adding env variables
- Check for typos in environment variable names

### Sign-in popup blocked
- Allow popups for localhost in your browser
- Try using Chrome/Firefox if Safari blocks the popup

## Data Migration

### From IndexedDB to Firestore

Your local IndexedDB data will remain local until you migrate it. Options:

1. **Manual recreation**: Start fresh and recreate important items
2. **Export/import**: (Future feature) Export from IndexedDB, import to Firestore
3. **Dual mode**: Continue using IndexedDB for local-only mode

## Security Best Practices

1. ✅ Never commit `.env.local` or Firebase config to version control
2. ✅ Use Firestore Security Rules to protect user data
3. ✅ Each user can only access their own data
4. ✅ All documents include `userId` for access control
5. ✅ Firebase automatically encrypts data at rest and in transit

## Next Steps

1. **Set up Firestore data layer**: Migrate stores to use Firestore
2. **Add offline support**: Configure Firestore persistence
3. **Implement data sync**: Sync between local and cloud
4. **Add deployment**: Deploy to Vercel with environment variables

## Production Deployment

### Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Add environment variables:
   - Go to **Settings** → **Environment Variables**
   - Add all `NEXT_PUBLIC_FIREBASE_*` variables
   - Make sure to add for all environments (Production, Preview, Development)
4. Deploy!

### Environment Variables in Vercel

```
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = focus-notebook-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = focus-notebook-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = focus-notebook-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 123456789
NEXT_PUBLIC_FIREBASE_APP_ID = 1:123456789:web:abc123
```

## Cost Considerations

Firebase Free Tier (Spark Plan) includes:
- **Authentication**: 50,000 monthly active users
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Hosting**: 10GB storage, 360MB/day transfer

For personal use, the free tier should be more than sufficient!

## Support

If you encounter issues:
1. Check Firebase Console for error messages
2. Review browser console for client-side errors
3. Verify Firestore Security Rules are correct
4. Ensure all environment variables are set

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
