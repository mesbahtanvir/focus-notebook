# Cloud Synchronization Guide

## Overview

Your Personal Notebook now automatically syncs all your data across devices using Firebase Firestore.

## How It Works

### Automatic Sync on Login ✅

When you log in on **any device**:
1. Your data is automatically downloaded from the cloud
2. All tasks, thoughts, moods, and focus sessions are loaded
3. You'll see all your data from other devices immediately

### Automatic Periodic Backup ✅

When you're logged in:
- Your data is automatically backed up to the cloud every **2 minutes**
- Initial backup happens 5 seconds after login
- All changes are saved silently in the background
- No action needed from you!

### Manual Sync (Settings Page)

You can also manually trigger sync from the Settings page:
- **"Sync to Cloud"** - Upload your local data to Firebase
- **"Sync from Cloud"** - Download cloud data to your device

## What Gets Synced

✅ **Tasks** - All your tasks with categories, priorities, and completion status  
✅ **Thoughts** - Your thoughts including CBT analysis  
✅ **Moods** - Mood entries with ratings  
✅ **Focus Sessions** - Pomodoro timer sessions  

## Multi-Device Usage

### First Time Setup

1. **Desktop**: Log in with Google → Your data is backed up
2. **Mobile/Other Device**: Log in with same Google account → Data automatically downloads
3. **Done!** Both devices stay in sync

### Regular Usage

- Work on **any device** - changes sync automatically
- Switch between devices seamlessly
- Data stays up-to-date across all your devices

## Sync Indicators

Watch the browser console for sync messages:
- `"User logged in, syncing data from cloud..."` - Login sync started
- `"Data synced successfully from cloud"` - Login sync complete
- `"Performing periodic cloud sync..."` - Background backup running
- `"Periodic cloud sync successful"` - Backup complete

## Troubleshooting

### Not seeing data from other devices?

1. **Check you're logged in** - Look for your profile in the sidebar
2. **Verify same Google account** - Must use identical account on all devices
3. **Wait a moment** - First sync takes a few seconds
4. **Check console** - Open browser DevTools (F12) and check for errors
5. **Manual sync** - Go to Settings → "Sync from Cloud"

### Data not backing up?

1. **Check internet connection** - Cloud sync requires internet
2. **Verify you're logged in** - Auto-sync only works when authenticated
3. **Check console** - Look for sync error messages
4. **Manual backup** - Settings → "Sync to Cloud"

### Conflict Resolution

Current implementation uses **last-write-wins**:
- Cloud data overwrites local when syncing FROM cloud
- Local data overwrites cloud when syncing TO cloud
- For best results, work on one device at a time

## Technical Details

### Sync Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Desktop   │◄───────►│   Firebase   │◄───────►│   Mobile    │
│  IndexedDB  │  Sync   │  Firestore   │  Sync   │  IndexedDB  │
└─────────────┘         └──────────────┘         └─────────────┘
```

### Data Storage

- **Local**: IndexedDB (offline-capable, fast)
- **Cloud**: Firebase Firestore (synced, secure)
- **User Isolation**: Data stored under `users/{userId}/...`

### Security

- ✅ Authentication required for all sync operations
- ✅ Data isolated per user (cannot access other users' data)
- ✅ Firebase Security Rules enforce user boundaries
- ✅ Undefined values cleaned before upload

### Sync Timing

- **On Login**: Immediate (within 1-2 seconds)
- **Periodic**: Every 2 minutes when logged in
- **Manual**: Instant when triggered from Settings

## Privacy

- Data only syncs when you're logged in
- Can work offline (local data persists)
- Logout does NOT delete local data
- Delete account to remove cloud data

## Future Enhancements

Planned improvements:
- [ ] Real-time sync (instant updates)
- [ ] Conflict resolution UI
- [ ] Selective sync (choose what to sync)
- [ ] Sync status indicator in UI
- [ ] Offline queue for failed syncs
- [ ] Data compression for faster sync

## Need Help?

Check browser console (F12) for detailed sync logs and errors.
