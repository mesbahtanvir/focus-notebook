/**
 * PackingListModal - Full-screen guided packing experience
 * Displays complete packing checklist with sections, custom items, and timeline
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePackingLists } from '@/store/usePackingLists';
import { useToast } from '@/hooks/use-toast';
import { InteractivePackingMode } from './InteractivePackingMode';
import {
  Search,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  RotateCcw,
  X,
  Zap,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Clock,
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

interface PackingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
}

export function PackingListModal({
  isOpen,
  onClose,
  tripId,
  tripName,
}: PackingListModalProps) {
  const { toast } = useToast();
  const {
    togglePacked,
    setItemStatus,
    addCustomItem,
    deleteCustomItem,
    toggleTimelineTask,
  } = usePackingLists();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<PackingSectionId>>(
    new Set(['essentials', 'clothing', 'personal', 'tech', 'extras'])
  );
  const [showTimeline, setShowTimeline] = useState(false);
  const [showInteractiveMode, setShowInteractiveMode] = useState(false);
  const [addingToSection, setAddingToSection] = useState<PackingSectionId | null>(null);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('');

  // Subscribe to packing list state for reactive updates
  const packingList = usePackingLists((state) => state.packingLists.get(tripId));

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

  // Track if we've shown confetti to avoid repeating
  const hasShownConfetti = useRef(false);

  // Confetti celebration on 100% completion
  useEffect(() => {
    if (progress.percentage === 100 && !hasShownConfetti.current && isOpen) {
      hasShownConfetti.current = true;

      // Trigger confetti animation
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#10b981', '#14b8a6', '#22c55e', '#84cc16'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();

      toast({
        title: '🎉 All packed!',
        description: "You're ready for your trip!",
      });
    }

    // Reset confetti tracker when percentage drops below 100
    if (progress.percentage < 100) {
      hasShownConfetti.current = false;
    }
  }, [progress.percentage, isOpen, toast]);

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
              const searchText = [
                item.name,
                item.description,
                item.tip,
                item.quantity,
              ]
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

  const handleSetItemStatus = async (itemId: string, status: PackingItemStatus) => {
    try {
      await setItemStatus(tripId, itemId, status);
    } catch (error) {
      console.error('Error setting item status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!isOpen || !packingList) {
    return null;
  }

  // Show interactive mode
  if (showInteractiveMode) {
    return (
      <InteractivePackingMode
        packingList={packingList}
        onSetItemStatus={handleSetItemStatus}
        onClose={() => setShowInteractiveMode(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                📦 Packing for {tripName}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                {progress.packed}/{progress.total} packed • {progress.percentage}%
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  progress.percentage === 100 ? 'bg-green-500' : 'bg-teal-500'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 space-y-2 sm:space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              size="sm"
              onClick={() => setShowInteractiveMode(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Quick Pack Mode</span>
              <span className="sm:hidden">Quick Pack</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{showTimeline ? 'Hide' : 'Show'} Timeline</span>
              <span className="sm:hidden">Timeline</span>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedSections(new Set())}
                >
                  Collapse All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
          {showTimeline ? (
            /* Timeline View */
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                Trip Timeline
              </h3>

              {packingList.timelinePhases.map((phase) => (
                <div
                  key={phase.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <span className="text-xl sm:text-2xl">{phase.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        {phase.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {phase.summary}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {phase.tasks.map((task) => {
                      const isCompleted =
                        packingList.timelineCompleted?.includes(task.id) || false;

                      return (
                        <button
                          key={task.id}
                          onClick={() => handleToggleTimelineTask(task.id)}
                          className={`w-full flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border text-left transition ${
                            isCompleted
                              ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
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
            <div className="space-y-4 sm:space-y-6">
              {filteredSections.length === 0 ? (
                <div className="py-12 sm:py-16 text-center">
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
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
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <span className="text-xl sm:text-2xl flex-shrink-0">{section.emoji}</span>
                          <div className="text-left flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                              {section.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              {section.summary}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          <Badge
                            variant={
                              packedCount === sectionItems.length
                                ? 'default'
                                : 'outline'
                            }
                            className={
                              packedCount === sectionItems.length
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : ''
                            }
                          >
                            {packedCount}/{sectionItems.length}
                          </Badge>
                          <span className="text-gray-400">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                      </button>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4">
                          {section.groups.map((group) => (
                            <div key={group.id}>
                              {/* Group Header */}
                              <div className="flex items-start gap-2 mb-2">
                                {group.icon && (
                                  <span className="text-base sm:text-lg">{group.icon}</span>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">
                                    {group.title}
                                  </h4>
                                  {group.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {group.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Group Items */}
                              <div className="space-y-2 ml-6 sm:ml-7">
                                {group.items.map((item) => {
                                  const itemStatus = getItemStatus(packingList, item.id);
                                  const isPacked = itemStatus === 'packed';

                                  return (
                                    <div
                                      key={item.id}
                                      className={`flex items-start justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border transition ${
                                        isPacked
                                          ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                                          : itemStatus === 'later'
                                          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
                                          : itemStatus === 'no-need'
                                          ? 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
                                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                                      }`}
                                    >
                                      <button
                                        onClick={() =>
                                          handleTogglePacked(item.id, isPacked)
                                        }
                                        className="flex items-start gap-2 sm:gap-3 flex-1 text-left min-w-0"
                                      >
                                        {isPacked ? (
                                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                        ) : itemStatus === 'later' ? (
                                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                          <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-xs sm:text-sm">
                                            {item.name}
                                            {item.quantity && (
                                              <span className="ml-2 text-xs text-gray-500">
                                                ({item.quantity})
                                              </span>
                                            )}
                                          </div>
                                          {item.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                                              {item.description}
                                            </p>
                                          )}
                                          {item.tip && (
                                            <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5 sm:mt-1">
                                              💡 {item.tip}
                                            </p>
                                          )}
                                        </div>
                                      </button>

                                      {/* Quick Pack Action Buttons */}
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleSetItemStatus(item.id, 'packed')}
                                          className={`p-1.5 sm:p-2 rounded-md transition-all ${
                                            itemStatus === 'packed'
                                              ? 'bg-green-500 text-white shadow-sm'
                                              : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                                          }`}
                                          title="Mark as packed (→)"
                                        >
                                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleSetItemStatus(item.id, 'later')}
                                          className={`p-1.5 sm:p-2 rounded-md transition-all ${
                                            itemStatus === 'later'
                                              ? 'bg-amber-500 text-white shadow-sm'
                                              : 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
                                          }`}
                                          title="Pack later (V)"
                                        >
                                          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleSetItemStatus(item.id, 'no-need')}
                                          className={`p-1.5 sm:p-2 rounded-md transition-all ${
                                            itemStatus === 'no-need'
                                              ? 'bg-gray-500 text-white shadow-sm'
                                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-400'
                                          }`}
                                          title="Mark as not needed (←)"
                                        >
                                          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                        {item.custom && (
                                          <button
                                            onClick={() =>
                                              handleDeleteCustomItem(
                                                section.id,
                                                item.id
                                              )
                                            }
                                            className="p-1.5 sm:p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition text-gray-400 hover:text-red-500 flex-shrink-0"
                                            title="Delete custom item"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                            <div className="ml-6 sm:ml-7 p-2.5 sm:p-3 rounded-lg border border-dashed border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/20">
                              <div className="space-y-2">
                                <Input
                                  placeholder="Item name"
                                  value={customItemName}
                                  onChange={(e) =>
                                    setCustomItemName(e.target.value)
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddCustomItem(section.id);
                                    }
                                  }}
                                  className="text-sm"
                                  autoFocus
                                />
                                <Input
                                  placeholder="Quantity (optional)"
                                  value={customItemQuantity}
                                  onChange={(e) =>
                                    setCustomItemQuantity(e.target.value)
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddCustomItem(section.id);
                                    }
                                  }}
                                  className="text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleAddCustomItem(section.id)
                                    }
                                    className="bg-teal-600 hover:bg-teal-700 flex-1 sm:flex-initial"
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
                                    className="flex-1 sm:flex-initial"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingToSection(section.id)}
                              className="ml-6 sm:ml-7 flex items-center gap-2 text-xs sm:text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition p-2 sm:p-0"
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

        {/* Footer */}
        <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
            {progress.percentage === 100 ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                🎉 All packed! You&apos;re ready to go!
              </span>
            ) : (
              <span>
                Keep going! {progress.total - progress.packed} items remaining
              </span>
            )}
          </div>
          <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
            Save & Close
          </Button>
        </div>
      </div>
    </div>
  );
}
