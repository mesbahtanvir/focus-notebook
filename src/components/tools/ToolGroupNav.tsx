"use client";

import Link from "next/link";
import { getToolGroupForTool, getToolSpecById, toolGroups } from "../../../shared/toolSpecs";
import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";
import { getToolIcon } from "./toolVisuals";

interface ToolGroupNavProps {
  currentToolId: string;
  showAllTools?: boolean; // New prop for hub pages
}

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
        return {
          id,
          title: spec.title,
          tagline: spec.tagline || spec.description,
        };
      } catch (error) {
        return null;
      }
    })
    .filter((tool): tool is { id: string; title: string; tagline: string } => tool !== null);

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
          <div className="grid gap-1.5 sm:gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {relatedTools.map((tool) => {
              const Icon = getToolIcon(tool.id) || Package;
              return (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.id}`}
                  className="group flex items-center gap-2 p-2 rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 hover:border-purple-400 dark:hover:border-purple-500 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center text-purple-600 dark:text-purple-300 group-hover:scale-105 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
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
