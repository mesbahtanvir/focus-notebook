# Mobile Sync Troubleshooting Guide

## Issue: Data Not Syncing on iPhone/iPad

If data created on iPhone or iPad is not syncing to the cloud, follow this comprehensive troubleshooting guide.

## Quick Checks

### 1. Check Authentication Status

**On iPhone/iPad:**
1. Open the app
2. Go to Settings or Profile page
3. Verify you're logged in with Google
4. Check that email is displayed

**Look for:**
- ✅ Green checkmark or "Signed in as..." message
- ❌ "Sign in" button (means not authenticated)

### 2. Check Internet Connection

**Test connectivity:**
- Open Safari and visit any website
- Ensure WiFi or cellular data is working
- Try switching between WiFi and cellular

### 3. Check Firebase Console

**Verify data in Firebase:**
1. Go to https://console.firebase.google.com
2. Select your project
3. Navigate to Firestore Database
4. Look for `users/[your-uid]/tasks` collection
5. Check if any data exists

## Common Issues & Solutions

### Issue 1: Not Logged In

**Symptoms:**
- No cloud icon or sync status
- Data only visible on one device
- No "Signed in as..." message

**Solution:**
```
1. Go to Settings/Profile
2. Click "Sign in with Google"
3. Complete authentication
4. Wait for auto-sync to complete
```

### Issue 2: Authentication Expired

**Symptoms:**
- Was working, then stopped
- "Authentication error" in console
- Forced to re-login

**Solution:**
```
1. Sign out completely
2. Close and reopen app
3. Sign in again with Google
4. Check if sync resumes
```

### Issue 3: Network Permissions

**Symptoms:**
- Works on desktop, not on mobile
- "Network request failed" errors
- Sync works on WiFi, not cellular

**Solution (iOS):**
```
1. Open iOS Settings
2. Scroll to your app
3. Enable "Cellular Data"
4. Enable "Background App Refresh"
```

### Issue 4: Firebase Rules

**Symptoms:**
- Authentication works
- Data doesn't sync
- "Permission denied" errors

**Check Firebase Rules:**
```javascript
// Correct rules in Firestore:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

### Issue 5: IndexedDB Issues

**Symptoms:**
- Data created but not saved locally
- App forgets data on refresh
- Works in incognito, not normal mode

**Solution (Safari on iOS):**
```
1. Open Settings > Safari
2. Clear History and Website Data
3. Disable "Prevent Cross-Site Tracking" (temporarily)
4. Reopen app and try again
```

### Issue 6: Capacitor Configuration

**Symptoms:**
- Native app doesn't sync
- Web version works fine
- Console shows CORS errors

**Check capacitor.config.ts:**
```typescript
{
  server: {
    androidScheme: "https",
    iosScheme: "https",
    hostname: "your-domain.com"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
}
```

## Diagnostic Steps

### Step 1: Check Console Logs

**On iPhone/iPad:**
1. Connect device to Mac
2. Open Safari on Mac
3. Enable Develop menu
4. Select your iPhone/iPad > Your App
5. Open Web Inspector Console
6. Look for error messages

**Common errors:**
```
❌ "User not authenticated" → Need to sign in
❌ "Permission denied" → Check Firebase rules  
❌ "Network request failed" → Check connectivity
❌ "Failed to push to cloud" → Authentication or rules issue
```

### Step 2: Test Manual Sync

**Using Force Sync:**
1. Go to `/admin` page on device
2. Scroll to "Force Sync" section
3. Click "Force Sync Now"
4. Watch for success or error message

**Expected outcomes:**
```
✅ "Sync completed successfully! Merged X items"
❌ "Please sign in to sync data" → Not authenticated
❌ "Permission denied" → Firebase rules issue
❌ "Network error" → Connectivity problem
```

### Step 3: Check Local Data

**Verify data is being created locally:**
1. Go to `/admin` page
2. Click "Show Data" under Local Database
3. Select "Tasks" tab
4. Check if created tasks appear

**If tasks don't appear locally:**
- IndexedDB might be disabled
- Browser storage might be full
- Check Safari settings

### Step 4: Verify Authentication

**Check auth.currentUser:**
1. Open browser console
2. Type: `await firebase.auth().currentUser`
3. Should return user object with uid, email, etc.

**If null:**
- User is not authenticated
- Need to sign in again
- Check if auth persists across refreshes

## Platform-Specific Issues

### iPhone-Specific

**Safari Private Browsing:**
- IndexedDB disabled in Private Browsing
- Use normal browsing mode

**iOS 13+ iPad Detection:**
- iPad might report as Mac (not iPhone)
- Should still work, just different device label

**Low Power Mode:**
- Background refresh might be disabled
- Sync might be delayed
- Enable in Settings > Battery

### iPad-Specific

**Split View/Slide Over:**
- App might be suspended
- Sync happens on resume
- Check if data appears after switching back

**Multitasking:**
- Multiple Safari tabs might conflict
- Close other tabs
- Use only one instance of app

## Testing Checklist

Use this checklist to systematically test sync:

```
Device Setup:
[ ] Connected to internet (WiFi or cellular)
[ ] Not in Low Power Mode
[ ] Background App Refresh enabled
[ ] Cellular Data enabled for app

Authentication:
[ ] Signed in with Google
[ ] Email address visible in profile
[ ] No "Sign in" button showing
[ ] auth.currentUser returns user object

Local Storage:
[ ] Can create tasks locally
[ ] Tasks appear in /admin Local Database
[ ] IndexedDB not disabled
[ ] Sufficient storage available

Cloud Connectivity:
[ ] Firebase console shows user data
[ ] Force Sync button works
[ ] Console shows "✅ Pushed to cloud" messages
[ ] No "Permission denied" errors

Cross-Device:
[ ] Data created on iPhone appears on Mac
[ ] Data created on iPad appears on iPhone
[ ] Changes sync within reasonable time
[ ] No duplicate items created
```

## Manual Sync Instructions

If automatic sync isn't working, use manual sync:

### Option 1: Force Sync Button

```
1. Navigate to /admin page
2. Find "Force Sync with Cloud" section
3. Click "Force Sync Now" button
4. Wait for success message
5. Check other devices
```

### Option 2: Sign Out/Sign In

```
1. Go to Profile/Settings
2. Click "Sign Out"
3. Close app completely
4. Reopen app
5. Sign in with Google
6. Auto-sync will trigger
```

### Option 3: Clear and Re-sync

```
WARNING: Only do this if you have backup!

1. Go to /admin page
2. Export/backup your data
3. Clear browser data
4. Sign in again
5. Data will sync from cloud
```

## Debug Mode

To enable detailed sync logging:

**Add to localStorage:**
```javascript
localStorage.setItem('DEBUG_SYNC', 'true');
```

This will show detailed sync logs in console:
```
🔄 Starting sync...
📤 Pushing tasks...
📥 Pulling from cloud...
✅ Sync complete!
```

## Getting Help

If issue persists after following this guide:

1. **Collect Information:**
   - Device type (iPhone 13, iPad Pro, etc.)
   - iOS version
   - Browser (Safari, Chrome, App)
   - Error messages from console
   - Screenshots if possible

2. **Check Firebase Status:**
   - Visit status.firebase.google.com
   - Check for service outages

3. **Test on Different Device:**
   - Try on desktop/laptop
   - If works there, issue is mobile-specific

4. **Check Firebase Quotas:**
   - Firebase console > Usage tab
   - Ensure not exceeding free tier limits

## Prevention

To avoid sync issues in the future:

1. **Stay Signed In:**
   - Don't sign out unless necessary
   - Authentication persists across sessions

2. **Regular Syncs:**
   - Use Force Sync button occasionally
   - Especially after creating many items

3. **Good Connectivity:**
   - Sync when on stable WiFi
   - Avoid syncing on poor cellular

4. **Monitor Status:**
   - Check /admin page occasionally
   - Look for "Last synced" timestamp

5. **Update App:**
   - Keep app updated to latest version
   - Updates may include sync fixes

## Technical Details

### How Sync Works

1. **On Creation:**
   ```typescript
   await db.tasks.add(task)           // Save locally
   await pushItemToCloud('tasks', task) // Push to cloud
   ```

2. **On Login:**
   ```typescript
   await smartSync()  // Merge local and cloud
   ```

3. **Smart Merge:**
   - Compares timestamps
   - Keeps most recent version
   - Resolves conflicts automatically

### Network Requirements

- **Outbound:** HTTPS to *.firebaseio.com
- **Ports:** 443 (HTTPS), 5353 (mDNS)
- **Protocols:** HTTP/2, WebSocket

### Storage Requirements

- **IndexedDB:** Enabled and available
- **Space:** At least 50MB free
- **Cookies:** Third-party cookies allowed for auth

---

*Last Updated: October 2025*
