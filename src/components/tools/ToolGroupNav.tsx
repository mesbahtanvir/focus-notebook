"use client";

import Link from "next/link";
import { getToolGroupForTool, getToolSpecById, toolGroups } from "../../../shared/toolSpecs";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Package,
  CheckSquare,
  Brain,
  Target,
  FolderKanban,
  Zap,
  Lightbulb,
  StickyNote,
  Users,
  Smile,
  Heart,
  ShoppingCart,
  Sparkles,
  Compass,
  MapPin,
  LineChart,
  CreditCard,
  BarChart3,
  DollarSign,
  LucideIcon
} from "lucide-react";

interface ToolGroupNavProps {
  currentToolId: string;
  showAllTools?: boolean; // New prop for hub pages
}

// Tool icon mapping
const toolIcons: Record<string, LucideIcon> = {
  tasks: CheckSquare,
  thoughts: Brain,
  goals: Target,
  projects: FolderKanban,
  focus: Zap,
  brainstorming: Lightbulb,
  notes: StickyNote,
  relationships: Users,
  moodtracker: Smile,
  cbt: Heart,
  errands: ShoppingCart,
  deepreflect: Sparkles,
  'packing-list': Compass,
  trips: MapPin,
  spending: DollarSign,
  investments: LineChart,
  subscriptions: CreditCard,
  'asset-horizon': BarChart3,
  'admired-people': Sparkles,
  places: MapPin,
};

// Tool color gradients
const toolColors: Record<string, string> = {
  tasks: "from-blue-500 to-cyan-500",
  thoughts: "from-purple-500 to-pink-500",
  goals: "from-green-500 to-emerald-500",
  projects: "from-orange-500 to-amber-500",
  focus: "from-indigo-500 to-purple-500",
  brainstorming: "from-yellow-500 to-orange-500",
  notes: "from-teal-500 to-green-500",
  relationships: "from-pink-500 to-rose-500",
  moodtracker: "from-amber-500 to-yellow-500",
  cbt: "from-red-500 to-pink-500",
  errands: "from-cyan-500 to-blue-500",
  deepreflect: "from-violet-500 to-purple-500",
  'packing-list': "from-blue-500 to-sky-500",
  trips: "from-rose-500 to-pink-500",
  spending: "from-green-500 to-emerald-500",
  investments: "from-emerald-500 to-teal-500",
  subscriptions: "from-indigo-500 to-blue-500",
  'asset-horizon': "from-purple-500 to-indigo-500",
  'admired-people': "from-purple-400 to-indigo-500",
  places: "from-blue-400 to-cyan-500",
};

export function ToolGroupNav({ currentToolId, showAllTools = false }: ToolGroupNavProps) {
  const toolGroup = getToolGroupForTool(currentToolId);

  // Check if currentToolId is actually a group ID (for hub pages)
  const isGroupHub = Object.keys(toolGroups).includes(currentToolId);

  // If tool is not part of a group, don't show navigation
  if (!toolGroup && !isGroupHub) {
    return null;
  }

  // Use the correct group
  const activeGroup = isGroupHub ? toolGroups[currentToolId as keyof typeof toolGroups] : toolGroup;

  if (!activeGroup) {
    return null;
  }

  // Get all tools in the group
  // For hub pages or when showAllTools is true, show ALL tools
  // For individual tool pages, filter out the current tool
  const shouldShowAll = showAllTools || isGroupHub;
  const relatedTools = activeGroup.toolIds
    .filter((id) => shouldShowAll || id !== currentToolId)
    .map((id) => {
      try {
        const spec = getToolSpecById(id as any);
        const Icon = toolIcons[id] || Package; // Fallback to Package icon
        const gradient = toolColors[id] || "from-gray-500 to-gray-600"; // Fallback gradient
        return {
          id,
          title: spec.title,
          icon: Icon,
          gradient,
        };
      } catch (error) {
        return null;
      }
    })
    .filter((tool): tool is { id: string; title: string; icon: LucideIcon; gradient: string } => tool !== null);

  // If there are no related tools, don't show the component
  if (relatedTools.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 mb-4 sm:mb-6">
      <div className="p-3 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex-shrink-0">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              {activeGroup.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {activeGroup.tagline}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Related Tools
          </p>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {relatedTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.id}`}
                  className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 text-center group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                    {tool.title}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
