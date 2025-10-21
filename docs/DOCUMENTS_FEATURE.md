# Documents Feature

## Overview
A new **Documents** tool has been added to view all notes and documentation from your tasks. Notes taken during focus sessions are now permanently attached to tasks and can be viewed in a centralized location.

## 🎯 Key Features

### 1. Notes Attached to Tasks
**Notes are now persistent and linked to tasks**
- When you take notes during a focus session, they're saved to the actual task
- Notes include timestamp showing when they were added
- Multiple notes can be added to the same task over time
- Each note session is separated with a divider for clarity

### 2. Documents Page
**Centralized view of all your notes**
- Access via **Tools → Documents** (📚)
- Shows all tasks that have notes
- Search functionality across titles and content
- Filter by category (Mastery/Pleasure)
- Statistics dashboard showing:
  - Total documents
  - Documents by category
  - Total word count

### 3. Document Cards
**Rich display of task documentation**
- Task title and completion status
- Category and priority badges
- Tags if available
- Creation date
- Word count
- Full notes content with formatting preserved

## 📊 How It Works

### Taking Notes During Focus Session
1. Start a focus session
2. Work on a task
3. Click **"Add Notes"** button
4. Write your notes (findings, insights, documentation)
5. Click **"Save Notes"**
6. Notes are saved to:
   - Focus session (temporary)
   - Task itself (permanent)

### Note Format
Notes are appended to tasks with timestamps:
```
**Focus Session Notes (10/20/2025, 5:30:00 PM)**
Your notes here...

---
**Focus Session Notes (10/21/2025, 9:15:00 AM)**
More notes from another session...
```

### Viewing Documents
1. Go to **Tools** page
2. Click **Documents** (📚 icon)
3. Browse all your documented tasks
4. Use search to find specific content
5. Filter by category

## 🔍 Search & Filter

### Search
- Searches in both task titles and note content
- Real-time filtering
- Case-insensitive

### Filters
- **All Categories**: Shows all documents
- **Mastery**: Shows only mastery-related docs
- **Pleasure**: Shows only pleasure-related docs

## 📈 Statistics

The Documents page shows:
- **Total Documents**: Count of all tasks with notes
- **Mastery**: Count of mastery tasks with notes
- **Pleasure**: Count of pleasure tasks with notes
- **Total Words**: Sum of all words across all notes

## 💡 Use Cases

### Research Documentation
```
Task: "Research Next.js App Router"
Notes: Document all findings about:
- Server Components
- Streaming
- Caching strategies
- Best practices
```

### Meeting Notes
```
Task: "Team standup meeting"
Notes: Key decisions and action items:
- John will handle the API integration
- Deploy by Friday
- Need to review performance metrics
```

### Learning Progress
```
Task: "Learn TypeScript generics"
Notes: Key concepts learned:
- Type parameters
- Constraints
- Utility types
- Real-world examples
```

### Code Snippets
```
Task: "Implement authentication"
Notes: Useful code patterns:
- JWT token generation
- Middleware setup
- Error handling approach
```

## 🎨 UI Features

### Visual Design
- Clean card-based layout
- Gradient header with statistics
- Color-coded categories
- Status badges
- Responsive design

### Empty States
- Helpful message when no documents exist
- Guide to start taking notes
- Filtered results show appropriate message

## 🔧 Technical Implementation

### Files Modified
1. **`src/components/FocusSession.tsx`**
   - Updated `handleSaveNotes()` to save to task
   - Notes appended with timestamp
   - Preserves existing task notes

2. **`src/app/tools/documents/page.tsx`**
   - New page component
   - Search and filter functionality
   - Statistics calculations
   - Document cards with full content

3. **`src/app/tools/page.tsx`**
   - Added Documents tool to tools list
   - Violet/fuchsia gradient theme
   - 📚 emoji icon

### Data Flow
```
Focus Session → Take Notes → Save
    ↓
Update Task Notes (with timestamp)
    ↓
Documents Page reads from Tasks
    ↓
Display all tasks with notes
```

## 🚀 Benefits

### For Organization
- **Centralized Knowledge Base**: All notes in one place
- **Searchable**: Quickly find past insights
- **Context Preservation**: Notes stay with tasks

### For Productivity
- **Less Friction**: Take notes without leaving focus
- **Better Recall**: Review past work easily
- **Documentation**: Build knowledge base naturally

### For Learning
- **Progress Tracking**: See what you've learned
- **Reference Material**: Quick access to past research
- **Pattern Recognition**: Identify recurring themes

## 📋 Example Workflow

### Day 1: Research Session
```
1. Start focus session with "Research GraphQL"
2. Work and take notes about:
   - Query structure
   - Mutations
   - Schema design
3. Save notes to task
```

### Day 5: Implementation Session
```
1. Need to remember GraphQL patterns
2. Go to Documents page
3. Search "GraphQL"
4. Review notes from Day 1
5. Apply learnings to new task
```

## 🔜 Future Enhancements

Potential additions:
- **Export Documents**: Download as Markdown/PDF
- **Note Templates**: Quick templates for common use cases
- **Rich Text Editor**: Formatting options
- **Linking**: Link between related documents
- **Tags**: Add custom tags to documents
- **Version History**: See note evolution
- **AI Summary**: Generate summaries of long notes
- **Markdown Support**: Full markdown rendering
- **Attachments**: Add images/files to notes
- **Collaboration**: Share documents with team

## 🎯 Tips for Best Use

### Effective Note-Taking
1. **Be Specific**: Include concrete details and examples
2. **Use Structure**: Break notes into sections
3. **Add Context**: Explain why, not just what
4. **Include Links**: Reference external resources
5. **Review Regularly**: Revisit notes in Documents page

### Organization
1. **Tag Consistently**: Use consistent tag names
2. **Categorize Properly**: Choose mastery vs pleasure thoughtfully
3. **Update Notes**: Add to existing notes as you learn more
4. **Clean Up**: Archive or delete outdated notes

### Search Tips
1. **Use Keywords**: Search for specific technical terms
2. **Filter First**: Narrow by category before searching
3. **Browse**: Sometimes browsing reveals forgotten notes
4. **Check Dates**: Recent notes often most relevant

## 📊 Statistics Insights

The word count feature helps you:
- **Track Activity**: See how much documentation you're creating
- **Measure Growth**: Watch your knowledge base expand
- **Identify Gaps**: Find areas needing more documentation
- **Stay Motivated**: Visual progress indicator
