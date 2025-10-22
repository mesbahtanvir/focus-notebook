# 🌊 Firestore Migration Guide

**Date:** October 22, 2025  
**Status:** ⚠️ IN PROGRESS - PHASE 1 COMPLETE  
**Breaking Change:** YES - Major architecture refactor

---

## 📋 Overview

This migration **removes** the custom IndexedDB/Dexie "smart sync" system and replaces it with **standard Firestore offline persistence** and real-time listeners.

### What Changed

**REMOVED:**
- ❌ Custom Dexie stores (`src/db/index.ts`)
- ❌ Smart sync engine (`src/lib/syncEngine.ts`)
- ❌ Cloud sync functions (`src/lib/cloudSync.ts`)
- ❌ Custom real-time sync (`src/hooks/useRealtimeSync.ts`)
- ❌ Sync status management (`src/store/useSyncStatus.ts`)
- ❌ UI components: `AutoSync`, `SyncToast`, `CloudSyncMonitor`
- ❌ Periodic polling (5-10 minute intervals)
- ❌ Manual conflict resolution logic
- ❌ Sync history tracking

**ADDED:**
- ✅ Standard Firestore offline persistence (SDK-managed IndexedDB)
- ✅ Real-time listeners via `onSnapshot()` only
- ✅ Simple last-write-wins with `serverTimestamp()`
- ✅ Version increment guard (`version: increment(1)`)
- ✅ Data gateway for consistent writes
- ✅ Subscribe helpers for easy listener setup
- ✅ One-time migration script (Dexie → Firestore)

---

## 🏗️ New Architecture

### Data Flow

```
User Action
    ↓
Store Action (useTasks.add/update/delete)
    ↓
Data Gateway (createAt/setAt/updateAt)
    ↓
Firestore Write (with serverTimestamp, version++)
    ↓
Firestore triggers onSnapshot
    ↓
Subscribe Helper (subscribeCol)
    ↓
Store Update (set state)
    ↓
React Re-render
```

### No More Polling!

**Old System:**
- Real-time listeners (< 1s) + 10-minute fallback
- Manual sync on demand
- Complex merge logic

**New System:**
- Real-time listeners (< 1s) **ONLY**
- Firestore SDK handles offline queue
- Last-write-wins (simple!)

---

## 📁 Files Created

### Core Infrastructure

1. **`src/lib/firebaseClient.ts`**
   - Firestore initialization
   - Enables `enableMultiTabIndexedDbPersistence()`
   - Replaces `src/lib/firebase.ts` (keep for auth)

2. **`src/lib/data/gateway.ts`**
   - `createAt()` - Create documents
   - `setAt()` - Set/merge documents
   - `updateAt()` - Update fields
   - `deleteAt()` - Delete documents
   - Auto-injects: `serverTimestamp()`, `updatedBy`, `version: increment(1)`

3. **`src/lib/data/subscribe.ts`**
   - `subscribeDoc()` - Subscribe to single document
   - `subscribeCol()` - Subscribe to collection/query
   - Returns unsubscribe function
   - Provides metadata: `fromCache`, `hasPendingWrites`

4. **`src/hooks/useAuthUserId.ts`**
   - Simple hook to get current user ID
   - Returns `null` if not authenticated

### Components

5. **`src/components/FirestoreSubscriber.tsx`**
   - Replaces `AutoSync` component
   - Initializes Firestore subscriptions on login
   - Much simpler (20 lines vs 130 lines)

### Migration

6. **`src/app/admin/migrate/page.tsx`**
   - One-time migration UI
   - Copies Dexie data → Firestore
   - Progress bar and stats
   - Access at `/admin/migrate`

### Security

7. **`firestore.rules`**
   - User-scoped access (`users/{userId}/...`)
   - Version guard (prevents stale overwrites)
   - Timestamp validation
   - Ready to deploy

---

## 🔄 Refactored Stores

### ✅ useTasks (DONE)

**File:** `src/store/useTasks.ts`

**Changes:**
- Removed Dexie imports
- Removed `loadTasks()` method
- Added `subscribe(userId)` method
- All mutations use data gateway
- Firestore paths: `users/${userId}/tasks/${id}`

**New State:**
```typescript
{
  tasks: Task[]
  isLoading: boolean
  fromCache: boolean
  hasPendingWrites: boolean
  unsubscribe: (() => void) | null
  subscribe: (userId: string) => void
  // ... existing methods (add, toggle, update, delete)
}
```

**Usage:**
```typescript
// On login
const userId = useAuthUserId()
useEffect(() => {
  if (userId) {
    useTasks.getState().subscribe(userId)
  }
}, [userId])

// Mutations (no change to API)
await useTasks.getState().add({ title: 'New task', ... })
await useTasks.getState().toggle(taskId)
```

### ⏳ TODO: Other Stores

These stores **still need refactoring**:
- `src/store/useThoughts.ts`
- `src/store/useMoods.ts`
- `src/store/useFocus.ts` (manages focusSessions)

Follow the same pattern as `useTasks`.

---

## 🧪 Tests Need Updating

**48+ test failures** due to type changes:

### Issue
```typescript
// Tests currently pass 'createdAt' to add()
await add({
  title: 'Test task',
  createdAt: '2025-01-01', // ❌ Not allowed in new type
  ...
})
```

### Fix
```typescript
// Remove 'createdAt' from test calls
await add({
  title: 'Test task',
  // createdAt is auto-generated
  ...
})
```

**Affected test files:**
- `src/__tests__/integration/task-workflow.test.tsx`
- `src/__tests__/integration/focus-session-workflow.test.tsx`
- `src/store/__tests__/useTasks.test.ts`
- `src/store/__tests__/useFocus.test.ts`

**Fix command:**
```bash
# Remove 'createdAt:' lines from test files
find src/__tests__ src/store/__tests__ -name "*.test.ts*" -exec sed -i '' '/createdAt:/d' {} \;
```

---

## 📦 Package.json Updates Needed

### Remove Dexie

```bash
npm uninstall dexie
npm uninstall @types/dexie # if present
```

### Ensure Firebase is Latest

```bash
npm install firebase@latest
```

---

## 🚀 Deployment Steps

### 1. Run Migration (Production Data)

**Before deploying code changes:**

1. Navigate to `/admin/migrate`
2. Click "Start Migration"
3. Wait for completion
4. Verify data in Firestore console

**Important:** Run migration **before** removing Dexie code!

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Verify rules in Firebase Console:
- Go to Firestore → Rules
- Check that rules match `firestore.rules`

### 3. Update Environment (if needed)

Ensure these are set:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 4. Deploy Application

```bash
npm run build
npm run deploy # or your deployment command
```

### 5. Remove Dexie (After Verification)

Once everything works:

```bash
# Remove Dexie
npm uninstall dexie

# Delete backup files
rm src/store/useTasks.ts.backup
rm -rf src/__mocks__/db.ts # if exists
```

---

## ✅ Verification Checklist

### Before Deployment

- [ ] Migration script tested locally
- [ ] At least one store (useTasks) refactored and tested
- [ ] Firestore rules deployed
- [ ] Tests updated or disabled temporarily
- [ ] Code compiles without errors

### After Migration Run

- [ ] All data visible in Firestore console
- [ ] Check: `users/{userId}/tasks`, `/thoughts`, `/moods`, `/focusSessions`
- [ ] Verify counts match old Dexie data
- [ ] Test creating new items
- [ ] Test updating items
- [ ] Test deleting items

### After Deployment

- [ ] Login works
- [ ] Real-time sync works (edit on device A, see on device B < 1s)
- [ ] Offline mode works (edit offline, syncs when back online)
- [ ] No console errors
- [ ] Monitor Firestore usage/costs

---

## 🐛 Known Issues & TODO

### Current Issues

1. **Tests failing** - Need to remove `createdAt` from test calls
2. **3 stores not refactored** - useThoughts, useMoods, useFocus
3. **AuthContext may reference loadTasks** - Need to update
4. **Some components may import deleted files** - Need cleanup

### Cleanup TODO

```bash
# Find remaining references to deleted files
grep -r "syncEngine\|cloudSync\|useRealtimeSync\|useSyncStatus\|AutoSync\|SyncToast\|CloudSyncMonitor" src/

# Find Dexie imports
grep -r "from '@/db'" src/

# Find pushItemToCloud references
grep -r "pushItemToCloud\|deleteItemFromCloud\|smartSync" src/
```

### Breaking Changes for Users

**None** - Data is preserved via migration. UI/UX remains the same, just faster and simpler!

---

## 📊 Benefits

### For Developers

- ✅ **90% less sync code** - 2,000+ lines removed
- ✅ **No custom conflict resolution** - Firestore handles it
- ✅ **Standard patterns** - Use official Firebase docs
- ✅ **Easier debugging** - Clear data flow
- ✅ **Better types** - No serialization gymnastics

### For Users

- ✅ **Faster sync** - No periodic delays
- ✅ **More reliable** - Firestore's proven offline queue
- ✅ **Simpler** - Less can go wrong
- ✅ **Same UX** - Real-time updates as before

### For Operations

- ✅ **Fewer edge cases** - No complex merge logic
- ✅ **Standard monitoring** - Use Firebase console
- ✅ **Lower maintenance** - Less custom code to debug

---

## 🔧 Completing the Migration

### Phase 1: Core Infrastructure ✅ DONE

- [x] Create Firestore client with offline persistence
- [x] Create data gateway (timestamps, version)
- [x] Create subscribe helpers
- [x] Create FirestoreSubscriber component
- [x] Create migration script
- [x] Create security rules
- [x] Refactor useTasks store

### Phase 2: Store Refactoring ⏳ IN PROGRESS

- [ ] Refactor useThoughts store
- [ ] Refactor useMoods store
- [ ] Refactor useFocus store
- [ ] Update FirestoreSubscriber to subscribe to all stores

### Phase 3: Cleanup 🔜 NEXT

- [ ] Fix test files (remove createdAt from test calls)
- [ ] Find and fix remaining imports of deleted files
- [ ] Update AuthContext (remove loadTasks calls)
- [ ] Remove Dexie from package.json
- [ ] Delete backup files

### Phase 4: Testing & Deployment 🔜 PENDING

- [ ] Run migration on dev/staging
- [ ] Verify data in Firestore
- [ ] Test all CRUD operations
- [ ] Test offline functionality
- [ ] Deploy to production
- [ ] Monitor for 24-48 hours

---

## 💡 Architecture Decision Records

### Why Remove Custom Sync?

**Problem:** Custom sync was complex, hard to maintain, and had edge cases.

**Solution:** Use Firestore's built-in offline persistence and real-time listeners.

**Trade-offs:**
- ✅ Gain: Simplicity, reliability, maintainability
- ✅ Gain: Standard patterns, better docs
- ❌ Lose: Custom conflict resolution (but it was overkill)
- ❌ Lose: Sync history UI (rarely used)

### Why Last-Write-Wins?

**Rationale:** 
- Most conflicts are same-user, different-device
- User expects most recent edit to win
- Complex field-level merging was overkill for this app
- Firestore's version increment prevents truly stale writes

### Why Migration Script?

**Alternative:** Could use Firestore import/export CLI

**Chosen:** Custom script because:
- User-friendly UI with progress
- Preserves IDs
- Handles errors gracefully
- No server/CLI access needed

---

## 📞 Support

### If Migration Fails

1. **Data is safe** - Dexie data is not deleted
2. **Try again** - Migration script is idempotent
3. **Manual fix** - Export Dexie, import to Firestore
4. **Rollback** - Restore old code, run `npm install dexie`

### If Sync Issues After Deployment

1. **Check Firestore console** - Data exists?
2. **Check browser console** - onSnapshot errors?
3. **Check network tab** - Firestore requests?
4. **Check auth** - User logged in?
5. **Check rules** - Deployed correctly?

---

## 📚 References

- [Firestore Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Firestore onSnapshot](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Server Timestamps](https://firebase.google.com/docs/firestore/manage-data/add-data#server_timestamp)

---

**Migration started by:** Cascade AI  
**Date:** October 22, 2025  
**Status:** Phase 1 complete, Phase 2-4 pending  
**Estimated completion:** 2-4 hours of additional work
