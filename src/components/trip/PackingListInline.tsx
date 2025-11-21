/**
 * PackingListInline - Inline packing list display for trip detail page
 * Shows complete packing checklist embedded in the trip page
 */

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePackingLists } from '@/store/usePackingLists';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { InteractivePackingMode } from './InteractivePackingMode';
import {
  Search,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Package,
  AlertTriangle,
  Zap,
  Clock,
  Keyboard,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import type { PackingSectionId, PackingItemStatus, PackingList } from '@/types/packing-list';

/**
 * Helper function to get item status from packing list
 * Supports both new itemStatuses and legacy packedItemIds
 */
function getItemStatus(packingList: PackingList, itemId: string): PackingItemStatus {
  // Prefer new itemStatuses system
  if (packingList.itemStatuses?.[itemId]) {
    return packingList.itemStatuses[itemId];
  }

  // Fallback to legacy packedItemIds for backward compatibility
  if (packingList.packedItemIds.includes(itemId)) {
    return 'packed';
  }

  return 'unpacked';
}

/**
 * Helper function to check if item is packed
 */
function isItemPacked(packingList: PackingList, itemId: string): boolean {
  return getItemStatus(packingList, itemId) === 'packed';
}

interface PackingListInlineProps {
  tripId: string;
  tripName: string;
  tripStatus: 'planning' | 'in-progress' | 'completed';
}

export function PackingListInline({ tripId, tripName, tripStatus }: PackingListInlineProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    subscribe,
    togglePacked,
    setItemStatus,
    addCustomItem,
    deleteCustomItem,
    toggleTimelineTask,
    createPackingList,
    deletePackingList,
  } = usePackingLists();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<PackingSectionId>>(
    new Set(['essentials'])
  );
  const [showTimeline, setShowTimeline] = useState(false);
  const [showInteractiveMode, setShowInteractiveMode] = useState(false);
  const [addingToSection, setAddingToSection] = useState<PackingSectionId | null>(null);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const [keyboardNavigationActive, setKeyboardNavigationActive] = useState(false);

  // Subscribe to packing list
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribeFn = subscribe(user.uid, tripId);

    return () => {
      unsubscribeFn();
    };
  }, [user?.uid, tripId, subscribe]);

  // Subscribe to packing list state for reactive updates
  const packingList = usePackingLists((state) => state.packingLists.get(tripId));
  const isLoading = usePackingLists((state) => state.isLoading.get(tripId) || false);

  // Calculate progress reactively when packingList changes
  const progress = useMemo(() => {
    if (!packingList) {
      return { total: 0, packed: 0, percentage: 0 };
    }

    // Count total items from sections
    let totalItems = 0;
    packingList.sections.forEach((section) => {
      section.groups.forEach((group) => {
        totalItems += group.items.length;
      });
    });

    // Count custom items
    if (packingList.customItems) {
      Object.values(packingList.customItems).forEach((items) => {
        totalItems += items.length;
      });
    }

    // Count packed items - support both old and new format
    let packedCount = 0;
    if (packingList.itemStatuses) {
      // New format: count items with status 'packed'
      packedCount = Object.values(packingList.itemStatuses).filter(
        (status) => status === 'packed'
      ).length;
    } else {
      // Fallback to old format
      packedCount = packingList.packedItemIds?.length || 0;
    }

    const percentage = totalItems === 0 ? 0 : Math.round((packedCount / totalItems) * 100);

    return {
      total: totalItems,
      packed: packedCount,
      percentage,
    };
  }, [packingList]);

  // Status gating - only show for planning or in-progress trips
  const canUsePacking = tripStatus === 'planning' || tripStatus === 'in-progress';

  // Filter sections and items based on search
  const filteredSections = useMemo(() => {
    if (!packingList) return [];

    const query = searchQuery.toLowerCase().trim();
    if (!query) return packingList.sections;

    return packingList.sections
      .map((section) => {
        const filteredGroups = section.groups
          .map((group) => {
            const filteredItems = group.items.filter((item) => {
              const searchText = [item.name, item.description, item.tip, item.quantity]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
              return searchText.includes(query);
            });

            if (filteredItems.length === 0) return null;

            return {
              ...group,
              items: filteredItems,
            };
          })
          .filter((g) => g !== null);

        if (filteredGroups.length === 0) return null;

        return {
          ...section,
          groups: filteredGroups,
        };
      })
      .filter((s) => s !== null);
  }, [packingList, searchQuery]);

  // Build flat list of all items for keyboard navigation
  const allItems = useMemo(() => {
    if (!packingList || showTimeline) return [];

    return filteredSections.flatMap((section) =>
      section.groups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          sectionId: section.id,
        }))
      )
    );
  }, [packingList, filteredSections, showTimeline]);

  const toggleSection = (sectionId: PackingSectionId) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleTogglePacked = async (itemId: string, currentlyPacked: boolean) => {
    try {
      await togglePacked(tripId, itemId, !currentlyPacked);
    } catch (error) {
      console.error('Error toggling packed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSetItemStatus = useCallback(async (itemId: string, status: PackingItemStatus) => {
    try {
      await setItemStatus(tripId, itemId, status);
    } catch (error) {
      console.error('Error setting item status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item. Please try again.',
        variant: 'destructive',
      });
    }
  }, [tripId, setItemStatus, toast]);

  // Keyboard navigation
  useEffect(() => {
    if (!isExpanded || showTimeline || allItems.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Navigation keys
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setKeyboardNavigationActive(true);
        setSelectedItemIndex((prev) => {
          const nextIndex = prev + 1;
          return nextIndex >= allItems.length ? 0 : nextIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKeyboardNavigationActive(true);
        setSelectedItemIndex((prev) => {
          const nextIndex = prev - 1;
          return nextIndex < 0 ? allItems.length - 1 : nextIndex;
        });
      }
      // Action keys
      else if (e.key === 'ArrowRight' && selectedItemIndex >= 0) {
        e.preventDefault();
        const item = allItems[selectedItemIndex];
        handleSetItemStatus(item.id, 'packed');
      } else if (e.key === 'ArrowLeft' && selectedItemIndex >= 0) {
        e.preventDefault();
        const item = allItems[selectedItemIndex];
        handleSetItemStatus(item.id, 'no-need');
      } else if ((e.key === 'v' || e.key === 'V') && selectedItemIndex >= 0) {
        e.preventDefault();
        const item = allItems[selectedItemIndex];
        handleSetItemStatus(item.id, 'later');
      }
      // Escape to deactivate keyboard navigation
      else if (e.key === 'Escape') {
        setKeyboardNavigationActive(false);
        setSelectedItemIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, showTimeline, allItems, selectedItemIndex, handleSetItemStatus]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemIndex >= 0 && keyboardNavigationActive) {
      const element = document.getElementById(`packing-item-${allItems[selectedItemIndex]?.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedItemIndex, keyboardNavigationActive, allItems]);

  const handleAddCustomItem = async (sectionId: PackingSectionId) => {
    if (!customItemName.trim()) return;

    try {
      await addCustomItem(tripId, sectionId, {
        name: customItemName.trim(),
        quantity: customItemQuantity.trim() || undefined,
        custom: true,
      });

      setCustomItemName('');
      setCustomItemQuantity('');
      setAddingToSection(null);

      toast({
        title: 'Item added',
        description: 'Your custom item has been added to the packing list.',
      });
    } catch (error) {
      console.error('Error adding custom item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCustomItem = async (sectionId: PackingSectionId, itemId: string) => {
    try {
      await deleteCustomItem(tripId, sectionId, itemId);
      toast({
        title: 'Item deleted',
        description: 'Custom item has been removed.',
      });
    } catch (error) {
      console.error('Error deleting custom item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTimelineTask = async (taskId: string) => {
    try {
      await toggleTimelineTask(tripId, taskId);
    } catch (error) {
      console.error('Error toggling timeline task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update timeline. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePackingList = async () => {
    try {
      setIsCreating(true);
      await createPackingList(tripId);
      setIsExpanded(true);
      toast({
        title: 'Packing list created!',
        description: 'Your personalized packing list is ready.',
      });
    } catch (error) {
      console.error('Error creating packing list:', error);
      toast({
        title: 'Error',
        description: 'Failed to create packing list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePackingList = async () => {
    try {
      setIsDeleting(true);
      await deletePackingList(tripId);
      setShowDeleteConfirm(false);
      toast({
        title: 'Packing list deleted',
        description: 'Your packing list has been removed.',
      });
    } catch (error) {
      console.error('Error deleting packing list:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete packing list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Status gating message
  if (!canUsePacking) {
    return (
      <Card className="p-6 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Package className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">Packing list unavailable</p>
            <p className="text-xs">Packing lists are only available for upcoming or active trips.</p>
          </div>
        </div>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading packing list...</p>
        </div>
      </Card>
    );
  }

  // No packing list yet - show create button
  if (!packingList) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-teal-600" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Packing Checklist</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create a smart packing list for this trip
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreatePackingList}
            disabled={isCreating}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Packing List
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Packing list exists - show inline view
  return (
    <>
      <Card className="border-teal-200 dark:border-teal-800">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-3 flex-1"
            >
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Packing Checklist
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {progress.packed}/{progress.total} items packed
                </p>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => setShowInteractiveMode(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Zap className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Quick Pack</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Badge
                variant={progress.percentage === 100 ? 'default' : 'outline'}
                className={
                  progress.percentage === 100
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : ''
                }
              >
                {progress.percentage}% Complete
              </Badge>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                progress.percentage === 100 ? 'bg-green-500' : 'bg-teal-500'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-6 pt-4">
          {/* Toolbar */}
          <div className="mb-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimeline(!showTimeline)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {showTimeline ? 'Hide' : 'Show'} Timeline
                </Button>
                {!showTimeline && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedSections(
                          new Set(['essentials', 'clothing', 'personal', 'tech', 'extras'])
                        )
                      }
                    >
                      Expand All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setExpandedSections(new Set())}>
                      Collapse All
                    </Button>
                  </>
                )}
              </div>

              {/* Keyboard Shortcuts Hint */}
              {!showTimeline && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-md">
                  <Keyboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    Use <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono ml-1">↓</kbd> to navigate,
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono ml-1">→</kbd> packed,
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono ml-1">←</kbd> not needed,
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono ml-1">V</kbd> later
                  </span>
                  <span className="sm:hidden">Keyboard shortcuts available</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {showTimeline ? (
            /* Timeline View */
            <div className="space-y-4">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Trip Timeline
              </h4>

              {packingList.timelinePhases.map((phase) => (
                <div
                  key={phase.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-800 p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{phase.emoji}</span>
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                        {phase.title}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{phase.summary}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {phase.tasks.map((task) => {
                      const isCompleted = packingList.timelineCompleted?.includes(task.id) || false;

                      return (
                        <button
                          key={task.id}
                          onClick={() => handleToggleTimelineTask(task.id)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                            isCompleted
                              ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Packing Sections View */
            <div className="space-y-4">
              {filteredSections.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No items match your search
                  </p>
                </div>
              ) : (
                filteredSections.map((section) => {
                  const isExpanded = expandedSections.has(section.id);
                  const sectionItems = section.groups.flatMap((g) => g.items);
                  const packedCount = sectionItems.filter((item) =>
                    isItemPacked(packingList, item.id)
                  ).length;

                  return (
                    <div
                      key={section.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-800"
                    >
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{section.emoji}</span>
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                              {section.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {section.summary}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={packedCount === sectionItems.length ? 'default' : 'outline'}
                            className={
                              packedCount === sectionItems.length
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : ''
                            }
                          >
                            {packedCount}/{sectionItems.length}
                          </Badge>
                          <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                        </div>
                      </button>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="p-4 pt-0 space-y-4">
                          {section.groups.map((group) => (
                            <div key={group.id}>
                              {/* Group Header */}
                              <div className="flex items-start gap-2 mb-2">
                                {group.icon && <span className="text-lg">{group.icon}</span>}
                                <div>
                                  <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                    {group.title}
                                  </h5>
                                  {group.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {group.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Group Items */}
                              <div className="space-y-2 ml-7">
                                {group.items.map((item) => {
                                  const itemStatus = getItemStatus(packingList, item.id);
                                  const isPacked = itemStatus === 'packed';
                                  const itemIndex = allItems.findIndex((i) => i.id === item.id);
                                  const isSelected = keyboardNavigationActive && selectedItemIndex === itemIndex;

                                  return (
                                    <div
                                      key={item.id}
                                      id={`packing-item-${item.id}`}
                                      className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition ${
                                        isSelected
                                          ? 'border-teal-500 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/50 ring-2 ring-teal-500/50'
                                          : isPacked
                                          ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                                          : itemStatus === 'later'
                                          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
                                          : itemStatus === 'no-need'
                                          ? 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
                                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                                      }`}
                                    >
                                      <button
                                        onClick={() => handleTogglePacked(item.id, isPacked)}
                                        className="flex items-start gap-3 flex-1 text-left"
                                      >
                                        {isPacked ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                        ) : itemStatus === 'later' ? (
                                          <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                          <Circle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">
                                            {item.name}
                                            {item.quantity && (
                                              <span className="ml-2 text-xs text-gray-500">
                                                ({item.quantity})
                                              </span>
                                            )}
                                          </div>
                                          {item.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                              {item.description}
                                            </p>
                                          )}
                                          {item.tip && (
                                            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                                              💡 {item.tip}
                                            </p>
                                          )}
                                        </div>
                                      </button>

                                      {/* Quick Pack Action Buttons */}
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleSetItemStatus(item.id, 'packed')}
                                          className={`p-2 rounded-md transition-all ${
                                            itemStatus === 'packed'
                                              ? 'bg-green-500 text-white shadow-sm'
                                              : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                                          }`}
                                          title="Mark as packed (→)"
                                        >
                                          <ArrowRight className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleSetItemStatus(item.id, 'later')}
                                          className={`p-2 rounded-md transition-all ${
                                            itemStatus === 'later'
                                              ? 'bg-amber-500 text-white shadow-sm'
                                              : 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
                                          }`}
                                          title="Pack later (V)"
                                        >
                                          <ChevronDown className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleSetItemStatus(item.id, 'no-need')}
                                          className={`p-2 rounded-md transition-all ${
                                            itemStatus === 'no-need'
                                              ? 'bg-gray-500 text-white shadow-sm'
                                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-400'
                                          }`}
                                          title="Mark as not needed (←)"
                                        >
                                          <ArrowLeft className="w-4 h-4" />
                                        </button>
                                        {item.custom && (
                                          <button
                                            onClick={() =>
                                              handleDeleteCustomItem(section.id, item.id)
                                            }
                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition text-gray-400 hover:text-red-500"
                                            title="Delete custom item"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          {/* Add Custom Item */}
                          {addingToSection === section.id ? (
                            <div className="ml-7 p-3 rounded-lg border border-dashed border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/20">
                              <div className="space-y-2">
                                <Input
                                  placeholder="Item name"
                                  value={customItemName}
                                  onChange={(e) => setCustomItemName(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddCustomItem(section.id);
                                    }
                                  }}
                                  autoFocus
                                />
                                <Input
                                  placeholder="Quantity (optional)"
                                  value={customItemQuantity}
                                  onChange={(e) => setCustomItemQuantity(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddCustomItem(section.id);
                                    }
                                  }}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddCustomItem(section.id)}
                                    className="bg-teal-600 hover:bg-teal-700"
                                  >
                                    Add Item
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setAddingToSection(null);
                                      setCustomItemName('');
                                      setCustomItemQuantity('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingToSection(section.id)}
                              className="ml-7 flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition"
                            >
                              <Plus className="w-4 h-4" />
                              Add custom item
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Delete Packing List?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This will permanently delete your packing list and all custom items. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeletePackingList}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Interactive Packing Mode */}
      {showInteractiveMode && packingList && (
        <InteractivePackingMode
          packingList={packingList}
          onSetItemStatus={handleSetItemStatus}
          onClose={() => setShowInteractiveMode(false)}
        />
      )}
    </>
  );
}
