# Firebase Setup Guide

Complete guide for setting up Firebase authentication and Firestore for cloud sync.

## Prerequisites

- Firebase account (free tier is sufficient)
- Project repository cloned locally

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"**
3. Enter project name (e.g., "personal-notebook")
4. Choose whether to enable Google Analytics (optional)
5. Click **"Create project"**

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Toggle "Email link (passwordless sign-in)" if desired
   - Click "Save"

4. **(Optional)** Enable **Google** authentication:
   - Click on "Google"
   - Toggle "Enable"
   - Enter support email
   - Click "Save"

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add custom rules)
4. Select database location (choose closest to your users)
5. Click **"Enable"**

## Step 4: Configure Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User-specific data - only accessible by the user
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Prevent access to other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **"Publish"**

### Security Rules Explanation

- **User Data Isolation**: Each user can only access their own data under `/users/{userId}/`
- **Authentication Required**: All operations require the user to be authenticated
- **No Public Access**: No data is publicly accessible
- **Wildcard Protection**: `{document=**}` covers all subcollections

## Step 5: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click on **Web app** icon `</>`
4. Register your app:
   - Enter app nickname (e.g., "Personal Notebook Web")
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

5. Copy the Firebase configuration object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 6: Configure Environment Variables

1. Create `.env.local` file in project root:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

2. Add `.env.local` to `.gitignore` (already included)

## Step 7: Test the Connection

1. Start the development server:
```bash
npm run dev
```

2. Navigate to `http://localhost:3000/login`

3. Try creating an account:
   - Enter email and password
   - Click "Sign Up"
   - Should see success message

4. Check Firebase Console:
   - Go to **Authentication** → **Users**
   - Should see your new user

5. Check Firestore:
   - Go to **Firestore Database**
   - Should see `/users/{userId}` collection created when you add data

## Step 8: Deploy to Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Add Environment Variables:
   - Go to Project Settings → Environment Variables
   - Add all `NEXT_PUBLIC_FIREBASE_*` variables
   - Save

4. Deploy:
   - Vercel will automatically deploy
   - Production URL will have Firebase enabled

## Troubleshooting

### Authentication Not Working

**Problem**: "Firebase: Error (auth/invalid-api-key)"
- **Solution**: Check that `NEXT_PUBLIC_FIREBASE_API_KEY` is correct in `.env.local`
- **Solution**: Restart dev server after changing env variables

**Problem**: "Firebase: Error (auth/unauthorized-domain)"
- **Solution**: In Firebase Console → Authentication → Settings → Authorized domains
- **Solution**: Add your domain (e.g., `localhost`, your Vercel domain)

### Firestore Permission Denied

**Problem**: "Missing or insufficient permissions"
- **Solution**: Check Firestore security rules are published
- **Solution**: Ensure user is authenticated before accessing data
- **Solution**: Verify user ID matches the path `/users/{userId}`

### Data Not Syncing

**Problem**: Data saves locally but not to cloud
- **Solution**: Check internet connection
- **Solution**: Verify user is logged in (`auth.currentUser` exists)
- **Solution**: Check browser console for Firebase errors

**Problem**: Old data not loading from cloud
- **Solution**: Clear IndexedDB in browser DevTools
- **Solution**: Log out and log back in
- **Solution**: Check Firestore Console to verify data exists

## Best Practices

### Security
- ✅ Never commit `.env.local` to git
- ✅ Use environment variables for all Firebase config
- ✅ Keep Firebase API keys secure (they're scoped to your domain)
- ✅ Regularly review Firestore security rules
- ✅ Monitor Authentication usage in Firebase Console

### Performance
- ✅ Use offline persistence (enabled by default in this app)
- ✅ Limit Firestore reads with local caching
- ✅ Batch writes when possible
- ✅ Use indexes for complex queries

### Cost Management
- ✅ Firebase free tier is generous (50K reads/day, 20K writes/day)
- ✅ Monitor usage in Firebase Console
- ✅ Set up budget alerts
- ✅ Optimize sync frequency for your needs

## Firestore Data Structure

```
users/
  {userId}/
    tasks/
      {taskId}/
        - id: string
        - title: string
        - done: boolean
        - category: string
        - status: string
        - priority: string
        - createdAt: timestamp
        - updatedAt: timestamp
        - (other task fields)
    
    thoughts/
      {thoughtId}/
        - id: string
        - text: string
        - type: string
        - createdAt: timestamp
        - updatedAt: timestamp
        - (other thought fields)
    
    moods/
      {moodId}/
        - id: string
        - value: number
        - note: string
        - createdAt: timestamp
        - updatedAt: timestamp
    
    focusSessions/
      {sessionId}/
        - id: string
        - duration: number
        - startTime: timestamp
        - endTime: timestamp
        - tasksData: string (JSON)
        - updatedAt: timestamp
```

## Advanced Configuration

### Enable Offline Persistence

Already enabled in `src/lib/firebase.ts`:

```typescript
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const db = getFirestore(app);

if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser doesn\'t support persistence');
    }
  });
}
```

### Custom Claims (Advanced Users)

For role-based access control, set up Firebase Functions to assign custom claims.

### Firebase Functions (Optional)

If you need server-side logic, deploy Firebase Functions:

```bash
npm install -g firebase-tools
firebase init functions
```

## Support

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firestore Pricing**: https://firebase.google.com/pricing
- **Community Support**: https://firebase.google.com/support

---

*Setup guide last updated: October 2025*
