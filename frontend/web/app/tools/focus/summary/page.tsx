"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFocus, FocusSession } from "@/store/useFocus";
import { SessionSummary } from "@/components/SessionSummary";

function FocusSessionSummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [session, setSession] = useState<FocusSession | null>(null);

  const sessions = useFocus((s) => s.sessions);
  const clearCompletedSession = useFocus((s) => s.clearCompletedSession);

  useEffect(() => {
    if (sessionId) {
      const foundSession = sessions.find(s => s.id === sessionId);
      if (foundSession) {
        setSession(foundSession);
      }
    }
  }, [sessionId, sessions]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  const handleStartNewSession = () => {
    clearCompletedSession();
    router.push('/tools/focus');
  };

  const handleViewHistory = () => {
    router.push('/tools/focus?tab=history');
  };

  return (
    <SessionSummary
      session={session}
      onStartNewSession={handleStartNewSession}
      onViewHistory={handleViewHistory}
    />
  );
}

export default function FocusSessionSummaryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <FocusSessionSummaryContent />
    </Suspense>
  );
}
