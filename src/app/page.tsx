"use client";

import { useTasks } from "@/store/useTasks";
import { useThoughts } from "@/store/useThoughts";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import TaskList from "@/components/TaskList";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";

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

      <section className="card p-4 space-y-4">
        <h2 className="text-xl font-semibold">What&apos;s on your mind?</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
          <input
            aria-label="Thought"
            className="input flex-1"
            placeholder="What's on your mind?"
            {...register('text', { required: true })}
          />
          <button className="btn-primary" type="submit">Add</button>
        </form>
      </section>

      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Thoughts</h2>
          {thoughts.length > 3 && (
            <button
              className="text-sm underline text-muted-foreground hover:text-foreground"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Show less' : 'Show all'}
            </button>
          )}
        </div>
        <ul className="space-y-2">
          {(showAll ? thoughts : recentThoughts).length === 0 && (
            <li className="text-muted-foreground">No thoughts yet</li>
          )}
          {(showAll ? thoughts : recentThoughts).map((t) => (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <input
                id={`task-${t.id}`}
                type="checkbox"
                checked={t.done}
                onChange={() => toggleThought(t.id)}
              />
              <label htmlFor={`task-${t.id}`} className={t.done ? "line-through text-muted-foreground" : ""}>
                {t.text}
              </label>
              <button
                className="ml-auto text-xs underline text-red-600 hover:text-red-700"
                onClick={() => deleteThought(t.id)}
                aria-label={`Delete ${t.text}`}
              >
                Delete
              </button>
            </motion.li>
          ))}
        </ul>
      </section>
    </div>
  );
}
