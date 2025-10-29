# Coffee Breaks & Meditation Implementation Guide

## Overview
For long focus sessions (90+ minutes), the system should include scheduled breaks:
- **Coffee Break**: 5-10 minute break for refreshment
- **Meditation**: 5-10 minute mindfulness session (linked to Headspace)

## Current Implementation Status

### ✅ Completed (UI Layer)
1. **Focus Mode Cards Updated**
   - Philosopher mode (90 min): Shows ☕ 🧘 icons
   - Beast Mode (120 min): Shows ☕ 🧘 icons
   - URL parameters include `&breaks=true`
   - User-facing hints about breaks included

## 🔧 Next Steps for Full Implementation

### 1. Update Focus Page to Handle Breaks Parameter

**File**: `src/app/tools/focus/page.tsx`

Add logic to read the `breaks` URL parameter:

```typescript
const searchParams = useSearchParams();
const includeBreaks = searchParams.get('breaks') === 'true';
const duration = parseInt(searchParams.get('duration') || '60');
```

### 2. Modify Focus Session Component

**File**: `src/components/FocusSession.tsx`

Add break intervals to long sessions:

```typescript
// Calculate break times based on session duration
const calculateBreakSchedule = (duration: number) => {
  if (duration < 90) return [];
  
  const breaks = [];
  
  // For 90 min: Break at 45 min
  if (duration >= 90) {
    breaks.push({
      time: 45,
      type: 'coffee',
      duration: 5,
      title: '☕ Coffee Break',
      description: 'Take a 5-minute break to refresh'
    });
  }
  
  // For 120 min: Coffee at 40 min, Meditation at 80 min
  if (duration >= 120) {
    breaks.push({
      time: 40,
      type: 'coffee',
      duration: 5,
      title: '☕ Coffee Break',
      description: 'Quick 5-minute refreshment break'
    });
    breaks.push({
      time: 80,
      type: 'meditation',
      duration: 10,
      title: '🧘 Meditation Break',
      description: 'Mindfulness session',
      link: 'https://www.headspace.com/' // Link to Headspace
    });
  }
  
  return breaks;
};
```

### 3. Add Break Timer Logic

```typescript
// In FocusSession component
const [breaks, setBreaks] = useState(calculateBreakSchedule(sessionDuration));
const [currentBreak, setCurrentBreak] = useState<Break | null>(null);
const [breakTimer, setBreakTimer] = useState(0);

// Check if it's time for a break
useEffect(() => {
  if (!currentSession || !currentSession.isActive) return;
  
  const elapsedMinutes = currentTime / 60;
  
  // Find if we should show a break
  const upcomingBreak = breaks.find(b => 
    elapsedMinutes >= b.time && 
    elapsedMinutes < (b.time + b.duration)
  );
  
  if (upcomingBreak && !currentBreak) {
    // Pause the main session
    pauseSession();
    setCurrentBreak(upcomingBreak);
    setBreakTimer(upcomingBreak.duration * 60); // Convert to seconds
  }
}, [currentTime, breaks]);

// Break timer countdown
useEffect(() => {
  if (!currentBreak || breakTimer <= 0) return;
  
  const interval = setInterval(() => {
    setBreakTimer(prev => {
      if (prev <= 1) {
        // Break is over
        setCurrentBreak(null);
        resumeSession();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [currentBreak, breakTimer]);
```

### 4. Add Break UI Component

```typescript
// Break modal/overlay
{currentBreak && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-3xl shadow-2xl max-w-md mx-4 border-4 border-purple-300 dark:border-purple-700"
    >
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">{currentBreak.type === 'coffee' ? '☕' : '🧘'}</div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {currentBreak.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {currentBreak.description}
        </p>
        
        {/* Countdown Timer */}
        <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">
          {Math.floor(breakTimer / 60)}:{(breakTimer % 60).toString().padStart(2, '0')}
        </div>
        
        {/* Meditation Link */}
        {currentBreak.type === 'meditation' && currentBreak.link && (
          <a
            href={currentBreak.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-lg transition-all"
          >
            Open Headspace
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        
        {/* Skip Break Button */}
        <button
          onClick={() => {
            setCurrentBreak(null);
            setBreakTimer(0);
            resumeSession();
          }}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Skip break
        </button>
      </div>
    </motion.div>
  </motion.div>
)}
```

### 5. Store Break Data

**File**: `src/store/useFocus.ts`

Add break tracking to session data:

```typescript
export interface FocusSession {
  // ... existing fields
  breaks?: {
    scheduled: Break[];
    completed: string[]; // IDs of completed breaks
  };
}

// When starting a session with breaks
const startSessionWithBreaks = (duration: number, includeBreaks: boolean) => {
  const breaks = includeBreaks ? calculateBreakSchedule(duration) : [];
  
  return {
    // ... session data
    breaks: {
      scheduled: breaks,
      completed: []
    }
  };
};
```

## 📋 Break Schedule Examples

### Philosopher Mode (90 minutes)
```
0min ────── 45min ────── 90min
  Work      ☕ (5min)    Work
            Coffee
```

### Beast Mode (120 minutes)
```
0min ── 40min ── 80min ── 120min
 Work  ☕(5min) 🧘(10min) Work
       Coffee  Meditation
```

## 🎯 User Experience Goals

1. **Non-Intrusive**: Breaks should feel like helpful reminders, not interruptions
2. **Skippable**: Users can skip breaks if in flow state
3. **Visible Progress**: Show upcoming breaks in session UI
4. **External Links**: Meditation links to Headspace for guided sessions
5. **Tracking**: Log break completion for analytics

## 🔗 Integration Points

### Headspace Integration
- Use deep link: `https://www.headspace.com/meditation` for web
- Consider app deep links for mobile: `headspace://meditation`
- Show timer to sync with Headspace session lengths

### Notification System
- Optional: Send browser notification 2 minutes before break
- Play gentle chime when break starts
- Vibration for mobile devices

## ✅ Testing Checklist

- [ ] Breaks trigger at correct times
- [ ] Break timer counts down correctly
- [ ] Session pauses during breaks
- [ ] Session resumes after breaks
- [ ] Skip break button works
- [ ] Headspace link opens correctly
- [ ] Break data persists in session history
- [ ] Multiple breaks in Beast Mode work sequentially
- [ ] No breaks shown for short sessions (<90 min)
- [ ] UI is responsive during breaks

## 📝 Future Enhancements

1. **Customizable Breaks**: Let users set break times/durations
2. **Break Activities**: Suggest stretching, water, walking
3. **Music Integration**: Play ambient music during breaks
4. **Break Stats**: Track break completion rate
5. **Smart Breaks**: AI-suggested breaks based on productivity patterns

---

**Note**: The UI indicators (☕ 🧘) have been added to the dashboard focus mode cards. The full break functionality requires implementing the timer logic and UI components described above.
