# Features Documentation

Complete guide to all features in Personal Notebook.

## Core Features

### 1. Task Management

**Purpose**: Organize and track tasks with intelligent categorization.

**Key Features**:
- ✅ **Active Tasks**: Today's focus items
- 📋 **Backlog**: Future tasks to tackle later
- 🚗 **Errands**: Out-of-office tasks (shopping, appointments, etc.)
- 🔄 **Recurring Tasks**: Daily, weekly, monthly, or workweek patterns
- 🏷️ **Priority Levels**: Urgent, High, Medium, Low
- 🎯 **Categories**: Mastery (skill-building) and Pleasure (enjoyable)
- 💻 **Focus Eligibility**: Mark tasks that can be done at a desk vs. errands

**How to Use**:
1. Go to `/tools/tasks`
2. Click "New Task" button
3. Fill in task details:
   - Title (required)
   - Priority (default: Medium)
   - Category (default: based on task type)
   - Due date (optional)
   - Notes (optional)
   - Estimated time (optional)
   - Recurrence pattern (optional)
   - Focus eligible toggle (default: ON)

**Recurring Tasks**:
- **Daily**: Task repeats every day
- **Workweek**: Task repeats Monday-Friday only
- **Weekly**: Task repeats on specific days
- **Monthly**: Task repeats monthly

**Technical Details**:
- Stored in IndexedDB (`tasks` table)
- Syncs to Firebase Firestore when authenticated
- Auto-generates recurring task instances
- Tracks completion count for recurring tasks

---

### 2. Focus Sessions

**Purpose**: Time-blocked deep work sessions with task selection.

**Key Features**:
- ⏱️ **Flexible Duration**: 25min (Pomodoro), 50min (Deep Work), or custom
- 🎯 **Task Selection**: Choose specific tasks for the session
- ⚖️ **Auto-Balance**: Automatically suggests balanced mastery/pleasure tasks
- ⏸️ **Pause/Resume**: Pause timer when interrupted
- 📊 **Time Tracking**: Track time spent per task
- 📝 **Session Notes**: Add notes during focus work
- ✅ **Task Completion**: Mark tasks complete during session
- 💾 **Persistence**: Sessions survive page reloads and browser closures
- 📈 **Statistics**: Review session performance and patterns

**How to Use**:
1. Go to `/tools/focus`
2. Select session duration
3. Choose tasks (auto-selected by default)
4. Click "Start Focus Session"
5. Work on selected tasks
6. Pause/resume as needed
7. Switch between tasks with navigation
8. End session when done
9. Provide feedback and rating

**Technical Details**:
- Active sessions persist in IndexedDB
- Timer pauses when browser closes
- Tracks total paused time accurately
- Auto-resumes from where you left off
- Saves completed sessions with full history

---

### 3. Thoughts Tracking

**Purpose**: Capture and analyze thoughts with AI-powered insights.

**Key Features**:
- 💭 **Quick Capture**: Fast thought entry on homepage
- 🏷️ **Auto-Categorization**: Neutral, Task, Feeling-good, Feeling-bad
- 🤖 **AI Analysis**: Optional background processing with OpenAI
- 💡 **Action Suggestions**: AI recommends tasks, tools, or exercises
- 📊 **Intensity Tracking**: Rate emotional intensity (1-10)
- 🧠 **CBT Analysis**: Structured cognitive behavioral therapy analysis
- 📝 **Extended Notes**: Add detailed notes to thoughts
- 🔍 **Search & Filter**: Find specific thoughts quickly

**How to Use**:
1. **Quick Add** (Homepage):
   - Type thought in input box
   - Click "Add"
   
2. **Detailed Entry** (`/tools/thoughts`):
   - Click "New Thought"
   - Enter thought text
   - Select type (optional)
   - Add intensity rating (optional)
   - Add tags (optional)
   - Save

3. **View Details**:
   - Click any thought to see details
   - View AI analysis (if enabled)
   - See suggested actions
   - Add follow-up notes

**Background Processing** (Optional):
- Enable in Settings → Background Processing
- Requires OpenAI API key
- Runs every 2 minutes
- Analyzes unprocessed thoughts
- Suggests relevant actions and tools

**Technical Details**:
- Stored in IndexedDB (`thoughts` table)
- AI processing via `/api/process-thought`
- Processing queue managed by `useProcessQueue`
- Tags stored as JSON array
- CBT analysis stored as JSON object

---

### 4. Mood Tracking

**Purpose**: Monitor emotional well-being over time.

**Key Features**:
- 😊 **Daily Mood Log**: Rate mood 1-10 with notes
- 📈 **Trend Visualization**: Charts and patterns
- 📝 **Context Notes**: Add notes about mood triggers
- 🔗 **Thought Integration**: Link moods to specific thoughts
- 📊 **Statistics**: Average mood, trends, patterns
- 🗓️ **Calendar View**: Visual mood history

**How to Use**:
1. Go to `/tools/moodtracker`
2. Click "Log Mood"
3. Select mood value (1-10)
4. Add optional note
5. Save entry

**Technical Details**:
- Stored in IndexedDB (`moods` table)
- Can link to thoughts via `sourceThoughtId`
- Syncs to Firebase when authenticated

---

### 5. CBT Tools

**Purpose**: Cognitive Behavioral Therapy exercises for mental health.

**Key Features**:
- 🧠 **Thought Records**: Structured CBT analysis
- 💭 **Automatic Thoughts**: Identify negative patterns
- 🔍 **Evidence Gathering**: Challenge cognitive distortions
- ✨ **Alternative Thoughts**: Reframe negative thinking
- 📊 **Progress Tracking**: Monitor improvement over time

**How to Use**:
1. Go to `/tools/cbt`
2. Start new thought record
3. Describe situation
4. Identify automatic thought
5. Note emotions and intensity
6. Gather evidence
7. Create alternative thought
8. Re-rate emotion

**Based on**: Dr. David Burns' "Feeling Good" methodology

---

### 6. Brainstorming Tool

**Purpose**: AI-powered ideation and problem-solving.

**Key Features**:
- 💡 **AI Chat**: Conversational brainstorming
- 🎯 **Context-Aware**: Uses your tasks and thoughts
- 🔄 **Multiple Iterations**: Refine ideas through dialogue
- 📋 **Action Items**: Generate tasks from ideas
- 💾 **Session History**: Save brainstorming sessions

**How to Use**:
1. Go to `/tools/brainstorming`
2. Enter OpenAI API key (Settings → OpenAI API Key)
3. Start conversation
4. Brainstorm ideas
5. Generate action items

**Requires**: OpenAI API key (stored locally, never sent to our servers)

---

### 7. Notes

**Purpose**: Rich note-taking and organization.

**Key Features**:
- 📝 **Rich Text**: Full note-taking capabilities
- 📁 **Categories**: Organize notes by category
- 🔍 **Search**: Find notes quickly
- 🏷️ **Tagging**: Flexible organization
- 💾 **Auto-Save**: Never lose your work

**How to Use**:
1. Go to `/tools/notes`
2. Add notes to tasks to create documentation
3. View and edit all notes in one place
4. Search across all notes
5. Filter by category
6. Auto-saves as you type

---

### 8. Projects

**Purpose**: Long-term goal and project tracking.

**Key Features**:
- 🎯 **Project Goals**: Define clear objectives
- 📋 **Task Linking**: Associate tasks with projects
- 📊 **Progress Tracking**: Visual progress indicators
- 🗓️ **Milestones**: Track key achievements
- 📝 **Project Notes**: Documentation and planning

**How to Use**:
1. Go to `/tools/projects`
2. Create new project
3. Add description and goals
4. Link related tasks
5. Track progress

---

### 9. Errands Tool

**Purpose**: Manage out-of-office tasks separately from desk work.

**Key Features**:
- 🚗 **Errand List**: Tasks requiring you to leave workspace
- 🏪 **Location-Based**: Shopping, appointments, pickups
- ✅ **Quick Complete**: Mark done on the go
- 📍 **Separate View**: Focused errand management

**How to Use**:
1. Create task in `/tools/tasks`
2. Toggle "Focus Eligible" OFF
3. View in `/tools/errands`
4. Complete when out and about

**Examples**: Shopping mall trips, doctor appointments, package pickup, errands, etc.

---

## Settings & Configuration

### General Settings

**Background Processing**:
- Enable/disable automatic thought analysis
- Default: OFF
- Requires: OpenAI API key
- Frequency: Every 2 minutes when enabled

**OpenAI API Key**:
- Required for AI features (brainstorming, thought processing)
- Stored locally in browser
- Never sent to our servers
- Get key from: https://platform.openai.com/api-keys

### Cloud Sync

**Auto-Sync**:
- Syncs every 5 minutes when authenticated
- Uploads local changes to Firebase
- No manual sync needed
- Works across devices

**Authentication**:
- Email/password sign in
- Google OAuth (optional)
- Anonymous mode (offline only)

---

## Keyboard Shortcuts

*Coming soon*

---

## Data Export/Import

**Export**:
- Format: JSON
- Includes: Tasks, thoughts, moods
- Location: Downloads folder

**Import**:
- Format: JSON (from export)
- Replaces current data
- Backup recommended

---

## Technical Limits

- **Local Storage**: Limited by browser (typically 50MB+)
- **Firebase Free Tier**:
  - 50K reads/day
  - 20K writes/day
  - 1GB storage
  - 10GB/month transfer

---

## Privacy & Security

- 🔒 **Local-First**: All data stored locally by default
- 🔐 **Encrypted Sync**: Firebase uses encryption in transit
- 👤 **User Isolation**: Each user's data is completely separate
- 🚫 **No Analytics**: We don't track your usage
- 💻 **Open Source**: Code is public and auditable

---

*Features documentation last updated: October 2025*
