# AI Processing System - Implementation Guide

## ✅ Completed Components

### Backend (Cloud Functions)

All cloud function infrastructure is ready for deployment:

1. **Functions Structure** ([functions/](functions/))
   - ✅ Package.json with dependencies
   - ✅ TypeScript configuration
   - ✅ Environment variable template

2. **Configuration** ([functions/src/config.ts](functions/src/config.ts))
   - Confidence thresholds (95% auto-apply, 70-94% suggest)
   - Rate limits (50/day per user, 5 reprocesses max)
   - OpenAI model configuration

3. **Utilities**
   - ✅ **Context Gatherer** ([functions/src/utils/contextGatherer.ts](functions/src/utils/contextGatherer.ts))
     - Fetches goals, projects, people, tasks, moods
     - Formats context for AI prompt

   - ✅ **OpenAI Client** ([functions/src/utils/openaiClient.ts](functions/src/utils/openaiClient.ts))
     - Comprehensive 3-step prompt (enhance text → add tags → suggest actions)
     - Context-aware text completion
     - Strict confidence requirements

   - ✅ **Action Processor** ([functions/src/utils/actionProcessor.ts](functions/src/utils/actionProcessor.ts))
     - Separates auto-apply from suggestions
     - Builds Firestore updates
     - Tracks changes

4. **Cloud Functions** ([functions/src/processThought.ts](functions/src/processThought.ts))
   - ✅ `processNewThought` - Auto-trigger on new thought
   - ✅ `manualProcessThought` - "Process Now" button
   - ✅ `reprocessThought` - "Reprocess" with optional revert
   - ✅ `revertThoughtProcessing` - "Revert AI Changes"

### Frontend (React/Next.js)

1. **Type Definitions** ([src/store/useThoughts.ts](src/store/useThoughts.ts))
   - ✅ Enhanced `Thought` interface with AI processing fields
   - ✅ `AIAppliedChanges` interface
   - ✅ `ManualEdits` interface
   - ✅ `ProcessingHistoryEntry` interface
   - ✅ Enhanced `AISuggestion` with entity tracking

2. **Constants** ([src/constants/aiTags.ts](src/constants/aiTags.ts))
   - ✅ Tool tags (tool-cbt, tool-brainstorm, tool-deepreflect)
   - ✅ Entity tag prefixes (goal-, project-, person-)
   - ✅ Confidence thresholds
   - ✅ Helper functions

3. **State Management**
   - ✅ Manual edit tracking in `updateThought`
   - ✅ Automatic distinction between AI and user changes

---

## 🚧 Remaining Tasks

### 1. ThoughtDetailModal UI Updates

**File:** `src/components/ThoughtDetailModal.tsx` (922 lines)

**Add these sections:**

#### A. AI Processing Status Badge (after line ~72)

```typescript
// Add new state
const [showReprocessModal, setShowReprocessModal] = useState(false);
const [isReverting, setIsReverting] = useState(false);

// AI Processing Status Component
const AIProcessingStatus = () => {
  // Unprocessed
  if (!thought.aiProcessingStatus) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
          Not Processed
        </span>
        <button
          onClick={handleProcessNow}
          disabled={isProcessing}
          className="ml-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Process Now
            </>
          )}
        </button>
      </div>
    );
  }

  // Processing
  if (thought.aiProcessingStatus === 'processing') {
    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
        <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
        <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
          AI is processing this thought...
        </span>
      </div>
    );
  }

  // Failed
  if (thought.aiProcessingStatus === 'failed') {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-semibold">
              ❌ Processing Failed
            </span>
            <p className="text-sm text-red-700 dark:text-red-300 mt-2">
              {thought.aiError || 'Unknown error occurred'}
            </p>
          </div>
          <button
            onClick={handleProcessNow}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Completed
  if (thought.aiProcessingStatus === 'completed' && thought.aiAppliedChanges) {
    return (
      <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-green-500 text-white text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Processed
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowReprocessModal(true)}
              className="px-3 py-1 rounded-lg border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium"
            >
              🔄 Reprocess
            </button>
            <button
              onClick={handleRevert}
              disabled={isReverting}
              className="px-3 py-1 rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              {isReverting ? (
                <Loader2 className="h-4 w-4 animate-spin inline" />
              ) : (
                '↩️ Revert'
              )}
            </button>
          </div>
        </div>

        {/* Show what was changed */}
        <div className="text-sm space-y-1 pt-2 border-t border-green-200 dark:border-green-800">
          {thought.aiAppliedChanges.textEnhanced && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Text enhanced ({thought.aiAppliedChanges.textChanges?.length || 0} changes)</span>
            </div>
          )}
          {thought.aiAppliedChanges.tagsAdded.length > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Added tags: {thought.aiAppliedChanges.tagsAdded.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Show original text if enhanced */}
        {thought.aiAppliedChanges.textEnhanced && thought.originalText && (
          <details className="text-sm">
            <summary className="cursor-pointer text-green-700 dark:text-green-300 hover:underline font-medium">
              Show original text
            </summary>
            <p className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border italic text-gray-700 dark:text-gray-300">
              "{thought.originalText}"
            </p>
          </details>
        )}
      </div>
    );
  }

  return null;
};
```

#### B. Processing History Section

```typescript
const ProcessingHistory = () => {
  if (!thought.processingHistory || thought.processingHistory.length === 0) {
    return null;
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium hover:underline flex items-center gap-2">
        <Brain className="h-4 w-4" />
        Processing History ({thought.processingHistory.length})
      </summary>
      <div className="mt-3 space-y-2">
        {thought.processingHistory.map((entry, i) => (
          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium capitalize">{entry.trigger}</span>
                {entry.status === 'completed' && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
                {entry.revertedAt && (
                  <span className="ml-2 text-orange-600">(Reverted)</span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(entry.processedAt).toLocaleString()}
              </span>
            </div>
            {entry.status === 'completed' && !entry.revertedAt && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex gap-4">
                <span>{entry.changesApplied} changes</span>
                <span>{entry.suggestionsCount} suggestions</span>
                {entry.tokensUsed && <span>{entry.tokensUsed} tokens</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </details>
  );
};
```

#### C. Handler Functions

```typescript
const handleProcessNow = async () => {
  setIsProcessing(true);
  setErrorMessage(null);

  try {
    // Call cloud function
    const functions = getFunctions();
    const processThought = httpsCallable(functions, 'manualProcessThought');
    await processThought({ thoughtId: thought.id });

    setSuccessMessage('Thought processed successfully!');
    setShowSuccessModal(true);
  } catch (error) {
    console.error('Error processing thought:', error);
    setErrorMessage(error instanceof Error ? error.message : 'Failed to process thought');
    setShowErrorModal(true);
  } finally {
    setIsProcessing(false);
  }
};

const handleRevert = async () => {
  if (!confirm('Revert AI changes? This will restore the original text and tags.')) {
    return;
  }

  setIsReverting(true);

  try {
    const functions = getFunctions();
    const revertProcessing = httpsCallable(functions, 'revertThoughtProcessing');
    await revertProcessing({ thoughtId: thought.id });

    setSuccessMessage('AI changes reverted successfully!');
    setShowSuccessModal(true);
  } catch (error) {
    console.error('Error reverting:', error);
    setErrorMessage(error instanceof Error ? error.message : 'Failed to revert changes');
    setShowErrorModal(true);
  } finally {
    setIsReverting(false);
  }
};

const handleReprocess = async (revertFirst: boolean) => {
  setShowReprocessModal(false);
  setIsProcessing(true);

  try {
    const functions = getFunctions();
    const reprocess = httpsCallable(functions, 'reprocessThought');
    await reprocess({ thoughtId: thought.id, revertFirst });

    setSuccessMessage('Thought reprocessed successfully!');
    setShowSuccessModal(true);
  } catch (error) {
    console.error('Error reprocessing:', error);
    setErrorMessage(error instanceof Error ? error.message : 'Failed to reprocess thought');
    setShowErrorModal(true);
  } finally {
    setIsProcessing(false);
  }
};
```

#### D. Reprocess Confirmation Modal

```typescript
{showReprocessModal && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
    >
      <h3 className="text-lg font-bold mb-4">Reprocess this thought?</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Would you like to revert the current AI changes before reprocessing?
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleReprocess(true)}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
        >
          Revert & Reprocess
        </button>
        <button
          onClick={() => handleReprocess(false)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Keep Changes & Reprocess
        </button>
        <button
          onClick={() => setShowReprocessModal(false)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  </div>
)}
```

#### E. Add Components to Modal (in the JSX)

Insert after the main thought text display (around line 400-500):

```typescript
{/* AI Processing Status */}
<AIProcessingStatus />

{/* Processing History */}
{thought.processingHistory && thought.processingHistory.length > 0 && (
  <ProcessingHistory />
)}
```

---

### 2. Suggestion Approval Handler

**File:** `src/components/ThoughtDetailModal.tsx`

Add this handler function:

```typescript
const handleApproveSuggestion = async (suggestionId: string) => {
  const suggestion = thought.aiSuggestions?.find(s => s.id === suggestionId);
  if (!suggestion) return;

  setIsProcessingSuggestion(true);

  try {
    let createdEntityId: string | undefined;
    let createdEntityType: 'task' | 'project' | 'goal' | undefined;

    switch (suggestion.type) {
      case 'createTask':
        createdEntityId = await useTasks.getState().add({
          title: suggestion.data.title,
          focusEligible: suggestion.data.focusEligible ?? true,
          priority: suggestion.data.priority || 'medium',
          category: suggestion.data.category,
          status: 'active',
          thoughtId: thought.id,
          createdBy: 'ai',
        });
        createdEntityType = 'task';
        break;

      case 'createProject':
        createdEntityId = await useProjects.getState().add({
          title: suggestion.data.title,
          description: suggestion.data.description,
          objective: suggestion.data.objective || '',
          timeframe: suggestion.data.timeframe || 'short-term',
          category: suggestion.data.category || 'mastery',
          status: 'active',
          actionPlan: [],
        });
        createdEntityType = 'project';
        break;

      case 'createGoal':
        await useGoals.getState().add({
          title: suggestion.data.title,
          objective: suggestion.data.objective || '',
          timeframe: suggestion.data.timeframe || 'short-term',
          status: 'active',
          priority: 'medium',
        });
        createdEntityType = 'goal';
        break;
    }

    // Update suggestion status
    const updatedSuggestions = thought.aiSuggestions?.map(s =>
      s.id === suggestionId
        ? { ...s, status: 'accepted' as const, createdEntityId, createdEntityType }
        : s
    );

    await updateThought(thought.id, { aiSuggestions: updatedSuggestions });

    setSuccessMessage('Suggestion approved successfully!');
    setShowSuccessModal(true);
  } catch (error) {
    console.error('Error approving suggestion:', error);
    setErrorMessage('Failed to approve suggestion');
    setShowErrorModal(true);
  } finally {
    setIsProcessingSuggestion(false);
  }
};
```

---

### 3. Settings Page Updates

**File:** `src/app/settings/page.tsx`

Add new section for AI Processing settings:

```typescript
<div className="card p-6">
  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
    <Sparkles className="h-5 w-5" />
    AI Processing Settings
  </h3>

  <div className="space-y-4">
    <label className="flex items-center justify-between">
      <span className="text-sm">Auto-process new thoughts</span>
      <input
        type="checkbox"
        checked={autoProcessEnabled}
        onChange={(e) => setAutoProcessEnabled(e.target.checked)}
        className="toggle"
      />
    </label>

    <div>
      <label className="block text-sm font-medium mb-2">Daily processing limit</label>
      <input
        type="number"
        value={dailyLimit}
        onChange={(e) => setDailyLimit(parseInt(e.target.value))}
        min="10"
        max="100"
        className="input w-32"
      />
      <p className="text-xs text-gray-500 mt-1">
        Current usage today: {usageToday}/{dailyLimit}
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">Processing model</label>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="input"
      >
        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, cheaper)</option>
        <option value="gpt-4">GPT-4 (Better quality, slower)</option>
      </select>
    </div>
  </div>
</div>

<div className="card p-6">
  <h3 className="text-lg font-bold mb-4">Token Usage This Month</h3>
  <div className="grid grid-cols-3 gap-4">
    <div>
      <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
      <div className="text-sm text-gray-500">Total tokens</div>
    </div>
    <div>
      <div className="text-2xl font-bold">{thoughtsProcessed}</div>
      <div className="text-sm text-gray-500">Thoughts processed</div>
    </div>
    <div>
      <div className="text-2xl font-bold">${estimatedCost.toFixed(2)}</div>
      <div className="text-sm text-gray-500">Estimated cost</div>
    </div>
  </div>
</div>
```

---

## 🚀 Deployment Steps

### 1. Setup Firebase Functions

```bash
# Install dependencies
cd functions
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your OpenAI API key

# Set Firebase config
firebase functions:config:set openai.api_key="sk-your-key"
```

### 2. Deploy Cloud Functions

```bash
# Deploy all functions
npm run deploy

# Or deploy individually
firebase deploy --only functions:processNewThought
firebase deploy --only functions:manualProcessThought
firebase deploy --only functions:reprocessThought
firebase deploy --only functions:revertThoughtProcessing
```

### 3. Update Frontend

1. Add Firebase Functions imports to components
2. Implement the UI sections above in ThoughtDetailModal
3. Add settings page sections
4. Test with Firebase Emulator first:
   ```bash
   cd functions
   npm run serve
   ```

---

## 📊 Testing Checklist

- [ ] Auto-processing triggers on new thought creation
- [ ] Manual "Process Now" button works
- [ ] Text enhancement completes partial references
- [ ] Tool tags applied correctly (cbt, brainstorm, deepreflect)
- [ ] Entity tags match existing items
- [ ] Suggestions shown for 70-94% confidence
- [ ] Task creation only with explicit mention
- [ ] focusEligible set correctly (true=desk, false=errands)
- [ ] Revert restores original text and tags
- [ ] Reprocess asks about reverting first
- [ ] Rate limiting enforced (50/day)
- [ ] Reprocess limit enforced (5 max)
- [ ] Processing history tracked
- [ ] Manual edits distinguished from AI
- [ ] Suggestion approval creates entities
- [ ] Settings page shows usage stats

---

## 📚 Documentation

- **Cloud Functions README**: [functions/README.md](functions/README.md)
- **AI Tag Constants**: [src/constants/aiTags.ts](src/constants/aiTags.ts)
- **Configuration**: [functions/src/config.ts](functions/src/config.ts)

---

## 🎯 Key Features Implemented

✅ **Two-phase processing**: Enhance text → Add tags → Suggest actions
✅ **Context-aware completion**: Uses goals, projects, people to complete references
✅ **Confidence-based actions**: 95%+ auto-apply, 70-94% suggest, <70% ignore
✅ **Full revert capability**: Restores original text and tags
✅ **Processing history**: Complete audit trail
✅ **Manual edit tracking**: Distinguishes user changes from AI
✅ **Rate limiting**: 50/day per user, 5 reprocesses max
✅ **Entity creation tracking**: Links created tasks/projects back to suggestions
✅ **Cost tracking**: Token usage and estimated costs

All backend infrastructure is complete and ready for deployment!
