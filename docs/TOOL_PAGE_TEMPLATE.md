# Tool Page Template Guide

Complete guide to creating consistent tool pages using the template system.

## Quick Start

```typescript
import { toolThemes } from "@/components/tools/themes";
import { ToolHeader, SearchAndFilters, ToolPageLayout, ToolList } from "@/components/tools";
import { DetailedCardEntry } from "@/components/tools/EntryLayouts";
import { ToolInfoSection } from "@/components/tools/ToolInfoSection";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { useToolSearchAndPaginate } from "@/hooks/useToolData";

export default function MyToolPage() {
  const theme = toolThemes.purple; // Choose your color theme
  const items = useMyStore(s => s.items);
  const { searchTerm, setSearchTerm, displayedItems } = useToolSearchAndPaginate(items, ['title']);
  
  return (
    <ToolPageLayout>
      <ToolHeader
        title="My Tool"
        emoji="🔧"
        showBackButton
        stats={[...]}
        theme={theme}
      />
      
      <div className="px-4 py-3 mb-4">
        <SearchAndFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          theme={theme}
        />
      </div>
      
      <ToolList>
        {displayedItems.map(item => (
          <DetailedCardEntry key={item.id} {...item} theme={theme} />
        ))}
      </ToolList>
      
      <ToolInfoSection
        title="About This Tool"
        content="Helpful information..."
        theme={theme}
      />
      
      <FloatingActionButton
        onClick={handleCreate}
        title="New Item"
      />
    </ToolPageLayout>
  );
}
```

## Available Themes

All themes are in `src/components/tools/themes.ts`:

- `purple` - Purple/pink gradient (default for most tools)
- `blue` - Blue/cyan gradient
- `green` - Green/emerald gradient
- `orange` - Orange/amber gradient
- `pink` - Pink/rose gradient
- `indigo` - Indigo/violet gradient
- `yellow` - Yellow/orange gradient
- `teal` - Teal/cyan gradient

Each theme includes:
- Header background and border colors
- Text gradient colors
- Search section colors
- Stat badge colors
- FAB gradient
- Info section colors

## Components

### ToolHeader

Header component with back button, title, stats, and optional action.

```typescript
<ToolHeader
  title="Tool Name"
  emoji="🎯"
  icon={Target}
  showBackButton
  stats={[
    { label: 'total', value: 42, variant: 'info' },
    { label: 'active', value: 10, variant: 'success' },
  ]}
  subtitle="Optional subtitle text"
  theme={toolThemes.purple}
/>
```

**Props:**
- `title` (required) - Page title
- `emoji` - Optional emoji before title
- `icon` - Optional Lucide icon
- `showBackButton` - Show back navigation button
- `stats` - Array of stat badges
- `subtitle` - Optional description text
- `theme` - Color theme object
- `action` - Optional action button config
- `actionElement` - Custom action element

**Stat Variants:**
- `default` - Gray badge
- `info` - Blue badge
- `success` - Green badge
- `warning` - Orange badge

### SearchAndFilters

Search bar and collapsible filter section.

```typescript
<SearchAndFilters
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Search..."
  totalCount={100}
  filteredCount={25}
  showFilterToggle
  filterContent={<YourFilterComponents />}
  theme={toolThemes.purple}
/>
```

**Props:**
- `searchValue` (required) - Current search query
- `onSearchChange` (required) - Search change handler
- `searchPlaceholder` - Input placeholder text
- `totalCount` - Total items count
- `filteredCount` - Filtered items count
- `showFilterToggle` - Show filter toggle button
- `filterContent` - Custom filter UI
- `theme` - Color theme

### Entry Layouts

Three pre-built entry layouts:

#### 1. SimpleListEntry
Basic horizontal list item.

```typescript
<SimpleListEntry
  icon={<Brain />}
  title="Item Title"
  subtitle="Subtitle text"
  badge={<Badge>Active</Badge>}
  onClick={() => handleClick(item)}
/>
```

#### 2. DetailedCardEntry
Full-featured card with metadata and actions.

```typescript
<DetailedCardEntry
  icon={<Brain />}
  iconBg="bg-gradient-to-r from-purple-500 to-pink-500"
  title="Item Title"
  description="Longer description text here"
  metadata={[
    { label: 'Date', value: '2024-01-15', variant: 'default' },
    { label: 'Tags', value: 'work, urgent', variant: 'info' },
  ]}
  actions={[
    { icon: Edit, onClick: handleEdit },
    { icon: Trash, onClick: handleDelete },
  ]}
  onClick={() => handleClick(item)}
  theme={toolThemes.purple}
/>
```

#### 3. CompactGridEntry
Smaller card for grid layouts.

```typescript
<CompactGridEntry
  icon={<Icon />}
  title="Compact Item"
  stats={[
    { label: 'Progress', value: '75%' },
    { label: 'Status', value: 'Active' },
  ]}
  onClick={() => handleClick(item)}
  theme={toolThemes.purple}
/>
```

### ToolInfoSection

Optional informational section at the bottom.

```typescript
<ToolInfoSection
  title="About This Tool"
  content="Helpful information about how to use this tool..."
  icon={<InfoCircle />}
  theme={toolThemes.purple}
/>
```

**Props:**
- `title` (required) - Section title
- `content` (required) - String or ReactNode content
- `icon` - Optional icon
- `theme` - Color theme
- `className` - Additional classes

## Hooks

### useToolSearch

Search items by specified fields.

```typescript
const { searchTerm, setSearchTerm, filteredItems, clearSearch } = useToolSearch(
  items,
  ['title', 'description']
);
```

### useToolFilters

Multiple filter criteria.

```typescript
const { filters, setFilter, toggleFilter, resetFilters, filteredItems } = useToolFilters(
  items,
  {
    active: (item) => item.status === 'active',
    urgent: (item) => item.priority === 'urgent',
  }
);
```

### useToolPagination

Paginate items with "load more".

```typescript
const { displayedItems, hasMore, loadMore, reset, totalCount } = useToolPagination(
  items,
  20 // items per page
);
```

### useToolSearchAndPaginate

Combined search and pagination.

```typescript
const {
  searchTerm,
  setSearchTerm,
  displayedItems,
  hasMore,
  loadMore,
  totalCount,
} = useToolSearchAndPaginate(items, ['title'], 20);
```

## Page Structure

Standard tool page layout:

1. **Header** - Title, stats, back button
2. **Search & Filters** - Search bar, filter controls
3. **Content Area** - ToolList with entries
4. **Info Section** (optional) - Helpful information
5. **FAB** - Floating action button for creating

## Complete Example

See `src/components/tools/ToolPageExample.tsx` for a complete working example.

## Best Practices

1. **Choose a theme** - Pick a theme that matches your tool's purpose
2. **Keep stats relevant** - Show important metrics users care about
3. **Use pagination** - For large lists, use the pagination hook
4. **Add info section** - Help users understand the tool's purpose
5. **Consistent spacing** - Use px-4 py-3 for search section margins
6. **Empty states** - Always provide empty state with helpful message

## Migration from Existing Tools

To migrate an existing tool page:

1. Import the theme system
2. Replace custom header with `ToolHeader`
3. Replace search/filter UI with `SearchAndFilters`
4. Use `ToolList` for consistent container
5. Use entry layouts instead of custom cards
6. Add `ToolInfoSection` if helpful
7. Use `useToolSearchAndPaginate` for data handling

