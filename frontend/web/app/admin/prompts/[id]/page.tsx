"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, Loader2, AlertTriangle, Copy, Clock, ListTree } from "lucide-react";
import clsx from "clsx";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { LLMLog } from "@/store/useLLMLogs";

type PageProps = {
  params: {
    id: string;
  };
};

function serializeTimestamp(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

function copyToClipboard(text?: string) {
  if (!text || typeof navigator === "undefined" || !navigator.clipboard) return;
  void navigator.clipboard.writeText(text);
}

export default function PromptLogDetailsPage({ params }: PageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [log, setLog] = useState<LLMLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setError("You need to be signed in to view prompt history.");
      setIsLoading(false);
      return;
    }

    const ref = doc(db, `users/${user.uid}/llmLogs/${params.id}`);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setLog(null);
          setError("Prompt history entry was not found.");
          setIsLoading(false);
          return;
        }
        const data = snapshot.data() as LLMLog;
        setLog({
          ...data,
          id: snapshot.id,
          createdAt: serializeTimestamp((data as any).createdAt ?? (snapshot.data() as any).createdAt),
        });
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to load prompt log:", err);
        setError("We couldn't load this prompt history. Please try again.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, loading, params.id]);

  const status = useMemo<"completed" | "failed" | undefined>(() => {
    if (!log) return undefined;
    if (log.status) return log.status;
    return log.error ? "failed" : "completed";
  }, [log]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-black text-gray-900 dark:text-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <Link
              href="/admin"
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Open Admin Console
            </Link>
          </div>
          {log?.thoughtId && (
            <Link
              href={`/tools/thoughts/${log.thoughtId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-sm font-semibold text-purple-700 shadow-sm hover:bg-purple-50 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200"
            >
              View Thought
            </Link>
          )}
        </div>

        <div className="rounded-3xl border border-purple-100 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-purple-900/60 dark:bg-gray-900/70">
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-2xl bg-purple-100 p-3 dark:bg-purple-900/40">
              <Brain className="h-6 w-6 text-purple-700 dark:text-purple-200" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-widest text-purple-500 font-semibold">AI Prompt History</p>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Prompt #{params.id}</h1>
              {log?.createdAt && (
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading prompt details...
            </div>
          )}

          {!isLoading && error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-semibold">Something went wrong</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && log && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Trigger</p>
                  <p className="mt-2 inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                    {log.trigger}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <p
                    className={clsx(
                      "mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                      status === "failed"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                    )}
                  >
                    {status === "failed" ? "Failed" : "Completed"}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Tool Specs</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-200">
                    {log.toolSpecIds?.length ? log.toolSpecIds.join(", ") : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Tokens Used</p>
                  {log.usage ? (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                      {log.usage.prompt_tokens !== undefined && <p>Prompt: {log.usage.prompt_tokens}</p>}
                      {log.usage.completion_tokens !== undefined && <p>Completion: {log.usage.completion_tokens}</p>}
                      {log.usage.total_tokens !== undefined && <p>Total: {log.usage.total_tokens}</p>}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-200">—</p>
                  )}
                </div>
              </div>

              {log.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  <p className="font-semibold mb-1">Error</p>
                  <p>{log.error}</p>
                </div>
              )}

              <section className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                <header className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Prompt</h2>
                  <button
                    onClick={() => copyToClipboard(log.prompt)}
                    className="inline-flex items-center gap-2 rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-200 dark:hover:bg-purple-900/30"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </header>
                <pre className="max-h-[400px] overflow-auto rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-xs leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-100 whitespace-pre-wrap">
                  {log.prompt || "—"}
                </pre>
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                <header className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Response</h2>
                  <button
                    onClick={() => copyToClipboard(log.rawResponse)}
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-900/30"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </header>
                <pre className="max-h-[400px] overflow-auto rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-xs leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-100 whitespace-pre-wrap">
                  {log.rawResponse || "—"}
                </pre>
              </section>

              {log.actions && Array.isArray(log.actions) && log.actions.length > 0 && (
                <section className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                  <header className="mb-3 flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-purple-500" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Actions</h2>
                    <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                      {log.actions.length}
                    </span>
                  </header>
                  <div className="space-y-3">
                    {log.actions.map((action, index) => (
                      <pre
                        key={index}
                        className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-100 whitespace-pre-wrap overflow-auto"
                      >
                        {JSON.stringify(action, null, 2)}
                      </pre>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
