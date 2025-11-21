/**
 * InteractivePackingMode - Fun, gamified one-at-a-time packing experience
 * Shows items one at a time with animations, swipe gestures, and three-state actions
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, Clock, XCircle, Sparkles, Keyboard, RotateCcw } from 'lucide-react';
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
  const [isMounted, setIsMounted] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'down' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Mount the portal only on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Motion values for swipe gestures
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const swipeRightOpacity = useTransform(x, [0, 100], [0, 0.9]);
  const swipeLeftOpacity = useTransform(x, [-100, 0], [0.9, 0]);
  const swipeDownOpacity = useTransform(y, [0, 100], [0, 0.9]);

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

  // Build initial queue of items to review
  const initialQueueRef = useRef<typeof allItems | null>(null);

  if (initialQueueRef.current === null) {
    initialQueueRef.current = allItems.filter((item) => {
      const status = packingList.itemStatuses?.[item.id] || 'unpacked';
      return status === 'unpacked' || status === 'later';
    });
  }

  // Queue of items to process (items marked "later" get added back to the end)
  const [itemQueue, setItemQueue] = useState<typeof allItems>(initialQueueRef.current);
  const [completedCount, setCompletedCount] = useState(0);
  const totalItemsToProcess = initialQueueRef.current.length; // Fixed: only calculated once

  const currentItem = itemQueue[0]; // Always process first item in queue
  const progress = totalItemsToProcess > 0 ? (completedCount / totalItemsToProcess) * 100 : 100;
  const isComplete = itemQueue.length === 0;

  // Count "later" items currently in queue
  const laterItemsCount = itemQueue.filter(
    (item) => packingList.itemStatuses?.[item.id] === 'later'
  ).length;
  const isLaterItem = currentItem && packingList.itemStatuses?.[currentItem.id] === 'later';

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

      // Move to next item after a short delay
      setTimeout(() => {
        if (status === 'later') {
          // Re-queue: move item to end of queue for later review
          setItemQueue((prevQueue) => {
            const [current, ...rest] = prevQueue;
            return [...rest, current];
          });
        } else {
          // Completed (packed or no-need): remove from queue
          setItemQueue((prevQueue) => {
            const newQueue = prevQueue.slice(1);
            return newQueue;
          });
          setCompletedCount((prev) => prev + 1);
        }

        setIsAnimating(false);
        setSwipeDirection(null);
        x.set(0);
        y.set(0);
      }, 300);
    } catch (error) {
      console.error('[Quick Pack] Error setting item status:', error);
      setIsAnimating(false);
      setSwipeDirection(null);
      x.set(0);
      y.set(0);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isAnimating || !currentItem) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          handleAction('packed');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleAction('later');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleAction('no-need');
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, currentItem?.id]);

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

  // Handle swipe gesture
  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const { offset, velocity } = info;

    // Swipe down = Pack Later
    if (offset.y > threshold || velocity.y > 500) {
      setSwipeDirection('down');
      handleAction('later');
    }
    // Swipe right = Packed
    else if (offset.x > threshold || velocity.x > 500) {
      setSwipeDirection('right');
      handleAction('packed');
    }
    // Swipe left = No Need
    else if (offset.x < -threshold || velocity.x < -500) {
      setSwipeDirection('left');
      handleAction('no-need');
    }
    // Not enough swipe, return to center
    else {
      x.set(0);
      y.set(0);
    }
  };

  // If no items to review at start
  if (initialQueueRef.current.length === 0) {
    const content = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
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

    return isMounted ? createPortal(content, document.body) : null;
  }

  // Complete state
  if (isComplete) {
    const content = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
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

    return isMounted ? createPortal(content, document.body) : null;
  }

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-purple-500/20 to-blue-500/20 backdrop-blur-md"
      />

      {/* Content */}
      <div className="relative w-full max-w-2xl">
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2 text-white">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {completedCount} done • {itemQueue.length} left
              </span>
              {laterItemsCount > 0 && (
                <Badge className="bg-amber-500/90 text-white border-0 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  {laterItemsCount} deferred
                </Badge>
              )}
            </div>
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
            style={{ x, y, rotate, opacity }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{
              scale: 0.8,
              opacity: 0,
              x: swipeDirection === 'right' ? 300 : swipeDirection === 'left' ? -300 : 0,
              y: swipeDirection === 'down' ? 300 : 0
            }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing relative"
          >
            {/* Swipe Indicators */}
            <motion.div
              className="absolute inset-0 bg-green-500 flex items-center justify-start px-8 pointer-events-none z-10"
              style={{
                opacity: swipeRightOpacity,
              }}
            >
              <CheckCircle className="w-16 h-16 text-white" />
            </motion.div>
            <motion.div
              className="absolute inset-0 bg-gray-500 flex items-center justify-end px-8 pointer-events-none z-10"
              style={{
                opacity: swipeLeftOpacity,
              }}
            >
              <XCircle className="w-16 h-16 text-white" />
            </motion.div>
            <motion.div
              className="absolute inset-0 bg-amber-500 flex items-end justify-center pb-8 pointer-events-none z-10"
              style={{
                opacity: swipeDownOpacity,
              }}
            >
              <Clock className="w-16 h-16 text-white" />
            </motion.div>

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
                {isLaterItem && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 mb-6 border-2 border-amber-300 dark:border-amber-700"
                  >
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2">
                      <RotateCcw className="w-5 h-5 animate-pulse" />
                      Revisiting this item - Ready to decide now?
                    </p>
                  </motion.div>
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

        {/* Swipe Hint - Show at start of session */}
        {completedCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="mt-4 text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm">
              <motion.span
                animate={{ x: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 1 }}
              >
                👆
              </motion.span>
              <span>Drag the card or use buttons</span>
            </div>
          </motion.div>
        )}

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

  return isMounted ? createPortal(content, document.body) : null;
}
