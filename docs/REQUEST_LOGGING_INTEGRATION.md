# Request Logging Integration

## ✅ All External Network Requests Now Tracked

All external API calls (including OpenAI) are now logged to the request queue and visible in the debug dashboard!

---

## 🎯 What's Tracked

### 1. **OpenAI API Calls** (Brainstorming Feature)

Every time you send a message in brainstorming, it's tracked:

**Request Details:**
- Type: `api`
- Method: `POST /api/chat`
- URL: `OpenAI Chat Completions`
- Request payload includes:
  - Model: `gpt-3.5-turbo`
  - Message count
  - Current thought being brainstormed

**Response Details:**
- Response message content
- Message length
- Status code
- Duration
- Any errors

---

## 🔍 How to View Logs

### Option 1: Debug Dashboard (Recommended)

1. Go to **Admin** page
2. You'll see request logs in real-time
3. Filter by:
   - Type (API, Firebase, Sync)
   - Status (Pending, In Progress, Completed, Failed)

### Option 2: Browser DevTools

```javascript
// Check current queue
const store = JSON.parse(localStorage.getItem('request-log-storage') || '{}');
console.log('Queue:', store.state?.queue);
console.log('All Logs:', store.state?.logs);
```

---

## 📊 Request Lifecycle

### Successful Request

```
1. User sends brainstorming message
   ├─ Status: pending
   ├─ Added to queue
   └─ Visible in debug dashboard
   
2. API call starts
   ├─ Status: in-progress
   └─ Start time recorded
   
3. OpenAI responds
   ├─ Status: completed
   ├─ Duration calculated
   ├─ Response saved
   └─ Removed from active queue
```

### Failed Request

```
1. User sends brainstorming message
   ├─ Status: pending
   └─ Added to queue
   
2. API call starts
   ├─ Status: in-progress
   └─ Start time recorded
   
3. Error occurs (401, 429, 400, network, etc.)
   ├─ Status: failed
   ├─ Error message captured
   ├─ Status code recorded
   └─ Visible in failed requests
```

---

## 🎨 Debug Dashboard View

When you open the **Admin** page, you'll see:

```
📊 Request Queue Dashboard
────────────────────────────────────────

🔄 Active Requests (2)
┌─────────────────────────────────────┐
│ ⏳ POST /api/chat                   │
│    OpenAI Chat Completions          │
│    In Progress • 1.2s               │
│    Model: gpt-3.5-turbo             │
└─────────────────────────────────────┘

✅ Recent Completed (5)
┌─────────────────────────────────────┐
│ ✓ POST /api/chat                    │
│   OpenAI Chat Completions           │
│   Completed • 200 • 2.3s            │
│   Response: 150 chars               │
└─────────────────────────────────────┘

❌ Recent Failed (1)
┌─────────────────────────────────────┐
│ ✗ POST /api/chat                    │
│   OpenAI Chat Completions           │
│   Failed • 401 • 0.5s               │
│   Error: Invalid API key            │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### Files Modified

1. **`/src/app/tools/brainstorming/page.tsx`**
   - Added `useRequestLog` hook
   - Log request when message sent
   - Update status throughout lifecycle
   - Track successes and failures

### Code Flow

```typescript
// 1. Add to queue
const requestId = addToQueue({
  type: 'api',
  method: 'POST /api/chat',
  url: 'OpenAI Chat Completions',
  request: { model: 'gpt-3.5-turbo', ... },
});

// 2. Mark as in-progress
updateRequestStatus(requestId, 'in-progress');

// 3. Make API call
const response = await fetch('/api/chat', { ... });

// 4a. On success
updateRequestStatus(requestId, 'completed', {
  response: { message: data.message },
  status: 200,
});

// 4b. On error
updateRequestStatus(requestId, 'failed', {
  error: 'API key not configured',
  status: 401,
});
```

---

## 📈 Request Log Data Structure

```typescript
{
  id: "1234567890-abc123",
  timestamp: "2025-10-20T23:15:30.123Z",
  type: "api",
  method: "POST /api/chat",
  url: "OpenAI Chat Completions",
  
  // Request data
  request: {
    model: "gpt-3.5-turbo",
    messageCount: 3,
    thought: "Building a new feature"
  },
  
  // Response data (on success)
  response: {
    message: "That's a great idea! Let's explore...",
    messageLength: 150
  },
  
  // Timing
  startTime: 1729467330123,
  endTime: 1729467332456,
  duration: 2333, // milliseconds
  
  // Status
  requestStatus: "completed", // pending | in-progress | completed | failed
  status: 200, // HTTP status
  
  // Error (on failure)
  error: "Invalid API key"
}
```

---

## 🎯 Benefits

### 1. **Debugging Made Easy**
- See all API calls in one place
- Identify failing requests quickly
- Track response times
- Monitor error patterns

### 2. **Performance Monitoring**
- See request durations
- Identify slow requests
- Track API usage

### 3. **Error Tracking**
- All errors logged with details
- Error messages visible
- Status codes recorded
- Stack traces available

### 4. **Usage Analytics**
- How many API calls made
- When calls are made
- Success/failure rates
- Most common errors

---

## 🔍 Debugging Scenarios

### Scenario 1: "Why isn't the AI responding?"

**Check the debug dashboard:**
1. Go to Admin page
2. Look for recent `POST /api/chat` requests
3. Check status:
   - ✅ Completed → AI responded successfully
   - ❌ Failed → Click to see error details
   - ⏳ In Progress → Still waiting
   - 📋 Pending → Request queued

### Scenario 2: "API calls are slow"

**Check request durations:**
1. Open Admin page
2. Look at completed requests
3. Check `duration` field
4. Identify which calls are slow
5. Investigate if it's network or OpenAI

### Scenario 3: "Getting errors but don't know why"

**Check error details:**
1. Open Admin page
2. Look at failed requests
3. Click on failed request
4. See:
   - Status code (401, 429, 400, etc.)
   - Error message
   - Request that caused it
   - When it happened

---

## 🚀 Future Enhancements

Potential additions:

- [ ] Export request logs as CSV
- [ ] Filter by date range
- [ ] Search through logs
- [ ] Retry failed requests
- [ ] Request statistics dashboard
- [ ] Alert on repeated failures
- [ ] Rate limit tracking
- [ ] Token usage tracking
- [ ] Cost estimation

---

## 🧪 Testing the Integration

### Test 1: Successful Request

1. Create a thought with `brainstorm` tag
2. Open brainstorming session
3. Send a message
4. Open Admin page
5. You should see:
   - Request appears in queue (pending)
   - Moves to in-progress
   - Completes with 200 status
   - Shows response details

### Test 2: Failed Request (Invalid API Key)

1. Go to Settings
2. Clear or enter invalid API key
3. Try brainstorming
4. Open Admin page
5. You should see:
   - Request appears
   - Moves to in-progress
   - Fails with error message
   - Shows "API key not configured"

### Test 3: Network Error

1. Disable internet
2. Try brainstorming
3. Open Admin page
4. You should see:
   - Request appears
   - Fails with network error
   - Status: 0

---

## 📝 Log Retention

- **In-memory**: All logs stored in Zustand store
- **Persistence**: Saved to localStorage
- **Limit**: Last 100 requests kept
- **Queue**: Only active requests shown

To clear logs:
```typescript
// In browser console
useRequestLog.getState().clearLogs();
```

---

## 💡 Quick Reference

### Check All Logs
```typescript
const logs = useRequestLog.getState().logs;
console.log(logs);
```

### Check Active Queue
```typescript
const queue = useRequestLog.getState().queue;
console.log('Active requests:', queue);
```

### Check Pending Requests
```typescript
const pending = useRequestLog.getState().getPendingRequests();
console.log('Pending:', pending);
```

### Check Failed Requests
```typescript
const failed = logs.filter(log => log.requestStatus === 'failed');
console.log('Failed:', failed);
```

---

## ✨ Summary

**Before:**
- ❌ No visibility into API calls
- ❌ Hard to debug errors
- ❌ No performance tracking
- ❌ Errors silently failed

**After:**
- ✅ All API calls tracked
- ✅ Real-time visibility
- ✅ Detailed error information
- ✅ Performance metrics
- ✅ Centralized debugging

**Every external network request is now logged and visible in the debug dashboard!** 🎉
