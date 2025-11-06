"use client";

import { useState } from "react";
import { ToolHeader, ToolPageLayout, ToolCard, ToolGrid } from "@/components/tools";
import { Brain, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { toolThemes } from "@/components/tools/themes";
import { toolGroups, type ToolGroupId } from "../../../../shared/toolSpecs";
import { useToolEnrollment } from "@/store/useToolEnrollment";

export default function ToolMarketplacePage() {
  const {
    enrollGroup,
    unenrollGroup,
    isLoading,
    enrolledToolIds,
    getGroupEnrollmentStatus
  } = useToolEnrollment((state) => ({
    enrollGroup: state.enrollGroup,
    unenrollGroup: state.unenrollGroup,
    enrolledToolIds: state.enrolledToolIds,
    isLoading: state.isLoading,
    getGroupEnrollmentStatus: state.getGroupEnrollmentStatus,
  }));
  const [pendingGroup, setPendingGroup] = useState<ToolGroupId | null>(null);

  const groups = Object.values(toolGroups).sort((a, b) => a.title.localeCompare(b.title));
  const theme = toolThemes.purple;

  const handleToggle = async (groupId: ToolGroupId, enrollmentStatus: 'all' | 'partial' | 'none') => {
    setPendingGroup(groupId);
    try {
      if (enrollmentStatus === 'all') {
        await unenrollGroup(groupId);
      } else {
        await enrollGroup(groupId);
      }
    } finally {
      setPendingGroup(null);
    }
  };

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Tool Marketplace"
        subtitle="Pick which AI-powered tool suites you want active in your workspace."
        theme={theme}
        stats={[
          { label: 'enrolled', value: enrolledToolIds.length, variant: 'success' },
          { label: 'groups', value: groups.length, variant: 'info' },
        ]}
      />

      <div className="rounded-3xl border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 via-white to-blue-50 dark:from-purple-950/30 dark:via-gray-900 dark:to-blue-950/20 p-6 md:p-10 shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="flex-1 space-y-3 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Curate your personalized tool suite
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              Enroll in complete tool suites tailored to your needs. Each suite includes multiple integrated tools that work together seamlessly.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-700 rounded-2xl px-5 py-4 shadow-md">
            <Brain className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active tools</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-300">
                {isLoading ? '—' : enrolledToolIds.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ToolGrid columns={2} className="gap-4">
        {groups.map((group) => {
          const enrollmentStatus = getGroupEnrollmentStatus(group.id as ToolGroupId);
          const pending = pendingGroup === group.id;

          return (
            <ToolCard key={group.id} className="p-6 md:p-7 border-2 border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {group.title}
                  {enrollmentStatus === 'all' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Enrolled
                    </span>
                  )}
                  {enrollmentStatus === 'partial' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                      <AlertCircle className="h-3 w-3" />
                      Partial
                    </span>
                  )}
                </h3>
                {group.category && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">
                    {group.category}
                  </span>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {group.tagline}
                </p>
                </div>
                <button
                  onClick={() => handleToggle(group.id as ToolGroupId, enrollmentStatus)}
                  disabled={pending}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    enrollmentStatus === 'all'
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                  } ${pending ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {pending ? 'Saving…' : enrollmentStatus === 'all' ? 'Unenroll' : 'Enroll'}
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>{group.description}</p>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                    Includes {group.toolIds.length} tools:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.toolIds.map((toolId) => (
                      <span
                        key={toolId}
                        className="inline-flex items-center text-xs px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 text-gray-700 dark:text-gray-300"
                      >
                        {toolId}
                      </span>
                    ))}
                  </div>
                </div>

                {group.benefits && group.benefits.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {group.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                )}
              </div>
            </ToolCard>
          );
        })}
      </ToolGrid>
    </ToolPageLayout>
  );
}
