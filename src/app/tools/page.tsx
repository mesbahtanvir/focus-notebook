"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Brain, Target, Smile, CheckSquare, MessageCircle, ArrowRight, Sparkles } from "lucide-react";

const TOOLS = [
  {
    key: "brainstorming",
    title: "Brainstorming",
    description: "Generate ideas quickly and capture them.",
    icon: Lightbulb,
    emoji: "💡",
    gradient: "from-yellow-400 to-orange-500",
    bgGradient: "from-yellow-50 to-orange-50",
    borderColor: "border-yellow-300",
  },
  {
    key: "cbt",
    title: "CBT",
    description: "Cognitive Behavioral Therapy worksheets and prompts.",
    icon: Brain,
    emoji: "🧠",
    gradient: "from-purple-400 to-pink-500",
    bgGradient: "from-purple-50 to-pink-50",
    borderColor: "border-purple-300",
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
  },
  {
    key: "moodtracker",
    title: "Mood Tracker",
    description: "Track your mood (1–10) with optional notes and history.",
    icon: Smile,
    emoji: "😊",
    gradient: "from-pink-400 to-rose-500",
    bgGradient: "from-pink-50 to-rose-50",
    borderColor: "border-pink-300",
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
  },
];

export default function ToolsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
            <Sparkles className="h-12 w-12 text-purple-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
          🛠️ Your Toolkit
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Explore tools to help you think, plan, and grow.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
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

      {/* Info Card */}
      <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50">
        <CardContent className="p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800">
                🚀 Pro Tip
              </h3>
              <p className="text-gray-600 mt-1">
                Each tool is designed to work together. Try combining Mood Tracker with CBT for deeper insights into your emotional patterns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
