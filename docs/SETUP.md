# Setup Guide

Complete setup instructions for Focus Notebook including Firebase, deployment, and environment configuration.

---

## Local Setup (No Cloud Sync)

The app works completely offline without any configuration:

```bash
git clone https://github.com/mesbahtanvir/personal-notebook.git
cd personal-notebook
npm install
npm run dev
```

Open http://localhost:3000 - you're done!

---

## Firebase Setup (Optional - For Cloud Sync)

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project"
3. Enter project name and complete setup

### 2. Enable Services

**Authentication:**
- Go to Authentication → Get Started
- Enable Email/Password or Google sign-in

**Firestore Database:**
- Go to Firestore Database → Create Database
- Choose production mode
- Select region

### 3. Get Configuration

1. Go to Project Settings → General
2. Scroll to "Your apps" → Add Web App
3. Copy the configuration values

### 4. Configure Environment Variables

Create `.env.local` in project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 5. Configure Firestore Security Rules

In Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click "Publish" to deploy rules.

---

## Deployment

### Deploy to Vercel (Recommended)

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all `NEXT_PUBLIC_*` variables from `.env.local`
   - Add to Production, Preview, and Development

4. **Deploy**
   - Click "Deploy"
   - Vercel auto-deploys on every push to main

**Custom Domain (Optional):**
- Go to Project Settings → Domains
- Add your custom domain
- Follow DNS configuration instructions

### Deploy to Other Platforms

**Netlify:**
```bash
npm run build
# Upload .next folder via Netlify UI
```

**Self-hosted:**
```bash
npm run build
npm run start  # Runs on port 3000
```

---

## iPad App Setup

Build and run on iPad using Capacitor.

### Prerequisites

```bash
# Install Xcode (Mac App Store)
# Install CocoaPods
brew install cocoapods
```

### Build iPad App

```bash
# 1. Install iOS dependencies
cd ios/App
pod install
cd ../..

# 2. Build web app
npm run build

# 3. Sync to iOS
npx cap sync ios

# 4. Open in Xcode
open ios/App/App.xcworkspace
```

### Run in Xcode

1. Select iPad simulator (iPad Pro recommended)
2. Press `⌘R` to build and run
3. App opens in simulator

### Deploy to App Store

See [IPAD_GUIDE.md](../IPAD_GUIDE.md) for complete App Store submission guide.

---

## Environment Variables Reference

### Required (For Cloud Sync)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSyC...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID | `my-project-123` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID | `1:123:web:abc` |

### Optional (For AI Features)

These are configured in Firebase Functions, not the web app:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API for thought processing |
| `ANTHROPIC_API_KEY` | Claude API (alternative to OpenAI) |
| `STRIPE_SECRET` | Stripe for billing |
| `ALPHA_VANTAGE_API_KEY` | Stock price data |

See [FUNCTIONS.md](./FUNCTIONS.md) for Firebase Functions setup.

---

## Troubleshooting

### Firebase not connecting

**Check:**
1. Environment variables are set correctly
2. Firebase project is active
3. Browser console for errors

**Fix:**
```bash
# Verify .env.local exists and has correct values
cat .env.local

# Restart dev server
npm run dev
```

### Authentication not working

**Check:**
1. Email/Password enabled in Firebase Console
2. Auth domain in environment variables is correct

### Firestore permission denied

**Check:**
1. Security rules are published
2. User is signed in
3. Rules allow access to user's own data

### Build fails

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

---

## Production Checklist

Before deploying to production:

- [ ] Environment variables set in hosting platform
- [ ] Firebase security rules published
- [ ] Firebase project in production mode
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled (optional)
- [ ] Error monitoring set up (optional)

---

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Open an Issue](https://github.com/mesbahtanvir/personal-notebook/issues)
