"use client";

import { useTasks } from "@/store/useTasks";
import { useThoughts, Thought } from "@/store/useThoughts";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import TaskList from "@/components/TaskList";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Sparkles, Lock, MessageSquare, Lightbulb, Trash2, CheckCircle } from "lucide-react";
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
  const toggleThought = useThoughts((s) => s.toggle);
  const deleteThought = useThoughts((s) => s.deleteThought);
  // Tasks store (for New Task button only; TaskList handles its own reads)
  const addTask = useTasks((s) => s.add);
  const [showAll, setShowAll] = useState(false);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);

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

  const createNewTask = async () => {
    const title = window.prompt('New task title?')?.trim();
    if (!title) return;
    const categoryInput = window.prompt("Category? (mastery/pleasure)")?.trim().toLowerCase();
    const category = categoryInput === 'pleasure' ? 'pleasure' : 'mastery';
    await addTask({
      title,
      category,
      priority: 'medium',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner for Non-Logged-In Users */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 p-1 shadow-2xl"
        >
          <div className="bg-white rounded-xl p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                <Sparkles className="h-12 w-12 text-purple-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              Welcome to Focus Notebook! ✨
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Your personal productivity companion. Track thoughts, manage tasks, and achieve your goals with a beautiful, intuitive interface.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link
                href="/login"
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Lock className="h-5 w-5" />
                Sign In to Get Started
              </Link>
            </div>
            <p className="text-sm text-gray-500 pt-2">
              🔐 Secure • ☁️ Cloud Sync • 📱 Multi-Device
            </p>
          </div>
        </motion.div>
      )}

      <section className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 px-6 py-4 border-b-4 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-md">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              💭 What&apos;s on your mind?
            </h2>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
            <input
              aria-label="Thought"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white"
              placeholder="Share your thoughts..."
              {...register('text', { required: true })}
            />
            <button 
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:scale-105" 
              type="submit"
            >
              ✨ Add
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-4 border-blue-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 px-6 py-4 border-b-4 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                💡 Your Thoughts
              </h2>
            </div>
            {thoughts.length > 3 && (
              <button
                className="px-4 py-2 rounded-full text-sm font-semibold bg-white/50 hover:bg-white transition-all text-blue-700 hover:scale-105"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? '📖 Show less' : '📚 Show all'}
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          <ul className="space-y-3">
            {(showAll ? thoughts : recentThoughts).length === 0 && (
              <li className="text-center py-8 text-gray-500">
                <Lightbulb className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No thoughts yet. Start sharing what&apos;s on your mind! 💭</p>
              </li>
            )}
            {(showAll ? thoughts : recentThoughts).map((t) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-4 rounded-xl bg-white border-2 transition-all hover:shadow-md cursor-pointer ${
                  t.done ? 'border-green-200 bg-green-50' : 'border-blue-200'
                }`}
              >
                <input
                  id={`thought-${t.id}`}
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleThought(t.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded border-2 border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                />
                <div 
                  onClick={() => setSelectedThought(t)}
                  className={`flex-1 ${
                    t.done ? 'line-through text-gray-400' : 'text-gray-800 font-medium'
                  }`}
                >
                  {t.done && <CheckCircle className="inline h-4 w-4 mr-2 text-green-500" />}
                  {t.text}
                </div>
                <button
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all transform hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThought(t.id);
                  }}
                  aria-label={`Delete ${t.text}`}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </ul>
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
