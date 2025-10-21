# Cloud Sync Documentation

Complete guide to cloud synchronization with Firebase.

## Overview

Personal Notebook uses an **offline-first architecture** with optional cloud sync:

- ✅ **Works offline** - All features available without internet
- 💾 **Local storage** - Data stored in IndexedDB (browser database)
- ☁️ **Cloud sync** - Optional Firebase sync for multi-device access
- 🔄 **Automatic** - Syncs in background every 5 minutes when authenticated
- ⚡ **Real-time** - Immediate local updates, background cloud sync

## How It Works

### Data Flow

```
User Action
    ↓
1. Update Zustand Store (in-memory state)
    ↓
2. Save to IndexedDB (local persistence)
    ↓
3. Push to Firebase (if authenticated)
```

### Sync Strategy

**Push (Local → Cloud)**:
- Happens after every data change
- Uses `updatedAt` timestamp to track changes
- Retries on failure
- Queued when offline

**Pull (Cloud → Local)**:
- On app startup
- Every 5 minutes (AutoSync component)
- Manual sync available
- Merges with local data

**Conflict Resolution**:
- Most recent `updatedAt` wins
- Local changes always saved first
- Cloud sync is secondary

## Setup

See [FIREBASE-SETUP.md](./FIREBASE-SETUP.md) for detailed Firebase configuration.

### Quick Start

1. **Create Firebase project**
2. **Enable Authentication** (Email/Password)
3. **Create Firestore database**
4. **Configure security rules**
5. **Add environment variables** to `.env.local`
6. **Deploy** and test

## Implementation Details

### Sync Engine (`src/lib/syncEngine.ts`)

**Core Functions**:

```typescript
// Push single item to cloud
pushItemToCloud(collection: string, item: any): Promise<void>

// Delete item from cloud
deleteItemFromCloud(collection: string, itemId: string): Promise<void>

// Push all local items to cloud
syncAllToCloud(): Promise<void>

// Pull all cloud items to local
syncAllFromCloud(): Promise<void>
```

**Features**:
- Automatic retry on network errors
- Batch operations for efficiency
- Error logging and recovery
- Timestamp-based conflict resolution

### Auto Sync Component (`src/components/AutoSync.tsx`)

**Responsibilities**:
- Runs sync every 5 minutes
- Only when user is authenticated
- Handles connection state
- Shows sync status

**How it works**:
```typescript
useEffect(() => {
  if (!user) return;
  
  const syncInterval = setInterval(async () => {
    await syncToCloud();
  }, 5 * 60 * 1000); // 5 minutes
  
  return () => clearInterval(syncInterval);
}, [user]);
```

### Data Collections

**Firestore Structure**:
```
users/{userId}/
  tasks/{taskId}
  thoughts/{thoughtId}
  moods/{moodId}
  focusSessions/{sessionId}
```

**Each document contains**:
- All item properties
- `updatedAt`: Timestamp for conflict resolution
- `createdAt`: Original creation time

## Offline Support

### IndexedDB Persistence

**Enabled by default** in `src/lib/firebase.ts`:

```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support
  }
});
```

**Benefits**:
- Offline data access
- Faster reads (from cache)
- Automatic background sync
- Reduced bandwidth

### Network Detection

The app automatically detects:
- ✅ Online: Normal sync
- ❌ Offline: Queue changes
- 🔄 Reconnection: Sync queued changes

## Security

### Firestore Rules

```javascript
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

**Security Features**:
- User data isolation
- Authentication required
- No public access
- Server-side validation

### Data Privacy

- 🔒 **Local-first**: Data stored locally by default
- 🔐 **Encrypted transit**: HTTPS for all requests
- 👤 **User isolation**: Each user's data completely separate
- 🚫 **No tracking**: We don't access or analyze your data
- 💻 **Open source**: Audit the code yourself

## Troubleshooting

### Sync Not Working

**Problem**: Changes not appearing on other devices

**Solutions**:
1. Check authentication status
2. Verify internet connection
3. Check browser console for errors
4. Manually trigger sync (log out/in)
5. Check Firestore in Firebase Console

### Data Conflicts

**Problem**: Different data on different devices

**Solutions**:
1. Most recent changes win (by `updatedAt`)
2. Log out and log in to force full sync
3. Export data before major changes
4. Check Firestore for data integrity

### Performance Issues

**Problem**: Slow sync or high bandwidth usage

**Solutions**:
1. Reduce sync frequency (modify AutoSync interval)
2. Enable offline persistence (already enabled)
3. Limit amount of data synced
4. Check Firebase quotas

### Permission Denied

**Problem**: "Missing or insufficient permissions"

**Solutions**:
1. Check Firestore security rules are published
2. Verify user is authenticated
3. Ensure userId matches path
4. Check browser console for auth errors

## Monitoring

### Firebase Console

**Check**:
- Authentication → Users (verify user exists)
- Firestore Database → Data (verify data structure)
- Usage tab → Quotas (monitor limits)

### Browser DevTools

**Check**:
- Console for errors
- Network tab for failed requests
- Application → IndexedDB (local data)
- Application → Storage (check quota usage)

## Best Practices

### Development

✅ **Do**:
- Test offline functionality
- Handle sync errors gracefully
- Show sync status to users
- Validate data before syncing
- Log errors for debugging

❌ **Don't**:
- Assume internet is always available
- Block UI during sync
- Sync on every keystroke
- Store sensitive data unencrypted
- Ignore error handlers

### Production

✅ **Do**:
- Monitor Firebase usage
- Set up budget alerts
- Back up data regularly
- Test multi-device scenarios
- Handle edge cases

❌ **Don't**:
- Exceed Firebase quotas
- Ignore error logs
- Skip testing conflict resolution
- Forget to update security rules
- Hardcode credentials

## Advanced Configuration

### Custom Sync Interval

Modify `src/components/AutoSync.tsx`:

```typescript
const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes

useEffect(() => {
  const interval = setInterval(async () => {
    await syncToCloud();
  }, SYNC_INTERVAL);
  
  return () => clearInterval(interval);
}, [user]);
```

### Selective Sync

Sync only specific collections:

```typescript
// Sync only tasks
await pushItemToCloud('tasks', task);

// Skip sync for sensitive data
// Just save locally without calling pushItemToCloud
```

### Batch Operations

For better performance:

```typescript
const batch = writeBatch(db);

items.forEach(item => {
  const ref = doc(db, `users/${userId}/items/${item.id}`);
  batch.set(ref, item);
});

await batch.commit();
```

## Migration Notes

### From Local-Only to Cloud Sync

When user first signs in:
1. All local data automatically uploaded
2. Happens in background
3. May take a few minutes for large datasets
4. Check Firebase Console to verify

### Between Devices

When signing in on new device:
1. App downloads all cloud data
2. Merges with any local data
3. Most recent version wins conflicts
4. Starts automatic sync

## API Reference

### syncToCloud()

Uploads all local changes to Firebase.

```typescript
async function syncToCloud(): Promise<SyncResult>
```

**Returns**: 
```typescript
{
  success: boolean
  error?: string
  timestamp: string
}
```

### syncFromCloud()

Downloads all cloud data to local storage.

```typescript
async function syncFromCloud(): Promise<void>
```

### pushItemToCloud()

Uploads single item to cloud.

```typescript
async function pushItemToCloud(
  collection: string,
  item: any
): Promise<void>
```

### deleteItemFromCloud()

Deletes item from cloud.

```typescript
async function deleteItemFromCloud(
  collection: string,
  itemId: string
): Promise<void>
```

## Future Enhancements

- [ ] Real-time sync (Firestore listeners)
- [ ] Selective sync (choose what to sync)
- [ ] Conflict resolution UI
- [ ] Sync status indicators
- [ ] Offline queue management
- [ ] Backup/restore functionality

---

*Cloud Sync documentation last updated: October 2025*
