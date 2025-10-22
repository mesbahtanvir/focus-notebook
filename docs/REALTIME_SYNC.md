# Real-Time Sync Documentation

## Overview

The application now features **real-time bidirectional sync** using Firestore listeners, replacing the old 5-minute polling system. Changes made on one device now appear on other devices in **less than 1 second**.

## Key Features

### ⚡ Real-Time Sync
- **Firestore listeners** track cloud changes in real-time
- **< 1 second latency** between devices
- **Automatic updates** - no manual refresh needed
- **Incremental sync** - only changed items are transferred

### 🔄 Smart Conflict Resolution
- **Timestamp-based merging** - most recent changes win
- **Field-level merging** - preserves non-conflicting changes
- **Automatic conflict resolution** - no user intervention needed

### 📱 Multi-Device Experience
- **Seamless cross-device** - iPhone, iPad, Mac, Windows
- **Instant updates** - mark task done on mobile, see on laptop immediately
- **Offline support** - works offline, syncs when back online
- **Visual feedback** - toast notifications for sync status

### 🔐 Reliability
- **Fallback sync** - 10-minute periodic sync as safety net
- **Retry logic** - automatic retries with exponential backoff
- **Error handling** - graceful degradation on errors

## Architecture

### Components

#### 1. **useRealtimeSync Hook** (`src/hooks/useRealtimeSync.ts`)
- Sets up Firestore listeners for all collections
- Listens for changes in: tasks, thoughts, moods, focus sessions
- Incrementally syncs only items updated after last sync
- Handles online/offline transitions

#### 2. **useSyncStatus Store** (`src/store/useSyncStatus.ts`)
- Manages sync status state
- Tracks: syncing, synced, error, offline
- Monitors online/offline status
- Provides sync statistics

#### 3. **SyncToast Component** (`src/components/SyncToast.tsx`)
- Shows real-time sync notifications
- Visual feedback for: syncing, synced, errors
- Auto-hides after success
- Persistent for errors

#### 4. **Updated AutoSync Component** (`src/components/AutoSync.tsx`)
- Initializes real-time listeners on login
- Performs full sync on app startup
- Fallback periodic sync every 10 minutes
- Coordinates between real-time and batch sync

### Data Flow

```
Device A (Mobile)
  ↓
1. User marks task as done
  ↓
2. Task store updates local state immediately (optimistic UI)
  ↓
3. Save to local IndexedDB with updatedAt timestamp
  ↓
4. Push to Firestore (pushItemToCloud)
  ↓
5. Firestore updates cloud document
  ↓
6. Firestore triggers onSnapshot listener on Device B
  ↓
7. Device B (Laptop) receives change notification
  ↓
8. useRealtimeSync processes the change
  ↓
9. Merge with local data (if needed)
  ↓
10. Update local IndexedDB
  ↓
11. Reload task store
  ↓
12. UI updates automatically
  ↓
Total time: < 1 second
```

## Database Schema Changes

### Added `updatedAt` field
All database tables now include `updatedAt: number` for tracking modifications:

```typescript
// TaskRow, ThoughtRow, MoodRow, FocusSessionRow
{
  id: string
  // ... other fields
  updatedAt?: number  // ← NEW: Timestamp for sync tracking
}
```

### Database Version
- **Version 12**: Added `updatedAt` field to all tables
- Automatic migration on app startup
- Backward compatible

## Configuration

### Sync Intervals

```typescript
// Real-time sync
- Instant via Firestore listeners (< 1 second)

// Fallback sync
- Every 10 minutes (safety net)

// Initial sync
- 3 seconds after login
```

### Firestore Queries

```typescript
// Incremental sync query
collection(`users/${userId}/tasks`)
  .where('updatedAt', '>', lastSyncTime)
```

## Usage

### For Users

**No configuration needed!** The sync works automatically:

1. **Login** - Initial sync starts
2. **Make changes** - Auto-saved locally and to cloud
3. **Switch devices** - Changes appear automatically
4. **Go offline** - Still works, syncs when back online

### For Developers

#### Enable/Disable Real-Time Sync

Real-time sync is enabled by default. To disable:

```typescript
// In AutoSync.tsx, comment out:
// useRealtimeSync();
```

#### Monitor Sync Status

```typescript
import { useSyncStatus } from '@/store/useSyncStatus'

function MyComponent() {
  const { status, lastSyncTime, itemsSynced } = useSyncStatus()
  
  // status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
  // lastSyncTime: number | null
  // itemsSynced: number
}
```

#### Manual Sync Trigger

```typescript
import { smartSync } from '@/lib/syncEngine'

async function manualSync() {
  const result = await smartSync()
  if (result.success) {
    console.log(`Synced ${result.mergedItems} items`)
  }
}
```

## Performance

### Bandwidth Optimization

**Before (Polling):**
- Every 5 minutes: Download ALL tasks + thoughts + moods + sessions
- ~50-500KB per sync (depending on data size)
- ~6MB - 60MB per hour

**After (Real-Time):**
- Only download changed items
- ~1-10KB per change
- ~100KB - 1MB per hour (typical usage)

**Savings: ~95% reduction in bandwidth**

### Latency

| Method | Latency | Use Case |
|--------|---------|----------|
| Real-time Listeners | < 1 second | Primary sync method |
| Fallback Sync | 10 minutes | Safety net |
| Manual Sync | Instant | User-triggered |

## Conflict Resolution

### How It Works

1. **Timestamp Comparison**
   - Each item has `updatedAt` timestamp
   - Most recent timestamp wins

2. **Field-Level Merging**
   - Non-conflicting fields preserved from both versions
   - Arrays deduplicated
   - Objects deep-merged

3. **Example Conflict**

```typescript
// Device A (5:00 PM)
task = {
  id: '123',
  title: 'Write report',
  notes: 'Include charts',
  updatedAt: 1700000000
}

// Device B (5:01 PM) - updated different field
task = {
  id: '123',
  title: 'Write report',
  priority: 'high',  // ← New field
  updatedAt: 1700000060
}

// Merged Result
task = {
  id: '123',
  title: 'Write report',
  notes: 'Include charts',  // ← Kept from Device A
  priority: 'high',          // ← Kept from Device B
  updatedAt: 1700000060      // ← Most recent timestamp
}
```

## Troubleshooting

### Issue: Sync Not Working

**Check:**
1. User is authenticated
2. Internet connection active
3. Browser console for errors
4. Firestore permissions configured

**Solution:**
```bash
# Check browser console
# Look for: "🔄 Setting up real-time listener for tasks"

# Manual sync
import { smartSync } from '@/lib/syncEngine'
await smartSync()
```

### Issue: Changes Not Appearing on Other Device

**Check:**
1. Both devices logged in with same account
2. Real-time listeners active
3. Network connectivity

**Solution:**
- Wait 10 minutes for fallback sync
- Or manually refresh the page
- Check CloudSyncMonitor for errors

### Issue: High Battery Usage on Mobile

**Cause:** Real-time listeners maintain persistent connection

**Solution:**
```typescript
// Reduce fallback sync frequency in AutoSync.tsx
}, 1800000); // 30 minutes instead of 10
```

## Migration from Old System

### What Changed

**Before:**
- ✅ 5-minute polling interval
- ✅ Full sync every time
- ✅ Push-only for changes
- ❌ No real-time updates
- ❌ Up to 5-minute latency

**After:**
- ✅ Real-time Firestore listeners
- ✅ Incremental sync (only changes)
- ✅ Bidirectional sync
- ✅ < 1 second latency
- ✅ 10-minute fallback sync

### Backward Compatibility

The new system is **fully backward compatible**:
- Old data migrates automatically
- No user action required
- Old and new clients can coexist
- Gradual rollout safe

## Testing

### Test Real-Time Sync

1. **Open app on two devices**
2. **Login with same account**
3. **Create task on Device A**
4. **Watch Device B** - should appear in < 1 second
5. **Mark task done on Device B**
6. **Check Device A** - should update immediately

### Test Offline Mode

1. **Disable internet on Device A**
2. **Create tasks offline**
3. **Re-enable internet**
4. **Verify** - tasks sync automatically

### Test Conflict Resolution

1. **Go offline on both devices**
2. **Modify same task differently**
3. **Go online**
4. **Verify** - both changes merged

## Monitoring

### Sync Statistics

Available in `useSyncStatus` store:

```typescript
{
  status: 'synced',
  lastSyncTime: 1700000000,
  itemsSynced: 42,
  error: null,
  isOnline: true
}
```

### Sync History

View in CloudSyncMonitor component:
- Operation type (push/pull/merge)
- Timestamp
- Items affected
- Success/failure status
- Error messages

### Browser Console Logs

```
🔄 Setting up real-time listener for tasks
📥 Received 3 changes in tasks
✅ Synced 3 items from tasks
```

## Future Enhancements

### Planned Features

- [ ] Selective sync (choose what to sync)
- [ ] Sync progress bar
- [ ] Per-item sync indicators
- [ ] Conflict resolution UI (manual)
- [ ] Sync queue management
- [ ] Bandwidth usage monitor
- [ ] Custom sync rules

### Performance Optimizations

- [ ] Batch small changes (debounce)
- [ ] Compress data before sync
- [ ] Local-first optimistic UI
- [ ] Background sync worker

## API Reference

### useRealtimeSync()

Hook to initialize real-time sync listeners.

```typescript
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

function App() {
  useRealtimeSync() // Initialize listeners
}
```

### useSyncStatus()

Hook to access sync status.

```typescript
const { 
  status,        // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
  lastSyncTime,  // number | null
  itemsSynced,   // number
  error,         // string | null
  isOnline       // boolean
} = useSyncStatus()
```

### smartSync()

Perform full bidirectional sync.

```typescript
import { smartSync } from '@/lib/syncEngine'

const result = await smartSync()
// result.success: boolean
// result.mergedItems: number
// result.conflicts: number
// result.error?: string
```

---

**Documentation last updated:** October 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
