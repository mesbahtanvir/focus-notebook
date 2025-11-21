/**
 * InteractivePackingMode - Fun, gamified one-at-a-time packing experience
 * Shows items one at a time with animations and three-state actions
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, Clock, XCircle, Sparkles } from 'lucide-react';
import type { PackingItem, PackingSectionId, PackingList, PackingItemStatus } from '@/types/packing-list';

interface InteractivePackingModeProps {
  packingList: PackingList;
  onSetItemStatus: (itemId: string, status: PackingItemStatus) => Promise<void>;
  onClose: () => void;
}

export function InteractivePackingMode({
  packingList,
  onSetItemStatus,
  onClose,
}: InteractivePackingModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Get all items that need attention (unpacked or later)
  const allItems = packingList.sections.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        sectionId: section.id,
        sectionTitle: section.title,
        sectionEmoji: section.emoji,
      }))
    )
  );

  // Filter items that need attention
  const itemsToReview = allItems.filter((item) => {
    const status = packingList.itemStatuses?.[item.id] || 'unpacked';
    return status === 'unpacked' || status === 'later';
  });

  const currentItem = itemsToReview[currentIndex];
  const progress = itemsToReview.length > 0 ? (completedCount / itemsToReview.length) * 100 : 100;
  const isComplete = currentIndex >= itemsToReview.length;

  // Celebration effect when complete
  useEffect(() => {
    if (isComplete && completedCount > 0) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ['#10b981', '#14b8a6', '#22c55e', '#84cc16'];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isComplete, completedCount]);

  const handleAction = async (status: PackingItemStatus) => {
    if (!currentItem || isAnimating) return;

    setIsAnimating(true);

    try {
      await onSetItemStatus(currentItem.id, status);

      // Small celebration for packed items
      if (status === 'packed') {
        confetti({
          particleCount: 20,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#14b8a6', '#22c55e'],
        });
      }

      setCompletedCount((prev) => prev + 1);

      // Move to next item after a short delay
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsAnimating(false);
      }, 300);
    } catch (error) {
      console.error('Error setting item status:', error);
      setIsAnimating(false);
    }
  };

  // If no items to review
  if (itemsToReview.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
        >
          <div className="mb-6">
            <Sparkles className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
            <p className="text-gray-600 dark:text-gray-400">
              You&apos;ve reviewed all your packing items. Great job!
            </p>
          </div>
          <Button onClick={onClose} className="w-full bg-teal-600 hover:bg-teal-700">
            Close
          </Button>
        </motion.div>
      </div>
    );
  }

  // Complete state
  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
        >
          <div className="mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
            >
              <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-2">🎉 All Done!</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              You&apos;ve reviewed {completedCount} item{completedCount !== 1 ? 's' : ''}!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Keep packing and have a great trip! ✈️
            </p>
          </div>
          <Button onClick={onClose} className="w-full bg-teal-600 hover:bg-teal-700 text-lg py-6">
            Finish
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-teal-500/20 via-purple-500/20 to-blue-500/20 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2 text-white">
            <span className="text-sm font-medium">
              {currentIndex + 1} of {itemsToReview.length}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-500 to-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Item Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateY: 90 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Section Badge */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-4 text-white">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">{currentItem.sectionEmoji}</span>
                <Badge className="bg-white/20 text-white border-white/30">
                  {currentItem.sectionTitle}
                </Badge>
              </div>
            </div>

            {/* Item Content */}
            <div className="p-8 sm:p-12 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  {currentItem.name}
                </h2>

                {currentItem.quantity && (
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    Quantity: {currentItem.quantity}
                  </p>
                )}

                {currentItem.description && (
                  <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
                    {currentItem.description}
                  </p>
                )}

                {currentItem.tip && (
                  <div className="bg-teal-50 dark:bg-teal-950/30 rounded-xl p-4 mb-6">
                    <p className="text-sm text-teal-800 dark:text-teal-300">
                      💡 <strong>Tip:</strong> {currentItem.tip}
                    </p>
                  </div>
                )}

                {/* Check if item was marked as "later" before */}
                {packingList.itemStatuses?.[currentItem.id] === 'later' && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 mb-6">
                    <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      You marked this as &quot;later&quot; before
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 sm:p-8 pt-0 space-y-3">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  onClick={() => handleAction('packed')}
                  disabled={isAnimating}
                  className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Packed ✓
                </Button>
              </motion.div>

              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={() => handleAction('later')}
                    disabled={isAnimating}
                    variant="outline"
                    className="w-full h-14 text-base font-medium border-2 border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    Later
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={() => handleAction('no-need')}
                    disabled={isAnimating}
                    variant="outline"
                    className="w-full h-14 text-base font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    No Need
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Skip Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center"
        >
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-sm font-medium transition"
          >
            Exit Quick Pack Mode
          </button>
        </motion.div>
      </div>
    </div>
  );
}
