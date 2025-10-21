# Tool Pages Design System

## Design Principles

### 1. **Minimal & Focused**
- Maximize content visibility
- Minimize decorative elements
- Remove distracting colors and gradients
- Clean, professional appearance

### 2. **Consistent Structure**
Every tool page follows the same layout:

```
┌─────────────────────────────────────────────┐
│ Header (compact, 1 line)                    │
│ - Title + inline stats + action button      │
└─────────────────────────────────────────────┘
         ↓ 16px spacing
┌─────────────────────────────────────────────┐
│ Filters (compact, minimal)                  │
│ - Only when needed                          │
│ - Inline, no card wrapper                   │
└─────────────────────────────────────────────┘
         ↓ 16px spacing
┌─────────────────────────────────────────────┐
│                                             │
│ MAIN CONTENT (starts immediately)           │
│                                             │
│ - List/Grid of items                        │
│ - Maximum screen real estate                │
│ - Clean cards                               │
│                                             │
└─────────────────────────────────────────────┘
```

## Component Hierarchy

```
ToolPageLayout (wrapper)
  ├── ToolHeader (reusable)
  │   ├── Title
  │   ├── InlineStats
  │   └── PrimaryAction
  │
  ├── ToolFilters (optional, reusable)
  │   └── Filter controls
  │
  └── ToolContent (main area)
      └── Tool-specific content
```

## Visual Specifications

### Header Component
```typescript
{
  height: "~60px",
  padding: "p-4",
  border: "border border-gray-200 dark:border-gray-800",
  background: "bg-white dark:bg-gray-900",
  layout: "flex items-center justify-between"
}
```

**Title:**
- Size: `text-xl`
- Weight: `font-bold`
- Color: `text-gray-900 dark:text-gray-100`
- No emoji unless essential

**Inline Stats:**
- Size: `text-xs`
- Color: `text-gray-500 dark:text-gray-400`
- Separator: `•` (bullet)
- Format: "X active • Y done"

**Action Button:**
- Size: `text-sm`
- Padding: `px-4 py-2`
- Style: `bg-gray-900 dark:bg-gray-100`
- Icon: `h-4 w-4`

### Filters Component
```typescript
{
  padding: "No wrapper, direct controls",
  spacing: "gap-2",
  controls: "Small dropdowns/buttons",
  layout: "flex flex-wrap"
}
```

### Content Cards
```typescript
{
  padding: "p-3 to p-4",
  border: "border border-gray-200 dark:border-gray-800",
  background: "bg-white dark:bg-gray-900",
  spacing: "gap-2",
  hover: "hover:border-gray-300 dark:hover:border-gray-700"
}
```

## Stats Display Rules

### DO:
✅ Show inline in header: "15 active • 8 done • 3 overdue"
✅ Keep text small (xs)
✅ Use neutral colors (gray)
✅ Only show essential numbers
✅ Use bullet separators

### DON'T:
❌ No separate stat cards grid
❌ No large numbers (2xl)
❌ No colorful backgrounds
❌ No gradients
❌ No icons for stats

## Filter Display Rules

### DO:
✅ Show filters inline without wrapper
✅ Small dropdowns (text-sm)
✅ Minimal padding
✅ Only show when necessary

### DON'T:
❌ No card wrapper for filters
❌ No large padding
❌ No decorative elements
❌ No collapsible sections (keep simple)

## Content Display Rules

### DO:
✅ Start content immediately after filters
✅ Use compact cards (p-3/p-4)
✅ Grid layout when appropriate
✅ Minimal borders and shadows
✅ Clean typography

### DON'T:
❌ No large empty states
❌ No excessive padding
❌ No heavy shadows
❌ No gradient backgrounds
❌ No colorful badges (use gray scale)

## Page-Specific Variations

### Tasks
- Show recurring tasks with "Done for today" badge
- Hide completed one-time tasks
- Toggle to show all

### Projects
- Show progress bars for active projects
- Inline linked item counts

### Focus
- Session history clickable
- Time-of-day formatting

### Thoughts
- Minimal card style
- Delete on hover

### Documents
- Task notes view
- Editing inline

### Mood Tracker
- Emotion buttons
- Compact history

## Color Palette

### Primary Colors
```css
Background: white / gray-900
Text: gray-900 / gray-100
Muted: gray-500 / gray-400
Border: gray-200 / gray-800
```

### Accent Colors (minimal use)
```css
Success: green-600 / green-400
Warning: red-600 / red-400
Info: blue-600 / blue-400
```

### Typography
```css
Headings: font-bold
Body: font-medium or font-normal
Small: text-xs to text-sm
Primary: text-sm to text-base
```

## Spacing System

```css
Container: space-y-4 (16px between sections)
Cards: gap-2 (8px between cards)
Header: p-4 (16px padding)
Card: p-3 to p-4 (12-16px padding)
Filters: gap-2 (8px between controls)
```

## Implementation Checklist

For each tool page:
- [ ] Use ToolHeader component
- [ ] Inline stats in header
- [ ] Minimal filters (if needed)
- [ ] No separate stats section
- [ ] Content starts immediately
- [ ] Clean card design
- [ ] Consistent spacing
- [ ] Dark mode support
- [ ] Responsive layout

## Example Structure

```tsx
<ToolPageLayout>
  <ToolHeader
    title="Tasks"
    stats={[
      { label: 'active', value: 15 },
      { label: 'done', value: 8 },
      { label: 'overdue', value: 3 }
    ]}
    action={{
      label: 'New Task',
      icon: Plus,
      onClick: handleNew
    }}
  />
  
  <ToolFilters>
    <select>...</select>
    <select>...</select>
  </ToolFilters>
  
  <ToolContent>
    {/* Tool-specific content */}
  </ToolContent>
</ToolPageLayout>
```

## Benefits

1. **Consistency** - All tools look and feel the same
2. **Efficiency** - More content visible, less scrolling
3. **Maintainability** - Change once, updates everywhere
4. **Performance** - Smaller bundle sizes
5. **UX** - Predictable, professional interface
6. **Focus** - User attention on content, not decoration

## Migration Priority

1. ✅ Tasks - Already optimized
2. ✅ Projects - Already optimized
3. ⏳ Focus - Needs header optimization
4. ⏳ Thoughts - Needs standardization
5. ⏳ Documents - Needs header optimization
6. ⏳ Mood Tracker - Needs header optimization
7. ⏳ CBT - Needs header optimization
8. ⏳ Brainstorming - Needs header optimization
