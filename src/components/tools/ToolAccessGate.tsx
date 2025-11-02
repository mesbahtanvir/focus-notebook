"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useToolEnrollment } from "@/store/useToolEnrollment";
import type { ToolSpecId } from "../../../shared/toolSpecs";
import { getToolSpecById } from "../../../shared/toolSpecs";

interface ToolAccessGateProps {
  toolId: ToolSpecId;
  children: ReactNode;
}

export function ToolAccessGate({ toolId, children }: ToolAccessGateProps) {
  const { isLoading, enrolledToolIds } = useToolEnrollment((state) => ({
    isLoading: state.isLoading,
    enrolledToolIds: state.enrolledToolIds,
  }));
  const isEnrolled = enrolledToolIds.includes(toolId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-12 w-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-6" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading your tool enrollments…
        </p>
      </div>
    );
  }

  if (!isEnrolled) {
    const spec = (() => {
      try {
        return getToolSpecById(toolId);
      } catch {
        return null;
      }
    })();

    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-700 rounded-3xl shadow-xl text-center space-y-6">
        <div className="p-4 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 flex items-center justify-center text-white text-2xl">
          ⚙️
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Enroll to access {spec?.title ?? 'this tool'}
          </h2>
          {spec?.tagline && (
            <p className="text-sm text-purple-600 dark:text-purple-300 font-semibold">
              {spec.tagline}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            You haven&apos;t enrolled in this tool yet. Visit the marketplace to activate it and unlock personalized support tailored to your workflow.
          </p>
          {spec?.benefits && spec.benefits.length > 0 && (
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 bg-purple-50/70 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl px-4 py-3 text-left">
              {spec.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 text-purple-500">•</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <Link
            href="/tools/marketplace"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            Open Tool Marketplace
          </Link>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Enrollment lets you control which tools show up in AI processing prompts.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
