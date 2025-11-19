"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Calendar,
  BarChart3,
  Brain,
  CheckSquare,
  Compass,
  CreditCard,
  DollarSign,
  FolderKanban,
  Heart,
  Lightbulb,
  LineChart,
  MapPin,
  ShoppingCart,
  Smile,
  Sparkles,
  StickyNote,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { ToolName } from "@/store/useToolUsage";

type ToolVisual = {
  icon: LucideIcon;
  gradient: string;
  label: string;
};

export const toolVisuals: Record<ToolName, ToolVisual> = {
  tasks: { icon: CheckSquare, gradient: "from-blue-500 to-cyan-500", label: "Tasks" },
  thoughts: { icon: Brain, gradient: "from-purple-500 to-pink-500", label: "Thoughts" },
  "thoughts-swipe": { icon: Sparkles, gradient: "from-purple-600 to-pink-600", label: "Thought Swipe" },
  goals: { icon: Target, gradient: "from-green-500 to-emerald-500", label: "Goals" },
  projects: { icon: FolderKanban, gradient: "from-orange-500 to-amber-500", label: "Projects" },
  focus: { icon: Zap, gradient: "from-indigo-500 to-purple-500", label: "Focus" },
  brainstorming: { icon: Lightbulb, gradient: "from-yellow-500 to-orange-500", label: "Brainstorming" },
  notes: { icon: StickyNote, gradient: "from-teal-500 to-green-500", label: "Notes" },
  calendar: { icon: Calendar, gradient: "from-blue-500 to-indigo-500", label: "Calendar" },
  relationships: { icon: Users, gradient: "from-pink-500 to-rose-500", label: "People" },
  moodtracker: { icon: Smile, gradient: "from-amber-500 to-yellow-500", label: "Mood" },
  cbt: { icon: Heart, gradient: "from-red-500 to-pink-500", label: "CBT" },
  errands: { icon: ShoppingCart, gradient: "from-cyan-500 to-blue-500", label: "Errands" },
  deepreflect: { icon: Sparkles, gradient: "from-violet-500 to-purple-500", label: "Deep Reflect" },
  "packing-list": { icon: Compass, gradient: "from-blue-500 to-sky-500", label: "Packing Planner" },
  trips: { icon: MapPin, gradient: "from-rose-500 to-pink-500", label: "Trips" },
  spending: { icon: DollarSign, gradient: "from-green-500 to-emerald-500", label: "Spending" },
  "spending-unified": { icon: TrendingUp, gradient: "from-green-600 to-emerald-600", label: "Spending+" },
  investments: { icon: LineChart, gradient: "from-emerald-500 to-teal-500", label: "Investments" },
  subscriptions: { icon: CreditCard, gradient: "from-indigo-500 to-blue-500", label: "Subscriptions" },
  "asset-horizon": { icon: BarChart3, gradient: "from-purple-500 to-indigo-500", label: "Asset Horizon" },
  "admired-people": { icon: Sparkles, gradient: "from-purple-400 to-indigo-500", label: "People I Admire" },
  places: { icon: MapPin, gradient: "from-blue-400 to-cyan-500", label: "Places" },
  "body-progress": { icon: Activity, gradient: "from-blue-500 to-cyan-500", label: "Body Progress" },
  meditation: { icon: Sparkles, gradient: "from-blue-500 to-cyan-500", label: "Meditation" },
};

export function getToolVisual(toolId: string) {
  return toolVisuals[toolId as ToolName];
}

export function getToolIcon(toolId: string) {
  return toolVisuals[toolId as ToolName]?.icon;
}
