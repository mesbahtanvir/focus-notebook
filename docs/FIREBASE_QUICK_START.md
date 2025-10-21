# Firebase Quick Start

Get Firebase authentication running in 5 minutes!

## Quick Setup Steps

### 1. Create Firebase Project
```
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it (e.g., "focus-notebook")
4. Create
```

### 2. Enable Google Auth
```
1. Click "Authentication" → "Get started"
2. Click "Google" provider
3. Enable it
4. Add your email as support email
5. Save
```

### 3. Get Configuration
```
1. Click gear icon ⚙️ → "Project settings"
2. Scroll to "Your apps"
3. Click web icon </>
4. Register app
5. Copy the config object
```

### 4. Add to Project
```bash
# Copy example file
cp .env.local.example .env.local

# Edit .env.local with your Firebase config
# Paste values from step 3
```

### 5. Enable Firestore
```
1. Click "Firestore Database" → "Create database"
2. Start in production mode
3. Choose location
4. Enable
```

### 6. Add Security Rules
```javascript
// In Firestore → Rules tab
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 7. Test It!
```bash
npm run dev
# Visit http://localhost:3000/login
# Click "Continue with Google"
```

## That's It!

Your app now has:
- ✅ Google OAuth login
- ✅ Secure authentication
- ✅ Cloud database ready
- ✅ User profiles

For detailed setup and security rules, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

## Troubleshooting

**Popup blocked?**
- Allow popups for localhost

**Auth error?**
- Check `.env.local` exists
- Restart dev server (`npm run dev`)

**Permission denied?**
- Add security rules (step 6)

## Next Steps

- See full documentation: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- Deploy to production with proper security rules
- Set up data migration from IndexedDB
