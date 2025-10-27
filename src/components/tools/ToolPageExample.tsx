"use client";

/**
 * Example template showing how to build a complete tool page
 * This demonstrates the standard structure and usage patterns
 */

import { useState } from "react";
import { Brain, Plus } from "lucide-react";
import { toolThemes, ToolTheme } from "./themes";
import { ToolHeader } from "./ToolHeader";
import { SearchAndFilters } from "./SearchAndFilters";
import { ToolPageLayout, ToolList, EmptyState } from "./ToolPageLayout";
import { DetailedCardEntry, SimpleListEntry } from "./EntryLayouts";
import { ToolInfoSection } from "./ToolInfoSection";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { useToolSearchAndPaginate } from "@/hooks/useToolData";

// Example data interface
interface ExampleItem {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  tags: string[];
  status: 'active' | 'completed' | 'archived';
}

// Example data
const exampleItems: ExampleItem[] = [
  {
    id: '1',
    title: 'Example Item 1',
    description: 'This is the first example item with some description text',
    createdAt: '2024-01-15',
    tags: ['important', 'urgent'],
    status: 'active',
  },
  {
    id: '2',
    title: 'Example Item 2',
    description: 'Second example with different content',
    createdAt: '2024-01-16',
    tags: ['work', 'project'],
    status: 'active',
  },
  {
    id: '3',
    title: 'Completed Item',
    description: 'This item has been completed',
    createdAt: '2024-01-10',
    tags: ['done'],
    status: 'completed',
  },
];

export function ToolPageExample() {
  const theme = toolThemes.purple;
  const [items] = useState<ExampleItem[]>(exampleItems);
  
  const {
    searchTerm,
    setSearchTerm,
    displayedItems,
    hasMore,
    loadMore,
    totalCount,
  } = useToolSearchAndPaginate(items, ['title', 'description'], 10);

  // Calculate stats
  const stats = [
    { label: 'total', value: items.length, variant: 'info' as const },
    { label: 'active', value: items.filter(i => i.status === 'active').length, variant: 'success' as const },
    { label: 'completed', value: items.filter(i => i.status === 'completed').length, variant: 'default' as const },
  ];

  return (
    <ToolPageLayout>
      {/* Header with back button, title, emoji, and stats */}
      <ToolHeader
        title="Example Tool"
        emoji="🧪"
        showBackButton
        stats={stats}
        theme={theme}
      />

      {/* Search and Filters */}
      <div className="px-4 py-3 mb-4">
        <SearchAndFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search items..."
          theme={theme}
          totalCount={items.length}
          filteredCount={displayedItems.length}
        />
      </div>

      {/* Content Area */}
      {displayedItems.length === 0 ? (
        <EmptyState
          icon={<Brain className="h-12 w-12" />}
          title="No items found"
          description="Create your first item to get started"
          action={{
            label: 'Create Item',
            onClick: () => console.log('Create clicked'),
          }}
        />
      ) : (
        <ToolList>
          {displayedItems.map((item) => (
            <DetailedCardEntry
              key={item.id}
              icon={<Brain className="h-5 w-5 text-white" />}
              title={item.title}
              description={item.description}
              metadata={[
                { label: 'Created', value: item.createdAt, variant: 'default' },
                { label: 'Tags', value: item.tags.join(', '), variant: 'info' },
                { label: 'Status', value: item.status, variant: item.status === 'completed' ? 'success' : 'default' },
              ]}
              actions={[
                { icon: Brain, onClick: () => console.log('Edit', item.id) },
              ]}
              theme={theme}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadMore}
                className="px-6 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/40 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
              >
                Load More ({totalCount - displayedItems.length} remaining)
              </button>
            </div>
          )}
        </ToolList>
      )}

      {/* Info Section */}
      <ToolInfoSection
        title="About This Tool"
        content="This is an example tool page demonstrating the standard template structure. Each tool can have different color themes while maintaining consistent layout and behavior."
        theme={theme}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => console.log('Create new')}
        title="New Item"
        icon={<Plus className="h-6 w-6" />}
      />
    </ToolPageLayout>
  );
}

