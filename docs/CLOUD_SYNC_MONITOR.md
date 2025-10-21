# Cloud Sync Monitor

A comprehensive monitoring tool for tracking all cloud synchronization operations, conflicts, and merges.

## Overview

The Cloud Sync Monitor provides real-time visibility into all sync operations between your local IndexedDB and Firebase Firestore, helping you debug sync issues and understand data flow.

## Features

### 📊 Statistics Dashboard
- **Total Syncs**: Count of all sync operations
- **Successful Syncs**: Successfully completed operations
- **Failed Syncs**: Operations that encountered errors
- **Conflicts**: Data conflicts that required resolution
- **Pending Operations**: Operations waiting to be processed

### 📝 Sync History
- **Push Operations**: Local → Cloud uploads
- **Pull Operations**: Cloud → Local downloads
- **Conflicts**: Data conflicts between local and cloud
- **Merges**: Conflict resolution operations
- **Errors**: Failed operations with error details

### 🔍 Filtering & Search
- Filter by: All, Success, Failed, Conflicts
- Real-time updates every 5 seconds
- Detailed operation logs
- Expandable details for debugging

## Access

Navigate to: `/admin/sync-monitor`

Or click "Cloud Sync Monitor" button on the Debug Dashboard (`/admin`)

## Data Tracked

Each sync operation logs:
- **ID**: Unique operation identifier
- **Timestamp**: When the operation occurred
- **Operation Type**: push, pull, conflict, merge, error
- **Collection**: tasks, thoughts, moods, focusSessions
- **Item ID**: Specific item affected (if applicable)
- **Status**: success, failed, pending
- **Items Affected**: Number of items synced
- **Conflict Resolution**: How conflicts were resolved (local, remote, merged)
- **Error Message**: Error details if operation failed
- **Details**: Additional JSON data

## Database Schema

```typescript
syncHistory: {
  id: string                           // Unique ID
  timestamp: string                    // ISO timestamp
  operation: 'push' | 'pull' | 'conflict' | 'merge' | 'error'
  collection?: string                  // Data collection
  itemId?: string                      // Item ID
  status: 'success' | 'failed' | 'pending'
  details?: string                     // JSON details
  errorMessage?: string                // Error message
  conflictResolution?: 'local' | 'remote' | 'merged'
  itemsAffected?: number              // Count of items
}
```

## Implementation

### Database (IndexedDB v11)

Added `syncHistory` table to track all operations:

```typescript
// src/db/index.ts
version(11).stores({
  // ... other tables
  syncHistory: '&id, timestamp, operation, status',
})
```

### Logging Function

```typescript
// src/lib/syncEngine.ts
async function logSyncOperation(entry: Omit<SyncHistoryRow, 'id' | 'timestamp'>) {
  await localDb.syncHistory.add({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    ...entry,
  })
}
```

### Component

```typescript
// src/components/CloudSyncMonitor.tsx
export function CloudSyncMonitor() {
  // Loads and displays sync history
  // Auto-refreshes every 5 seconds
  // Provides filtering and stats
}
```

## Usage Example

### Viewing Sync History

1. Navigate to `/admin/sync-monitor`
2. View real-time stats in the cards
3. Filter by operation type
4. Click on any operation to see details

### Debugging Sync Issues

1. Look for failed operations (red cards)
2. Check error messages
3. Review timestamps to identify patterns
4. Check conflict resolutions

### Monitoring Active Syncs

- **Pending Operations**: Yellow cards show queued operations
- **In-Progress**: Operations currently executing
- **Completed**: Green cards show successful syncs

## Auto-Logging

Sync operations are automatically logged when:

- **Push**: Item uploaded to cloud
  ```typescript
  await pushItemToCloud('tasks', task)
  // Automatically logs push operation
  ```

- **Pull**: Items downloaded from cloud
  ```typescript
  await smartSync()
  // Automatically logs pull operations
  ```

- **Delete**: Item removed from cloud
  ```typescript
  await deleteItemFromCloud('tasks', taskId)
  // Automatically logs deletion
  ```

- **Conflicts**: When local and cloud data differ
  ```typescript
  // Automatically logs conflicts and resolutions
  ```

## Color Coding

### Status Colors
- 🟢 **Green**: Success
- 🔴 **Red**: Failed
- 🟡 **Yellow**: Pending

### Operation Colors
- 🔵 **Blue**: Push (upload)
- 🟣 **Purple**: Pull (download)
- 🟠 **Orange**: Conflict
- 🔷 **Teal**: Merge

## Actions

### Refresh
Manually reload sync history to see latest operations.

### Clear History
Remove all sync history entries. Useful for:
- Testing
- Reducing database size
- Starting fresh

**Note**: This only clears the history log, not your actual data.

## Performance

- History limited to last 100 operations
- Auto-refresh every 5 seconds
- Efficient IndexedDB queries
- Minimal impact on app performance

## Privacy

- All sync history stored locally in IndexedDB
- Not sent to any servers
- Only visible to you
- Can be cleared at any time

## Future Enhancements

- [ ] Export sync history as JSON
- [ ] Advanced filtering (date range, collection)
- [ ] Sync conflict resolution UI
- [ ] Manual retry for failed operations
- [ ] Sync performance metrics
- [ ] Real-time sync status indicators
- [ ] Push notifications for sync errors

## Troubleshooting

### No Sync History

**Problem**: Monitor shows no data

**Solutions**:
- Sign in to enable cloud sync
- Perform some actions (create task, thought, etc.)
- Wait for auto-sync or manually sync
- Check if sync is enabled in settings

### Too Many Failed Operations

**Problem**: Many red/failed operations

**Solutions**:
- Check internet connection
- Verify Firebase credentials
- Check Firestore security rules
- Review error messages for specific issues

### Conflicts Not Resolving

**Problem**: Repeated conflicts for same items

**Solutions**:
- Check timestamp accuracy on devices
- Ensure devices are time-synchronized
- Review conflict resolution strategy
- Check if multiple devices modifying same data

## Related Documentation

- [CLOUD-SYNC.md](./CLOUD-SYNC.md) - How cloud sync works
- [FIREBASE-SETUP.md](./FIREBASE-SETUP.md) - Firebase configuration
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

---

*Cloud Sync Monitor documentation - October 2025*
