"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Brain, Loader2, AlertTriangle, Search, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLLMLogs, LLMLog } from "@/store/useLLMLogs";

type StatusFilter = "all" | "completed" | "failed";
type TriggerFilter = "all" | "auto" | "manual" | "reprocess";

export default function LLMHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-950 dark:to-black">
          <div className="flex flex-col items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            Loading AI history...
          </div>
        </div>
      }
    >
      <LLMHistoryContent />
    </Suspense>
  );
}

function LLMHistoryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const thoughtFilterParam = searchParams?.get("thoughtId") ?? "";
  const promptFocusParam = searchParams?.get("promptId") ?? "";

  const { logs, isLoading, subscribe, clear } = useLLMLogs((state) => ({
    logs: state.logs,
    isLoading: state.isLoading,
    subscribe: state.subscribe,
    clear: state.clear,
  }));

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [thoughtFilter, setThoughtFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
    return () => {
      clear();
    };
  }, [user?.uid, subscribe, clear]);

  useEffect(() => {
    if (thoughtFilterParam) {
      setThoughtFilter(thoughtFilterParam);
    }
  }, [thoughtFilterParam]);

  useEffect(() => {
    if (!promptFocusParam) return;
    const exists = logs.some((log) => log.id === promptFocusParam);
    if (exists) {
      setExpandedId(promptFocusParam);
    }
  }, [promptFocusParam, logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const status: "completed" | "failed" = log.status ?? (log.error ? "failed" : "completed");
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (triggerFilter !== "all" && log.trigger !== triggerFilter) {
        return false;
      }
      if (thoughtFilter && log.thoughtId !== thoughtFilter) {
        return false;
      }
      if (searchQuery) {
        const haystack = `${log.prompt ?? ""} ${log.rawResponse ?? ""} ${(log.toolSpecIds ?? []).join(" ")}`.toLowerCase();
        if (!haystack.includes(searchQuery.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [logs, statusFilter, triggerFilter, thoughtFilter, searchQuery]);

  const renderStatusBadge = (log: LLMLog) => {
    const status: "completed" | "failed" = log.status ?? (log.error ? "failed" : "completed");
    const base =
      status === "failed"
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-green-100 text-green-700 border-green-200";
    return (
      <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${base}`}>
        {status === "failed" ? "Failed" : "Completed"}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Brain className="h-10 w-10 text-purple-500 mx-auto" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Sign in to view AI history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-950 dark:to-black">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-purple-500 font-semibold">LLM Query History</p>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600" />
            Recent AI Requests
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Review every AI call associated with your account. Filter by trigger, status, or thought, and jump directly to a detailed log.
          </p>
        </header>

        <section className="rounded-2xl border border-purple-100 bg-white/90 p-4 shadow-sm dark:border-purple-900/60 dark:bg-gray-900/50 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Search prompts & responses
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Find keywords..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Filter by thought
              </label>
              <input
                type="text"
                value={thoughtFilter}
                onChange={(event) => setThoughtFilter(event.target.value)}
                placeholder="Enter thought ID"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Trigger
                </label>
                <select
                  value={triggerFilter}
                  onChange={(event) => setTriggerFilter(event.target.value as TriggerFilter)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="all">All</option>
                  <option value="auto">Auto</option>
                  <option value="manual">Manual</option>
                  <option value="reprocess">Reprocess</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <span>
              Showing {filteredLogs.length} of {logs.length} entries
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-purple-500" />
              Loading AI requests...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-white/70 py-16 text-center text-gray-500 dark:border-purple-900/60 dark:bg-gray-900/40">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-purple-400" />
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">No logs match your filters.</p>
              <p className="text-sm">Try adjusting the filters or search terms.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const expanded = expandedId === log.id;
                return (
                  <div key={log.id} className="rounded-2xl border border-purple-100 bg-white/90 shadow-sm dark:border-purple-900/60 dark:bg-gray-900/60 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-purple-50/70 dark:hover:bg-purple-950/20 transition-colors"
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-purple-100 rounded-xl dark:bg-purple-900/40">
                          <Brain className="h-4 w-4 text-purple-600 dark:text-purple-200" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
                            {log.prompt?.replace(/\s+/g, " ").slice(0, 120) || "—"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {log.toolSpecIds && log.toolSpecIds.length > 0 ? `Tools: ${log.toolSpecIds.join(", ")}` : log.rawResponse?.slice(0, 140)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold uppercase">
                          {log.trigger}
                        </span>
                        {renderStatusBadge(log)}
                        <span className="hidden sm:inline-block">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                        </span>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {expanded && (
                      <div className="border-t border-purple-50 bg-purple-50/40 p-4 text-sm dark:border-purple-900/40 dark:bg-purple-950/20 space-y-4">
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>ID: {log.id}</span>
                          {log.thoughtId && (
                            <Link
                              href={`/tools/thoughts/${log.thoughtId}`}
                              className="text-purple-600 hover:underline dark:text-purple-300 font-semibold"
                            >
                              Thought: {log.thoughtId}
                            </Link>
                          )}
                          {log.createdAt && <span>{new Date(log.createdAt).toLocaleString()}</span>}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                              Prompt
                            </p>
                            <pre className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-800 max-h-60 overflow-auto dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 whitespace-pre-wrap">
                              {log.prompt || "—"}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                              Response
                            </p>
                            <pre className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-800 max-h-60 overflow-auto dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 whitespace-pre-wrap">
                              {log.rawResponse || "—"}
                            </pre>
                          </div>
                        </div>
                        {log.error && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5" />
                            <span>{log.error}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Link
                            href={`/admin/prompts/${log.id}`}
                            className="text-purple-600 hover:underline font-semibold dark:text-purple-300"
                          >
                            Open detailed view ↗
                          </Link>
                          <Link
                            href={`/admin/prompts?thoughtId=${log.thoughtId ?? ""}`}
                            className="text-gray-600 hover:underline dark:text-gray-300"
                          >
                            Filter similar
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
