"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Check, ExternalLink, BarChart3, Share2, Clock, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { usePhotoFeedback } from "@/store/usePhotoFeedback";
import { toastError, toastSuccess } from "@/lib/toast-presets";

function SharePageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const secretKey = searchParams.get('secretKey');

  const [copied, setCopied] = useState(false);
  const [votingLinkCopied, setVotingLinkCopied] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [isUpdatingPublic, setIsUpdatingPublic] = useState(false);
  const { userSessions, loadUserSessions, setSessionPublic } = usePhotoFeedback();

  const votingLink = typeof window !== 'undefined'
    ? `${window.location.origin}/tools/photo-feedback/session/${sessionId}`
    : '';

  const resultsLink = typeof window !== 'undefined'
    ? `${window.location.origin}/tools/photo-feedback/results/${sessionId}?key=${secretKey}`
    : '';

  const copyToClipboard = async (text: string, setStateFn: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setStateFn(true);
      setTimeout(() => setStateFn(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3);

  useEffect(() => {
    if (!sessionId) return;
    const current = userSessions.find(session => session.id === sessionId);
    if (current) {
      setIsPublic(Boolean(current.isPublic));
    } else {
      void (async () => {
        const sessions = await loadUserSessions();
        const match = sessions.find(session => session.id === sessionId);
        if (match) setIsPublic(Boolean(match.isPublic));
      })();
    }
  }, [sessionId, userSessions, loadUserSessions]);

  const handleTogglePublic = async () => {
    if (!sessionId || isPublic === null) return;
    setIsUpdatingPublic(true);
    try {
      await setSessionPublic(sessionId, !isPublic);
      setIsPublic(!isPublic);
      toastSuccess({
        title: !isPublic ? "Now listed publicly" : "Session made private",
        description: !isPublic
          ? "Your session is visible on the Voting Market."
          : "Your session has been removed from the public list.",
      });
    } catch (error) {
      console.error(error);
      toastError({
        title: "Unable to update",
        description: "Please try again in a moment.",
      });
    } finally {
      setIsUpdatingPublic(false);
    }
  };

  if (!sessionId || !secretKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-red-600 dark:text-red-400">Invalid session. Please create a new one.</p>
          <Link
            href="/tools/photo-feedback"
            className="mt-4 inline-block text-purple-600 hover:text-purple-700 font-semibold"
          >
            Create New Session
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
              <Check className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Session Created!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Share the voting link with your friends
          </p>
        </div>

        {/* Voting Link */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              Voting Link (Share this with friends)
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Your friends can vote on your photos using this link. No login required for them!
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={votingLink}
              readOnly
              className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(votingLink, setVotingLinkCopied)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              {votingLinkCopied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <Clock className="w-4 h-4" />
            <span>Link expires on {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}</span>
          </div>
        </Card>

        {/* Results Link (Keep this private!) */}
        <Card className="p-6 mb-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              Results Link (Keep this private!)
            </h2>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
            <strong>⚠️ Important:</strong> This link contains your secret key. Only you should have access to it to view the results.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={resultsLink}
              readOnly
              className="flex-1 px-4 py-3 rounded-lg border-2 border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(resultsLink, setCopied)}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/tools/photo-feedback/session/${sessionId}`}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
          >
            <ExternalLink className="w-5 h-5" />
            Preview Voting Page
          </Link>
          <Link
            href={`/tools/photo-feedback/results/${sessionId}?key=${secretKey}`}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-all"
          >
            <BarChart3 className="w-5 h-5" />
            View Results
          </Link>
        </div>

        {isPublic !== null && (
          <Card className="mt-6 p-6 bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-900/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Voting Market</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isPublic
                    ? "This session is listed publicly. Anyone can discover and vote on it."
                    : "Make this session public so anyone browsing the Voting Market can vote."}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              disabled={isUpdatingPublic}
              className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors ${
                isPublic
                  ? "bg-gray-900 text-white hover:bg-gray-800"
                  : "bg-green-600 text-white hover:bg-green-700"
              } disabled:opacity-60`}
            >
              {isUpdatingPublic ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : isPublic ? (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Make Private
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  List on Voting Market
                </>
              )}
            </button>
          </Card>
        )}

        {/* Tips */}
        <Card className="p-6 mt-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">💡 Tips</h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">•</span>
              <span>Send the voting link to at least 5-10 friends for meaningful results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">•</span>
              <span>Save the results link somewhere safe - you won&apos;t be able to retrieve it later</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">•</span>
              <span>The session expires in 3 days, so collect feedback quickly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">•</span>
              <span>Voters swipe right for &quot;yes&quot; and left for &quot;no&quot; on each photo</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <SharePageContent />
    </Suspense>
  );
}
