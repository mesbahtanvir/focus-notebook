"use client";

import { useEffect, useState } from "react";
import { usePhotoFeedback } from "@/store/usePhotoFeedback";
import { ArrowRight, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import NextImage from "next/image";
import { toastError, toastSuccess, toastWarning } from "@/lib/toast-presets";
import { Button } from "@/components/ui/button";
export default function PhotoFeedbackPage() {
  const {
    createSessionFromLibrary,
    loadLibrary,
    library,
    isLoading,
    userSessions,
    sessionsLoading,
    loadUserSessions,
    error,
  } = usePhotoFeedback();
  const { user, isAnonymous, loading: authLoading } = useAuth();

  const [origin, setOrigin] = useState("");
  const [votingLinkCopied, setVotingLinkCopied] = useState(false);

  const canCreateSession = !!user && !isAnonymous;

  useEffect(() => {
    if (canCreateSession) {
      void loadUserSessions();
      void loadLibrary();
    }
  }, [canCreateSession, loadLibrary, loadUserSessions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const galleryPreview = library.slice(0, 6);
  const battle = userSessions[0] ?? null;
  const totalBattleVotes = battle ? battle.photos.reduce((sum, photo) => sum + (photo.totalVotes ?? 0), 0) : 0;
  const totalBattlePhotos = battle ? battle.photos.length : library.length;
  const averageBattlesPerPhoto = totalBattlePhotos > 0 ? Math.round(totalBattleVotes / totalBattlePhotos) : 0;
  const topBattlePhotos = battle ? [...battle.photos].sort((a, b) => b.rating - a.rating).slice(0, 3) : [];
  const photosNeedingVotes = battle ? battle.photos.filter(photo => (photo.totalVotes ?? 0) < 5).length : 0;
  const votingLink = battle && origin ? `${origin}/tools/photo-feedback/session/${battle.id}` : "";
  const resultsLink = battle && origin ? `${origin}/tools/photo-feedback/results/${battle.id}?key=${battle.secretKey}` : "";
  const lastVoteLabel = battle ? (battle.updatedAt ? new Date(battle.updatedAt).toLocaleString() : "No votes yet") : "";

  const copyLink = async (value: string, setState?: (state: boolean) => void) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (setState) {
        setState(true);
        setTimeout(() => setState(false), 2000);
      }
      toastSuccess({ title: "Copied", description: "Link copied to clipboard." });
    } catch {
      toastError({ title: "Copy failed", description: "Please try again." });
    }
  };

  const handleCreateSession = async (options?: { silent?: boolean }) => {
    if (!canCreateSession) {
      toastWarning({
        title: "Sign in required",
        description: "Sign in to create a battle link. Friends can still vote without accounts.",
      });
      return;
    }

    try {
      await createSessionFromLibrary([], user?.displayName || undefined);
      await loadUserSessions();
      toastSuccess({
        title: options?.silent ? "Battle link refreshed" : "Battle link ready",
        description: "Share it using the link below.",
      });
    } catch (error) {
      const description =
        error instanceof Error && error.message ? error.message : "Please try again in a moment.";
      toastError({
        title: "Could not create battle",
        description,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Card className="p-6 bg-white dark:bg-gray-900 border-2 border-purple-100 dark:border-purple-900/40 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-purple-500 dark:text-purple-200 mb-1">
                Photo battle
              </p>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {battle ? "Your link is live" : "Launch your battle"}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {battle
                  ? "Friends can vote right now. Keep sharing to refine your rankings."
                  : "One click gives you a long-lived link that ranks your entire gallery."}
              </p>
              {battle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Last vote: {lastVoteLabel}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-xl bg-purple-50 dark:bg-purple-900/30 p-4">
                <p className="text-xs uppercase tracking-widest text-purple-500">Total votes</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{totalBattleVotes}</p>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-4">
                <p className="text-xs uppercase tracking-widest text-blue-500">Photos ranked</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{totalBattlePhotos}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {battle ? (
              <>
                <Button onClick={() => copyLink(votingLink, setVotingLinkCopied)} disabled={!votingLink}>
                  {votingLinkCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied battle link
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy battle link
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => handleCreateSession({ silent: true })} disabled={isLoading}>
                  Renew link
                </Button>
                {resultsLink && (
                  <Link
                    href={resultsLink}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-200 text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View results
                  </Link>
                )}
              </>
            ) : (
              <Button onClick={() => handleCreateSession()} disabled={!canCreateSession || isLoading}>
                Launch photo battle
              </Button>
            )}
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Gallery preview</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {library.length} photo{library.length === 1 ? "" : "s"} feeding your battle
                </p>
              </div>
              <Link
                href="/tools/photo-feedback/gallery"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-purple-600 text-white text-sm font-semibold"
              >
                Manage gallery
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {galleryPreview.length === 0 ? (
                <div className="col-span-4 text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  Upload photos to start ranking
                </div>
              ) : (
                galleryPreview.map(item => (
                  <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <NextImage src={item.url} alt="Gallery preview" fill className="object-cover" sizes="80px" />
                  </div>
                ))
              )}
            </div>
            <Link
              href="/tools/photo-feedback/gallery"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-300 hover:underline"
            >
              Open full gallery manager
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Card>

          <Card className="p-5 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Leaderboard snapshot</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Top performers from your battle</p>
              </div>
              {resultsLink && (
                <Link href={resultsLink} className="text-xs font-semibold text-purple-600 dark:text-purple-300 hover:underline">
                  Full leaderboard
                </Link>
              )}
            </div>
            {topBattlePhotos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Keep sharing to see live rankings.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {topBattlePhotos.map((photo, index) => (
                    <div key={photo.id} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <NextImage src={photo.url} alt={`Rank ${index + 1}`} fill className="object-cover" sizes="48px" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          #{index + 1} • {photo.rating} pts
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {photo.wins} wins • {photo.losses} losses
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {totalBattlePhotos > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      <span>{totalBattlePhotos - photosNeedingVotes} dialed in</span>
                      <span>{photosNeedingVotes} warming up</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"
                        style={{
                          width: `${Math.min(100, Math.round(((totalBattlePhotos - photosNeedingVotes) / totalBattlePhotos) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {photosNeedingVotes > 0
                        ? `${photosNeedingVotes} photo${photosNeedingVotes === 1 ? "" : "s"} still need at least 5 votes. Keep sharing the battle link.`
                        : "Every photo has at least 5 votes. Rankings are stabilizing."}
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {battle && (
          <Card className="p-6 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40 mt-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Battle health</p>
            <div className="grid gap-4 md:grid-cols-4">
              <StatChip label="Total votes" value={totalBattleVotes} />
              <StatChip label="Photos ranked" value={totalBattlePhotos} />
              <StatChip label="Avg battles / photo" value={averageBattlesPerPhoto} />
              <StatChip label="Need more votes" value={photosNeedingVotes} />
            </div>
          </Card>
        )}

        {/* Privacy Notice */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>🔒 Sign-in required to create • Voters don&apos;t need accounts • Battle links never expire</p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/tools/photo-feedback/market"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
          >
            Browse public sessions
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
