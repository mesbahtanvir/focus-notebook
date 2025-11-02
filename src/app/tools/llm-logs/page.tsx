"use client";

import { useEffect, useMemo } from "react";
import { ToolPageLayout, ToolContent, ToolHeader } from "@/components/tools";
import { useLLMLogs } from "@/store/useLLMLogs";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Brain, Clock, ArrowRight } from "lucide-react";
import { useToolEnrollment } from "@/store/useToolEnrollment";
import Link from "next/link";

function formatDate(value?: string) {
  if (!value) return "--";
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return value;
  }
}

function copyToClipboard(text: string) {
  void navigator.clipboard?.writeText(text);
}

export default function LLMLogsPage() {
  const { user } = useAuth();
  const { subscribe, logs, isLoading } = useLLMLogs((state) => ({
    subscribe: state.subscribe,
    logs: state.logs,
    isLoading: state.isLoading,
  }));
  const enrolledToolIds = useToolEnrollment((state) => state.enrolledToolIds);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
    return () => {
      useLLMLogs.getState().clear();
    };
  }, [user?.uid, subscribe]);

  const logsFound = logs.length > 0;
  const activeSpecs = useMemo(() => new Set(enrolledToolIds), [enrolledToolIds]);

  return (
    <ToolPageLayout>
      <ToolHeader
        title="AI Prompt History"
        subtitle="Review the exact prompts and responses used during thought processing"
        gradientFrom="from-purple-500"
        gradientTo="to-indigo-500"
        stats={[
          { label: 'logs', value: logs.length, variant: 'info' },
          { label: 'tools', value: activeSpecs.size, variant: 'success' },
        ]}
        actionElement={(
          <Link
            href="/tools/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white/90 text-purple-700 font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Manage Tools
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      />

      <ToolContent>
        {!logsFound && !isLoading && (
          <Card className="border-dashed border-2 border-purple-300 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-200">
                <Brain className="h-5 w-5" />
                No prompt history yet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>Trigger AI processing on any thought to see the exact prompt and response that was sent to the LLM.</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                Prompts appear here instantly after processing finishes.
              </div>
              <Link
                href="/tools/thoughts"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Process a Thought
              </Link>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600" />
          </div>
        )}

        {logsFound && (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="border border-purple-200 dark:border-purple-700">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      Thought Processing
                      <Badge variant="secondary" className="text-xs uppercase">
                        {log.trigger}
                      </Badge>
                      {log.toolSpecIds && log.toolSpecIds.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Tools: {log.toolSpecIds.join(', ')}
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(log.createdAt)}
                      {log.thoughtId ? ` • Thought ID: ${log.thoughtId}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(log.prompt)}>
                      <Copy className="h-4 w-4" /> Copy Prompt
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Prompt Sent to LLM</h3>
                    <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 text-gray-100 p-4 text-xs whitespace-pre-wrap border border-gray-800">
                      {log.prompt}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Model Response</h3>
                    <pre className="max-h-96 overflow-auto rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-4 text-xs whitespace-pre-wrap border border-gray-200 dark:border-gray-700">
                      {log.rawResponse}
                    </pre>
                  </div>

                  {log.actions && log.actions.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Parsed Actions</h3>
                      <pre className="rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 p-4 text-xs whitespace-pre-wrap border border-purple-200 dark:border-purple-700">
                        {JSON.stringify(log.actions, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.usage && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
                      {log.usage.prompt_tokens !== undefined && (
                        <span>Prompt tokens: {log.usage.prompt_tokens}</span>
                      )}
                      {log.usage.completion_tokens !== undefined && (
                        <span>Completion tokens: {log.usage.completion_tokens}</span>
                      )}
                      {log.usage.total_tokens !== undefined && (
                        <span>Total tokens: {log.usage.total_tokens}</span>
                      )}
                    </div>
                  )}

                  {log.error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-600">
                      Error: {log.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ToolContent>
    </ToolPageLayout>
  );
}
