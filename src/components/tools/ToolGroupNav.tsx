"use client";

import Link from "next/link";
import { getToolGroupForTool, getToolSpecById } from "../../../shared/toolSpecs";
import { Card } from "@/components/ui/card";
import { ArrowRight, Package } from "lucide-react";

interface ToolGroupNavProps {
  currentToolId: string;
}

export function ToolGroupNav({ currentToolId }: ToolGroupNavProps) {
  const toolGroup = getToolGroupForTool(currentToolId);

  // If tool is not part of a group, don't show navigation
  if (!toolGroup) {
    return null;
  }

  // Get all tools in the group except the current one
  const relatedTools = toolGroup.toolIds
    .filter((id) => id !== currentToolId)
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
              {toolGroup.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {toolGroup.tagline}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Related Tools
          </p>
          <div className="grid gap-1.5 sm:gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools.map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="group flex items-center gap-2 p-2 sm:p-3 rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                    {tool.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {tool.tagline}
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
