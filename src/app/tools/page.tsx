"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Brain, Target, Smile, CheckSquare, MessageCircle, ArrowRight, Sparkles, FileText, ShoppingBag, Users, Plane, Search, LineChart, DollarSign, MapPin, Calendar as CalendarIcon, TrendingUp } from "lucide-react";

const TOOLS = [
  {
    key: "cbt",
    title: "CBT",
    description: "Cognitive Behavioral Therapy worksheets and prompts.",
    icon: Brain,
    emoji: "🧠",
    gradient: "from-purple-400 to-pink-500",
    bgGradient: "from-purple-50 to-pink-50",
    borderColor: "border-purple-300",
    priority: "high" as const,
  },
  {
    key: "focus",
    title: "Focus",
    description: "Deep work sessions with balanced task selection and timer.",
    icon: Target,
    emoji: "🎯",
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-300",
    priority: "high" as const,
  },
  {
    key: "moodtracker",
    title: "Mood",
    description: "Track your mood (1–10) with optional notes and history.",
    icon: Smile,
    emoji: "😊",
    gradient: "from-pink-400 to-rose-500",
    bgGradient: "from-pink-50 to-rose-50",
    borderColor: "border-pink-300",
    priority: "high" as const,
  },
  {
    key: "tasks",
    title: "Tasks",
    description: "Manage all the tasks",
    icon: CheckSquare,
    emoji: "✅",
    gradient: "from-green-400 to-emerald-500",
    bgGradient: "from-green-50 to-emerald-50",
    borderColor: "border-green-300",
    priority: "high" as const,
  },
  {
    key: "goals",
    title: "Goals",
    description: "Define and achieve your long-term objectives with clear action plans.",
    icon: Target,
    emoji: "🎯",
    gradient: "from-purple-400 to-indigo-500",
    bgGradient: "from-purple-50 to-indigo-50",
    borderColor: "border-purple-300",
    priority: "high" as const,
  },
  {
    key: "projects",
    title: "Projects",
    description: "Organize work into projects connected to your goals with linked tasks.",
    icon: Target,
    emoji: "📊",
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-300",
    priority: "high" as const,
  },
  {
    key: "thoughts",
    title: "Thoughts",
    description: "Manage your thoughts with CBT analysis for difficult feelings.",
    icon: MessageCircle,
    emoji: "💭",
    gradient: "from-indigo-400 to-purple-500",
    bgGradient: "from-indigo-50 to-purple-50",
    borderColor: "border-indigo-300",
    priority: "high" as const,
  },
  {
    key: "notes",
    title: "Notes",
    description: "View all notes and documentation from your tasks.",
    icon: FileText,
    emoji: "📝",
    gradient: "from-violet-400 to-fuchsia-500",
    bgGradient: "from-violet-50 to-fuchsia-50",
    borderColor: "border-violet-300",
    priority: "medium" as const,
  },
  {
    key: "errands",
    title: "Errands",
    description: "Out-of-office tasks like shopping, appointments, and errands.",
    icon: ShoppingBag,
    emoji: "🛍️",
    gradient: "from-orange-400 to-amber-500",
    bgGradient: "from-orange-50 to-amber-50",
    borderColor: "border-orange-300",
    priority: "low" as const,
  },
  {
    key: "deepreflect",
    title: "Deep Reflection",
    description: "Profound reflections and philosophical explorations for deeper understanding.",
    icon: Brain,
    emoji: "🤔",
    gradient: "from-teal-400 to-cyan-500",
    bgGradient: "from-teal-50 to-cyan-50",
    borderColor: "border-teal-300",
    priority: "low" as const,
  },
  {
    key: "friends",
    title: "Relationships",
    description: "Reflect on your connections to prioritize aligned relationships and personal growth.",
    icon: Users,
    emoji: "🤝",
    gradient: "from-pink-400 to-rose-500",
    bgGradient: "from-pink-50 to-rose-50",
    borderColor: "border-pink-300",
    priority: "medium" as const,
  },
  {
    key: "investments",
    title: "Investment Tracker",
    description: "Track your investment portfolios, monitor growth, and manage contributions.",
    icon: LineChart,
    emoji: "💰",
    gradient: "from-amber-400 to-yellow-500",
    bgGradient: "from-amber-50 to-yellow-50",
    borderColor: "border-amber-300",
    priority: "high" as const,
  },
  {
    key: "packing-list",
    title: "Packing List Planner",
    description: "Choose your trip length, generate a smart checklist, and track packing + timeline progress.",
    icon: Plane,
    emoji: "🧭",
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-300",
    priority: "high" as const,
  },
  {
    key: "trips",
    title: "Trip & Expense Tracker",
    description: "Plan trips, track expenses, and stay within budget while traveling.",
    icon: Target,
    emoji: "✈️",
    gradient: "from-teal-400 to-cyan-500",
    bgGradient: "from-teal-50 to-cyan-50",
    borderColor: "border-teal-300",
    priority: "high" as const,
  },
  {
    key: "travel/visa-finder",
    title: "Visa Destination Finder",
    description: "Discover where you can travel visa-free or with easy visa access based on nationality.",
    icon: Plane,
    emoji: "🌍",
    gradient: "from-teal-400 to-cyan-500",
    bgGradient: "from-teal-50 to-cyan-50",
    borderColor: "border-teal-300",
    priority: "medium" as const,
  },
  {
    key: "subscriptions",
    title: "Subscriptions",
    description: "Track recurring expenses, renewals, and subscription services.",
    icon: Target,
    emoji: "🔄",
    gradient: "from-indigo-400 to-purple-500",
    bgGradient: "from-indigo-50 to-purple-50",
    borderColor: "border-indigo-300",
    priority: "medium" as const,
  },
  {
    key: "asset-horizon",
    title: "Asset Horizon",
    description: "Visualize portfolio glide paths and model long-term financial scenarios.",
    icon: LineChart,
    emoji: "📈",
    gradient: "from-sky-400 to-blue-500",
    bgGradient: "from-sky-50 to-blue-50",
    borderColor: "border-sky-300",
    priority: "low" as const,
  },
  {
    key: "spending",
    title: "Spending Tracker",
    description: "Track expenses and analyze spending patterns with AI-powered insights.",
    icon: DollarSign,
    emoji: "💸",
    gradient: "from-green-400 to-emerald-500",
    bgGradient: "from-green-50 to-emerald-50",
    borderColor: "border-green-300",
    priority: "high" as const,
  },
  {
    key: "admired-people",
    title: "People I Admire",
    description: "Track inspiring people and learn from their perspectives on life.",
    icon: Sparkles,
    emoji: "✨",
    gradient: "from-purple-400 to-indigo-500",
    bgGradient: "from-purple-50 to-indigo-50",
    borderColor: "border-purple-300",
    priority: "medium" as const,
  },
  {
    key: "places",
    title: "Places",
    description: "Track and compare places to live, visit, or stay short-term.",
    icon: MapPin,
    emoji: "🗺️",
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-300",
    priority: "medium" as const,
  },
  {
    key: "calendar",
    title: "Calendar",
    description: "Smart calendar with AI-powered event creation from your thoughts.",
    icon: CalendarIcon,
    emoji: "📅",
    gradient: "from-indigo-400 to-purple-500",
    bgGradient: "from-indigo-50 to-purple-50",
    borderColor: "border-indigo-300",
    priority: "high" as const,
  },
  {
    key: "meditation",
    title: "Meditation",
    description: "Guided meditation sessions with breathing exercises and calming music.",
    icon: Brain,
    emoji: "🧘‍♀️",
    gradient: "from-blue-400 to-purple-500",
    bgGradient: "from-blue-50 to-purple-50",
    borderColor: "border-blue-300",
    priority: "medium" as const,
  },
  {
    key: "body-progress",
    title: "Body Progress Tracker",
    description: "Track body composition changes with Dexa scan analysis and visualize progress over time.",
    icon: TrendingUp,
    emoji: "💪",
    gradient: "from-orange-400 to-red-500",
    bgGradient: "from-orange-50 to-red-50",
    borderColor: "border-orange-300",
    priority: "medium" as const,
  },
];

type ToolPriority = 'high' | 'medium' | 'low';

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = useMemo(() => {
    // Apply search filter to all tools
    return TOOLS.filter(tool =>
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const headingLabel = searchQuery
    ? `Search Results (${filteredTools.length})`
    : `All Tools (${filteredTools.length})`;

  return (
    <div className="container mx-auto py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6 px-4 md:px-6 lg:px-8">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="flex justify-center items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
            <Sparkles className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              🛠️ Your Toolkit
            </h1>
            <p className="text-gray-600 text-sm">
              Explore tools to help you think, plan, and grow.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tools by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
          />
        </div>
      </div>

      {/* All Tools Grid */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          {headingLabel}
        </h2>
        {filteredTools.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-2xl bg-white dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No tools found matching your search.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.key}
                  href={`/tools/${tool.key}`}
                  className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${tool.bgGradient} border-2 ${tool.borderColor} p-4 transition-all duration-300 hover:shadow-xl hover:scale-105`}
                >
                  {/* Icon Circle */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 bg-gradient-to-r ${tool.gradient} rounded-lg shadow-md group-hover:shadow-lg transition-all group-hover:scale-110`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  <span className="text-2xl group-hover:scale-125 transition-transform">
                    {tool.emoji}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-gray-900">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity rounded-xl`} />
                </Link>
            );
          })}
          </div>
        )}
      </div>

      {/* No Results */}
      {searchQuery && filteredTools.length === 0 && (
        <div className="text-center py-16">
          <Search className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No tools found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            Try searching with different keywords
          </p>
        </div>
      )}

      {/* Info Card */}
      <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50">
        <CardContent className="p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-800">
                Keep your AI transparent
              </h3>
              <p className="text-gray-600">
                Review the exact prompts and responses sent to the LLM for complete transparency.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
