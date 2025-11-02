"use client";

import { useState } from "react";
import { ToolHeader, ToolPageLayout, ToolCard, ToolGrid } from "@/components/tools";
import { Brain, CheckCircle2, Sparkles } from "lucide-react";
import { toolThemes } from "@/components/tools/themes";
import { toolSpecs, type ToolSpecId } from "../../../../shared/toolSpecs";
import { useToolEnrollment } from "@/store/useToolEnrollment";

export default function ToolMarketplacePage() {
  const { enrollments, enroll, unenroll, isLoading, enrolledToolIds } = useToolEnrollment((state) => ({
    enrollments: state.enrollments,
    enrolledToolIds: state.enrolledToolIds,
    enroll: state.enroll,
    unenroll: state.unenroll,
    isLoading: state.isLoading,
  }));
  const [pendingTool, setPendingTool] = useState<ToolSpecId | null>(null);

  const specs = Object.values(toolSpecs).sort((a, b) => a.title.localeCompare(b.title));
  const theme = toolThemes.purple;

  const handleToggle = async (toolId: ToolSpecId, currentlyEnrolled: boolean) => {
    setPendingTool(toolId);
    try {
      if (currentlyEnrolled) {
        await unenroll(toolId);
      } else {
        await enroll(toolId);
      }
    } finally {
      setPendingTool(null);
    }
  };

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Tool Marketplace"
        subtitle="Pick which AI-powered tools you want active in your workspace."
        theme={theme}
        stats={[
          { label: 'enrolled', value: enrolledToolIds.length, variant: 'success' },
          { label: 'available', value: specs.length, variant: 'info' },
        ]}
      />

      <div className="rounded-3xl border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 via-white to-blue-50 dark:from-purple-950/30 dark:via-gray-900 dark:to-blue-950/20 p-6 md:p-10 shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="flex-1 space-y-3 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Curate your personalized tool stack
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              Enroll only in the tools you need. We use your selections to decide what guidance and examples reach the AI models during thought processing, keeping prompts lean and relevant.
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
        {specs.map((spec) => {
          const isEnrolled = enrolledToolIds.includes(spec.id as ToolSpecId);
          const pending = pendingTool === spec.id;
          const enrollment = enrollments.find((entry) => entry.id === spec.id);
          const enrolledAtDate = (() => {
            const raw = enrollment?.enrolledAt as any;
            if (!raw) return null;
            if (typeof raw === 'string') {
              const parsed = new Date(raw);
              return isNaN(parsed.getTime()) ? null : parsed;
            }
            if (typeof raw?.toDate === 'function') {
              return raw.toDate();
            }
            return null;
          })();

          return (
            <ToolCard key={spec.id} className="p-6 md:p-7 border-2 border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {spec.title}
                  {isEnrolled && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Enrolled
                    </span>
                  )}
                </h3>
                {spec.category && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">
                    {spec.category}
                  </span>
                )}
                {spec.tagline && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {spec.tagline}
                  </p>
                )}
                </div>
                <button
                  onClick={() => handleToggle(spec.id as ToolSpecId, isEnrolled)}
                  disabled={pending}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isEnrolled
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                  } ${pending ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {pending ? 'Saving…' : isEnrolled ? 'Unenroll' : 'Enroll'}
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>{spec.description}</p>
                {spec.benefits && spec.benefits.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {spec.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                )}
              </div>

              {enrolledAtDate && (
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                  Enrolled on {enrolledAtDate.toLocaleDateString()}
                </p>
              )}
            </ToolCard>
          );
        })}
      </ToolGrid>
    </ToolPageLayout>
  );
}
