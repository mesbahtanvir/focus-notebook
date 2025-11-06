"use client";

import { useTasks } from "@/store/useTasks";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import TaskList from "@/components/TaskList";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Sparkles, Lock, MessageSquare, Lightbulb, Trash2, Timer, Play, Coffee, ShoppingBag, MapPin, Brain, Rocket, Heart, Zap } from "lucide-react";
import { ThoughtDetailModal } from "@/components/ThoughtDetailModal";
import { MostUsedTools } from "@/components/MostUsedTools";
import { useTrips } from "@/store/useTrips";

// Disable static generation for now
export const dynamic = 'force-dynamic';

type FormValues = { text: string };

export default function Page() {
  const { user, isAnonymous } = useAuth();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  // Thoughts store
  const thoughts = useThoughts((s) => s.thoughts);
  const thoughtsLoading = useThoughts((s) => s.isLoading);
  const addThought = useThoughts((s) => s.add);
  const deleteThought = useThoughts((s) => s.deleteThought);
  // Tasks store (for New Task button only; TaskList handles its own reads)
  const tasks = useTasks((s) => s.tasks);
  const tasksLoading = useTasks((s) => s.isLoading);
  const addTask = useTasks((s) => s.add);
  const [showAll, setShowAll] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const trips = useTrips((s) => s.trips);
  const subscribeTrips = useTrips((s) => s.subscribe);
  const getTripTotalSpent = useTrips((s) => s.getTotalSpent);
  const getTripRemaining = useTrips((s) => s.getBudgetRemaining);

  // Global loading state - show if either is loading from network (not cache)
  const thoughtsFromCache = useThoughts((s) => s.fromCache);
  const tasksFromCache = useTasks((s) => s.fromCache);
  const thoughtsSyncError = useThoughts((s) => s.syncError);
  const tasksSyncError = useTasks((s) => s.syncError);
  const thoughtsSubscribed = useThoughts((s) => s.isSubscribed);
  const tasksSubscribed = useTasks((s) => s.isSubscribed);

  // Only show loading if subscriptions are active and still loading (without cache data yet)
  const isInitialLoading = (thoughtsLoading && !thoughtsFromCache) || (tasksLoading && !tasksFromCache);
  const hasSyncError = thoughtsSyncError || tasksSyncError;
  const subscriptionsActive = thoughtsSubscribed || tasksSubscribed;

  // Add timeout to prevent infinite loading state (max 15 seconds)
  // Only start timeout if subscriptions are active
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    if (isInitialLoading && subscriptionsActive) {
      const timer = setTimeout(() => {
        console.warn('[Page] Loading timeout triggered after 15 seconds');
        setLoadingTimeout(true);
      }, 15000); // Increased from 8 to 15 seconds
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isInitialLoading, subscriptionsActive]);
  
  // Get errands count (non-focus-eligible tasks)
  const activeErrands = useMemo(() => 
    tasks.filter(t => !t.done && t.status === 'active' && t.focusEligible === false),
    [tasks]
  );

  // Thoughts are already sorted by createdAt desc from Firestore query
  const recentThoughts = useMemo(() => {
    return showAll ? thoughts : thoughts.slice(0, 3);
  }, [thoughts, showAll]);


  const onSubmit = async (data: FormValues) => {
    if (!data.text?.trim()) return;
    await addThought({
      text: data.text.trim(),
    });
    reset();
  };

  useEffect(() => {
    if (user?.uid) {
      subscribeTrips(user.uid);
    }
  }, [user?.uid, subscribeTrips]);

  const liveTrips = useMemo(
    () => trips.filter((trip) => trip.status === 'in-progress'),
    [trips]
  );

  const liveTripPreview = liveTrips.slice(0, 2);

  const formatCurrency = (amount: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatTripDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });


  // Show loading indicator if initial load is in progress (with timeout protection)
  if (isInitialLoading && !loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading your workspace...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Syncing with cloud</p>
        </div>
      </div>
    );
  }

  // If loading timed out or has error, show the page anyway with a warning
  const showSyncWarning = (isInitialLoading && loadingTimeout) || hasSyncError;

  return (
    <div className="space-y-4">
      {/* Sync Warning - Show if loading timed out or has error */}
      {showSyncWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-2 border-red-200 dark:border-red-800"
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {hasSyncError ? 'Sync Error' : 'Sync taking longer than expected'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {hasSyncError
                  ? 'Unable to connect to Firebase. Check your internet connection and try refreshing the page.'
                  : 'Check your internet connection. Data may be loading from cache.'}
              </p>
            </div>
          </div>
          {hasSyncError && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md"
            >
              Retry
            </button>
          )}
        </motion.div>
      )}

      {/* Authentication Status */}
      {!user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sign up to sync across devices</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Your data stays local until you sign in</p>
            </div>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-md"
          >
            Sign Up
          </Link>
        </motion.div>
      )}
      
      {isAnonymous && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-300 dark:border-yellow-700"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Temporary Account Active</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Upgrade to keep your data forever</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 font-medium">
            Syncing
          </span>
        </motion.div>
      )}

      <section className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-4 border-purple-200 dark:border-purple-800 shadow-xl overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
            <input
              aria-label="Thought"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 outline-none transition-all bg-white dark:bg-gray-800 text-sm"
              placeholder="What's on your mind?"
              {...register('text', { required: true })}
            />
            <button 
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95" 
              type="submit"
            >
              Add
            </button>
          </form>
        </div>
      </section>

      {liveTripPreview.length > 0 && (
        <section className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border-4 border-teal-200 dark:border-teal-800 shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-teal-100 via-emerald-100 to-cyan-100 dark:from-teal-900 dark:via-emerald-900 dark:to-cyan-900 border-b-4 border-teal-200 dark:border-teal-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                ✈️ Live Trip
              </h2>
              <p className="text-xs text-teal-800 dark:text-teal-300">
                Quick access to trips currently in progress
              </p>
            </div>
            <Link
              href="/tools/trips"
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-md"
            >
              Manage Trips
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {liveTripPreview.map((trip) => {
              const spent = getTripTotalSpent(trip.id);
              const remainingBudget = getTripRemaining(trip.id);
              const usage = trip.budget > 0 ? (spent / trip.budget) * 100 : 0;

              return (
                <Link
                  href={`/tools/trips/${trip.id}`}
                  key={trip.id}
                  className="block rounded-xl border border-teal-200 dark:border-teal-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm px-5 py-4 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-300">
                        In Progress
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {trip.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{trip.destination}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Spent</p>
                      <p className="text-base font-bold text-teal-700 dark:text-teal-300">
                        {formatCurrency(spent, trip.currency)}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          remainingBudget < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        Remaining {formatCurrency(remainingBudget, trip.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                      <span>Budget usage</span>
                      <span className={usage > 100 ? 'text-red-600 font-medium' : ''}>
                        {Math.min(usage, 999).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-teal-100 dark:bg-teal-900/40 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${usage > 100 ? 'bg-red-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min(usage, 100)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}

            {liveTrips.length > liveTripPreview.length && (
              <Link
                href="/tools/trips"
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline"
              >
                View all {liveTrips.length} active trip{liveTrips.length > 1 ? 's' : ''} →
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-4 border-blue-200 dark:border-blue-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 border-b-4 border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">💭 Thoughts</h2>
          {thoughts.length > 3 && !showAll && (
            <button
              className="text-sm font-medium px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md"
              onClick={() => setShowAll(true)}
            >
              Show All
            </button>
          )}
          {showAll && (
            <button
              className="text-sm font-medium px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md"
              onClick={() => setShowAll(false)}
            >
              Show Less
            </button>
          )}
        </div>
        <div className="p-6">
          <ul className="space-y-2">
            {recentThoughts.length === 0 && (
              <li className="text-center py-8 text-sm text-gray-400">
                No thoughts yet
              </li>
            )}
            {recentThoughts.map((t) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSelectedThought(t)}
                className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
              >
                <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {t.text}
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThought(t.id);
                  }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.li>
            ))}
          </ul>

        </div>
      </section>

      {/* Quick Focus Section */}
      <section className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-4 border-green-200 dark:border-green-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900 border-b-4 border-green-200 dark:border-green-800">
          <h2 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">⚡ Quick Focus Modes</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/tools/focus?duration=60&mode=regular"
              className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 border-2 border-green-300 dark:border-green-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <Zap className="h-7 w-7 text-green-600 dark:text-green-400" />
              <span className="text-base font-bold text-green-600 dark:text-green-400">Regular</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">Balanced focus</span>
            </Link>
            <Link
              href="/tools/focus?duration=90&mode=philosopher&breaks=true"
              className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 border-2 border-purple-300 dark:border-purple-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 relative"
            >
              <div className="absolute top-2 right-2 flex gap-1">
                <span className="text-xs" title="Includes coffee break">☕</span>
                <span className="text-xs" title="Includes meditation">🧘</span>
              </div>
              <Brain className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              <span className="text-base font-bold text-purple-600 dark:text-purple-400">Philosopher</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">Deep thinking + breaks</span>
            </Link>
            <Link
              href="/tools/focus?duration=120&mode=beast&breaks=true"
              className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 border-2 border-red-300 dark:border-red-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 relative"
            >
              <div className="absolute top-2 right-2 flex gap-1">
                <span className="text-xs" title="Includes coffee break">☕</span>
                <span className="text-xs" title="Includes meditation">🧘</span>
              </div>
              <Rocket className="h-7 w-7 text-red-600 dark:text-red-400" />
              <span className="text-base font-bold text-red-600 dark:text-red-400">Beast Mode</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">Maximum output + breaks</span>
            </Link>
            <Link
              href="/tools/focus?duration=45&mode=selfcare"
              className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900 border-2 border-pink-300 dark:border-pink-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <Heart className="h-7 w-7 text-pink-600 dark:text-pink-400" />
              <span className="text-base font-bold text-pink-600 dark:text-pink-400">Self-Care</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">Wellness first</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Most Used Tools */}
      {user && <MostUsedTools />}

      {/* Errands Preview Section */}
      <section className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-4 border-orange-200 dark:border-orange-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100 dark:from-orange-900 dark:via-amber-900 dark:to-yellow-900 border-b-4 border-orange-200 dark:border-orange-800 flex items-center justify-between">
          <h2 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Errands & Out-of-Office
          </h2>
          <Link
            href="/tools/errands"
            className="text-sm font-medium px-3 py-1 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-md"
          >
            View All
          </Link>
        </div>
        <div className="p-6">
          {activeErrands.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <div className="text-3xl">✅</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No active errands
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                  <MapPin className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                    {activeErrands.length} to do
                  </span>
                </div>
              </div>
              {activeErrands.slice(0, 3).map((errand) => (
                <div
                  key={errand.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900"
                >
                  <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {errand.title}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      errand.priority === 'urgent'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        : errand.priority === 'high'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300'
                    }`}
                  >
                    {errand.priority}
                  </span>
                </div>
              ))}
              {activeErrands.length > 3 && (
                <Link
                  href="/tools/errands"
                  className="block text-center text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 py-2"
                >
                  +{activeErrands.length - 3} more
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Thought Detail Modal */}
      {selectedThought && (
        <ThoughtDetailModal
          thought={selectedThought}
          onClose={() => setSelectedThought(null)}
        />
      )}
    </div>
  );
}
