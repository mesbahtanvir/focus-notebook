"use client";

import { useTasks } from "@/store/useTasks";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import TaskList from "@/components/TaskList";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Sparkles, Lock, MessageSquare, Lightbulb, Trash2, Timer, Play, Coffee, ShoppingBag, MapPin } from "lucide-react";
import { ThoughtDetailModal } from "@/components/ThoughtDetailModal";

// Disable static generation for now
export const dynamic = 'force-dynamic';

type FormValues = { text: string };

export default function Page() {
  const { user } = useAuth();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  // Thoughts store
  const thoughts = useThoughts((s) => s.thoughts);
  const addThought = useThoughts((s) => s.add);
  const deleteThought = useThoughts((s) => s.deleteThought);
  // Tasks store (for New Task button only; TaskList handles its own reads)
  const tasks = useTasks((s) => s.tasks);
  const addTask = useTasks((s) => s.add);
  const [showAll, setShowAll] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  
  // Get errands count (non-focus-eligible tasks)
  const activeErrands = useMemo(() => 
    tasks.filter(t => !t.done && t.status === 'active' && t.focusEligible === false),
    [tasks]
  );

  const recentThoughts = useMemo(() => {
    const sorted = [...thoughts];
    // If tasks have createdAt, sort by it desc; otherwise rely on insertion order
    sorted.sort((a: any, b: any) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
    return sorted.slice(0, 3);
  }, [thoughts]);

  const onSubmit = async (data: FormValues) => {
    if (!data.text?.trim()) return;
    await addThought({
      text: data.text.trim(),
      type: 'neutral',
      createdAt: new Date().toISOString(),
    });
    reset();
  };


  return (
    <div className="space-y-4">
      {/* Minimal Login Prompt */}
      {!user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800"
        >
          <span className="text-sm text-gray-600 dark:text-gray-400">Not syncing</span>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Sign In
          </Link>
        </motion.div>
      )}

      <section className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
            <input
              aria-label="Thought"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 outline-none transition-all bg-white dark:bg-gray-800 text-sm"
              placeholder="What's on your mind?"
              {...register('text', { required: true })}
            />
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors" 
              type="submit"
            >
              Add
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Thoughts</h2>
          {thoughts.length > 3 && (
            <button
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Less' : 'All'}
            </button>
          )}
        </div>
        <div className="p-4">
          <ul className="space-y-2">
            {(showAll ? thoughts : recentThoughts).length === 0 && (
              <li className="text-center py-8 text-sm text-gray-400">
                No thoughts yet
              </li>
            )}
            {(showAll ? thoughts : recentThoughts).map((t) => (
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
      <section className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Focus</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/tools/focus?duration=25"
              className="flex flex-col items-center gap-1 px-3 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 border border-green-200 dark:border-green-800 transition-colors"
            >
              <span className="text-lg font-bold text-green-600 dark:text-green-400">25m</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Pomodoro</span>
            </Link>
            <Link
              href="/tools/focus?duration=50"
              className="flex flex-col items-center gap-1 px-3 py-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-800 transition-colors"
            >
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">50m</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Deep Work</span>
            </Link>
            <Link
              href="/tools/focus?duration=5"
              className="flex flex-col items-center gap-1 px-3 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 border border-amber-200 dark:border-amber-800 transition-colors"
            >
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">5m</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Break</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Errands Preview Section */}
      <section className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Errands & Out-of-Office
          </h2>
          <Link
            href="/tools/errands"
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            View All
          </Link>
        </div>
        <div className="p-4">
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
