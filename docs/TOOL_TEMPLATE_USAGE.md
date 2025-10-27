# Tool Page Template Usage Guide

## Quick Reference

### Creating a New Tool Page

```typescript
"use client";

import { useState, useMemo } from "react";
import { Brain, Plus, Edit2, Trash2 } from "lucide-react";
import { toolThemes } from "@/components/tools/themes";
import {
  ToolHeader,
  SearchAndFilters,
  ToolPageLayout,
  ToolList,
  ToolInfoSection,
  DetailedCardEntry,
} from "@/components/tools";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { useToolSearchAndPaginate } from "@/hooks/useToolData";

// Your data interface
interface MyItem {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  tags: string[];
}

export default function MyToolPage() {
  // 1. Choose your theme
  const theme = toolThemes.purple; // Change to blue, green, orange, etc.
  
  // 2. Get your data from store
  const items = useMyStore(s => s.items);
  
  // 3. Use search and pagination hooks
  const {
    searchTerm,
    setSearchTerm,
    displayedItems,
    hasMore,
    loadMore,
  } = useToolSearchAndPaginate(items, ['title', 'description'], 20);
  
  // 4. Calculate stats
  const stats = [
    { label: 'total', value: items.length, variant: 'info' },
    { label: 'active', value: items.filter(i => !i.completed).length, variant: 'success' },
  ];
  
  return (
    <ToolPageLayout>
      {/* Header Section */}
      <ToolHeader
        title="My Tool"
        emoji="🔧"
        showBackButton
        stats={stats}
        theme={theme}
      />
      
      {/* Search & Filters */}
      <div className="px-4 py-3 mb-4">
        <SearchAndFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search items..."
          theme={theme}
          totalCount={items.length}
        />
      </div>
      
      {/* Content Area */}
      <ToolList>
        {displayedItems.map((item) => (
          <DetailedCardEntry
            key={item.id}
            icon={<Brain className="h-5 w-5 text-white" />}
            title={item.title}
            description={item.description}
            metadata={[
              { label: 'Created', value: new Date(item.createdAt).toLocaleDateString() },
              { label: 'Tags', value: item.tags.join(', ') },
            ]}
            actions={[
              { icon: Edit2, onClick: () => console.log('Edit', item.id) },
              { icon: Trash2, onClick: () => console.log('Delete', item.id) },
            ]}
            theme={theme}
            onClick={() => console.log('Click', item.id)}
          />
        ))}
        
        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMore}
              className="px-6 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/40 text-purple-700 dark:text-purple-300 rounded-lg"
            >
              Load More
            </button>
          </div>
        )}
      </ToolList>
      
      {/* Info Section */}
      <ToolInfoSection
        title="About My Tool"
        content="This tool helps you manage and organize your items. Use the search bar to find specific items, and click on any item to view details."
        theme={theme}
      />
      
      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => console.log('Create new item')}
        title="New Item"
        icon={<Plus className="h-6 w-6" />}
      />
    </ToolPageLayout>
  );
}
```

## Theme Selection

### Available Themes

```typescript
import { toolThemes } from "@/components/tools/themes";

// Choose based on tool purpose
const theme = toolThemes.purple;  // Default, general purpose
const theme = toolThemes.blue;    // Focus, projects, tech
const theme = toolThemes.green;   // Goals, growth, success
const theme = toolThemes.orange;  // Tasks, errands, urgent
const theme = toolThemes.pink;    // Relationships, personal
const theme = toolThemes.indigo; // Advanced features
const theme = toolThemes.yellow;  // Brainstorming, creative
const theme = toolThemes.teal;    // Learning, knowledge
```

## Component Variations

### SimpleListEntry - Minimal layout

```typescript
<SimpleListEntry
  icon={<Icon />}
  title="Item Title"
  subtitle="Additional info"
  badge={<span className="badge">Active</span>}
  onClick={() => handleClick(item)}
/>
```

### CompactGridEntry - For grids

```typescript
<ToolGrid columns={3}>
  {items.map(item => (
    <CompactGridEntry
      key={item.id}
      icon={<Icon />}
      title={item.title}
      stats={[
        { label: 'Value', value: item.value },
        { label: 'Status', value: item.status },
      ]}
      onClick={() => handleClick(item)}
      theme={theme}
    />
  ))}
</ToolGrid>
```

## Hooks Usage

### Basic Search Only

```typescript
const { searchTerm, setSearchTerm, filteredItems } = useToolSearch(
  items,
  ['title', 'description']
);
```

### With Filters

```typescript
const { filteredItems: searchFiltered } = useToolSearch(items, ['title']);
const { filteredItems: finalFiltered } = useToolFilters(
  searchFiltered,
  {
    active: (item) => item.status === 'active',
    urgent: (item) => item.priority === 'urgent',
  }
);
```

### With Custom Sorting

```typescript
const { displayedItems } = useToolPagination(
  items.sort((a, b) => a.title.localeCompare(b.title)),
  20
);
```

## Empty State

```typescript
<EmptyState
  icon={<Brain className="h-12 w-12" />}
  title="No items found"
  description="Create your first item to get started"
  action={{
    label: 'Create Item',
    onClick: () => handleCreate(),
  }}
/>
```

## Stats Badges

```typescript
const stats = [
  { label: 'total', value: 100, variant: 'info' },      // Blue
  { label: 'active', value: 50, variant: 'success' },    // Green
  { label: 'pending', value: 20, variant: 'warning' },  // Orange
  { label: 'archived', value: 30, variant: 'default' },  // Gray
];
```

## Responsive Behavior

All components are fully responsive:
- Headers adapt to mobile screens
- Search filters stack on small screens
- Grid layouts adjust column count
- Cards maintain readability at all sizes

## Dark Mode Support

All components automatically support dark mode through the theme system. No additional configuration needed.

