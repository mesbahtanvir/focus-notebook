/**
 * PackingListCard - Summary card for trip detail page
 * Shows packing list progress and quick actions
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePackingLists } from '@/store/usePackingLists';
import { CheckCircle2, Package, Plus, Sparkles, RefreshCw, Wand2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PackingListCardProps {
  tripId: string;
  tripStatus: 'planning' | 'in-progress' | 'completed';
  onOpenModal?: () => void;
}

export function PackingListCard({ tripId, tripStatus, onOpenModal }: PackingListCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    subscribe,
    unsubscribe,
    getPackingList,
    getProgress,
    isLoadingList,
    generatePackingListAI,
  } = usePackingLists();

  const [isCreating, setIsCreating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Subscribe to packing list
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribeFn = subscribe(user.uid, tripId);

    return () => {
      unsubscribeFn();
    };
  }, [user?.uid, tripId, subscribe]);

  const packingList = getPackingList(tripId);
  const isLoading = isLoadingList(tripId);
  const progress = getProgress(tripId);

  // Status gating - only show for planning or in-progress trips
  const canUsePacking = tripStatus === 'planning' || tripStatus === 'in-progress';

  const handleCreatePackingList = async () => {
    try {
      setIsCreating(true);
      const { insights } = await generatePackingListAI(tripId);
      toast({
        title: 'AI Packing List Created!',
        description: insights?.weather
          ? `Personalized for your destination. ${insights.weather}`
          : 'Your smart packing list is ready.',
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

  const handleRegeneratePackingList = async () => {
    try {
      setIsRegenerating(true);
      const { insights } = await generatePackingListAI(tripId, true);
      toast({
        title: 'Packing List Regenerated!',
        description: insights?.weather
          ? `Updated based on your trip details. ${insights.weather}`
          : 'Your packing list has been refreshed with new items.',
      });
    } catch (error) {
      console.error('Error regenerating packing list:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate packing list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
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
            <p className="text-xs">
              Packing lists are only available for upcoming or active trips.
            </p>
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
            <div className="p-2 bg-gradient-to-br from-purple-100 to-teal-100 dark:from-purple-900/30 dark:to-teal-900/30 rounded-lg">
              <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  AI Packing List
                </h3>
                <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Smart
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-generated based on destination, dates & activities
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreatePackingList}
            disabled={isCreating}
            className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Packing List
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Packing list exists - show progress card
  const sectionProgress = packingList.sections.map((section) => {
    const totalItems = section.groups.reduce((sum, group) => sum + group.items.length, 0);
    const packedItems = section.groups.reduce((sum, group) => {
      return sum + group.items.filter((item) => packingList.packedItemIds.includes(item.id)).length;
    }, 0);

    return {
      id: section.id,
      emoji: section.emoji,
      title: section.title,
      total: totalItems,
      packed: packedItems,
      percentage: totalItems === 0 ? 0 : Math.round((packedItems / totalItems) * 100),
    };
  });

  const aiSuggestionCount = packingList.aiSuggestions?.filter(
    (s) => !s.addedToList && !s.dismissed
  ).length || 0;

  return (
    <Card className="p-6 border-teal-200 dark:border-teal-800">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Packing Checklist
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress.packed}/{progress.total} items packed
              </p>
            </div>
          </div>

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
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                progress.percentage === 100 ? 'bg-green-500' : 'bg-teal-500'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Section Summary */}
        <div className="grid grid-cols-5 gap-2">
          {sectionProgress.map((section) => (
            <div
              key={section.id}
              className="flex flex-col items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <span className="text-xl mb-1">{section.emoji}</span>
              <div className="text-xs font-medium text-center">
                {section.packed === section.total ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">
                    {section.packed}/{section.total}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI Suggestions Badge */}
        {aiSuggestionCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {aiSuggestionCount} AI suggestion{aiSuggestionCount !== 1 ? 's' : ''} available
            </p>
          </div>
        )}

        {/* Destination Insights */}
        {packingList.destinationInsights && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">{packingList.destinationInsights.weather}</p>
              {packingList.destinationInsights.culturalNotes && (
                <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                  {packingList.destinationInsights.culturalNotes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onOpenModal}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            <Package className="w-4 h-4 mr-2" />
            Open Packing List
          </Button>
          <Button
            onClick={handleRegeneratePackingList}
            disabled={isRegenerating}
            variant="outline"
            className="border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            title="Regenerate packing list with AI based on updated trip details"
          >
            {isRegenerating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* AI Generated Badge */}
        {packingList.generatedWithAI && packingList.lastAiGeneratedAt && (
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>
              AI-generated {new Date(packingList.lastAiGeneratedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
