"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useThoughts } from "@/store/useThoughts";
import { useMoods } from "@/store/useMoods";
import { useFriends } from "@/store/useFriends";
import { ToolHeader, ToolPageLayout, ToolGroupNav } from "@/components/tools";
import { toolThemes } from "@/components/tools/themes";
import { Brain, Smile, Users, Heart, Sparkles, ArrowRight, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function InnerLifePage() {
  const { user } = useAuth();
  const thoughts = useThoughts((s) => s.thoughts);
  const moods = useMoods((s) => s.moods);
  const friends = useFriends((s) => s.friends);

  const { subscribe: subscribeThoughts } = useThoughts();
  const { subscribe: subscribeMoods } = useMoods();
  const { subscribe: subscribeFriends } = useFriends();

  useEffect(() => {
    if (user?.uid) {
      subscribeThoughts(user.uid);
      subscribeMoods(user.uid);
      subscribeFriends(user.uid);
    }
  }, [user?.uid, subscribeThoughts, subscribeMoods, subscribeFriends]);

  const stats = useMemo(() => {
    const unprocessedThoughts = thoughts.filter((t) => !t.tags?.includes('processed')).length;
    const recentMoods = moods.filter((m) => {
      const moodDate = new Date(m.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return moodDate >= weekAgo;
    });
    const averageMood = recentMoods.length > 0
      ? (recentMoods.reduce((sum, m) => sum + m.value, 0) / recentMoods.length).toFixed(1)
      : "N/A";
    const thoughtsWithCBT = thoughts.filter((t) => t.cbtAnalysis).length;

    return { unprocessedThoughts, averageMood, thoughtsWithCBT, friendsCount: friends.length };
  }, [thoughts, moods, friends]);

  const recentThoughts = useMemo(() => {
    return thoughts
      .filter((t) => !t.tags?.includes('processed'))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);
  }, [thoughts]);

  const moodTrend = useMemo(() => {
    const last7Days = moods
      .filter((m) => {
        const moodDate = new Date(m.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return moodDate >= weekAgo;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (last7Days.length < 2) return "stable";

    const first = last7Days[0].value;
    const last = last7Days[last7Days.length - 1].value;
    const diff = last - first;

    if (diff > 1) return "improving";
    if (diff < -1) return "declining";
    return "stable";
  }, [moods]);

  const theme = toolThemes.purple;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Inner Life"
        emoji="🧠"
        showBackButton
        stats={[
          { label: "thoughts", value: thoughts.length, variant: "info" },
          { label: "avg mood", value: stats.averageMood, variant: "success" },
          { label: "relationships", value: stats.friendsCount, variant: "default" },
        ]}
        theme={theme}
      />

      <ToolGroupNav currentToolId="thoughts" />

      {/* Mood This Week */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Smile className="h-5 w-5 text-yellow-500" />
          Mood This Week
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.averageMood}
              <span className="text-2xl text-gray-500">/10</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {moodTrend === "improving" && (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">Improving</span>
                </>
              )}
              {moodTrend === "declining" && (
                <>
                  <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
                  <span className="text-sm text-red-600 dark:text-red-400">Needs attention</span>
                </>
              )}
              {moodTrend === "stable" && (
                <span className="text-sm text-gray-600 dark:text-gray-400">Stable</span>
              )}
            </div>
          </div>
          <Link
            href="/tools/moodtracker"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:shadow-lg transition-all"
          >
            Log Mood
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Thoughts */}
        <Link href="/tools/thoughts" className="card p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Thoughts
            </h3>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          {stats.unprocessedThoughts > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                  {stats.unprocessedThoughts} unprocessed
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You have thoughts waiting to be processed
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All thoughts processed. Capture new ones as they come!
            </p>
          )}
        </Link>

        {/* Relationships */}
        <Link href="/tools/relationships" className="card p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-500" />
              Relationships
            </h3>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{stats.friendsCount}</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            People in your network
          </p>
        </Link>
      </div>

      {/* CBT Insights */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            CBT Processing
          </h3>
          <Link href="/tools/cbt" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
            View All →
          </Link>
        </div>
        {stats.thoughtsWithCBT > 0 ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              You&apos;ve processed {stats.thoughtsWithCBT} thought{stats.thoughtsWithCBT !== 1 ? "s" : ""} with CBT analysis
            </p>
            <Link
              href="/tools/cbt"
              className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              Work through a negative thought
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              CBT can help you identify and reframe negative thinking patterns
            </p>
            <Link
              href="/tools/cbt"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:shadow-lg transition-all"
            >
              Start CBT Session
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Deep Reflections */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-500" />
            Deep Reflections
          </h3>
          <Link href="/tools/deepreflect" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
            View All →
          </Link>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Explore philosophical questions and personal meaning
        </p>
        <Link
          href="/tools/deepreflect"
          className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
        >
          Start a reflection
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Recent Unprocessed Thoughts */}
      {recentThoughts.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">💭 Thoughts to Process</h3>
            <Link href="/tools/thoughts" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentThoughts.map((thought) => (
              <Link
                key={thought.id}
                href={`/tools/thoughts?id=${thought.id}`}
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <p className="text-sm text-gray-900 dark:text-white mb-2">{thought.text}</p>
                <div className="text-xs text-gray-500">
                  {new Date(thought.createdAt).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
