"use client";

import { useEffect, useState, Suspense, Fragment } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePhotoFeedback, type BattlePhoto } from "@/store/usePhotoFeedback";
import { Trophy, TrendingUp, Users, Loader2, Share2, Trash2, GitMerge, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { toastError, toastSuccess } from "@/lib/toast-presets";
import { Button } from "@/components/ui/button";

function ResultsPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const secretKey = searchParams.get('key');

  const { loadResults, results, isLoading, error, deleteSessionPhoto, mergeSessionPhotos } = usePhotoFeedback();
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] = useState<BattlePhoto | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId && secretKey) {
      loadResults(sessionId, secretKey);
    }
  }, [sessionId, secretKey, loadResults]);

  useEffect(() => {
    if (results.length < 2) {
      setMergeSourceId(null);
      setMergeTargetId(null);
    }
  }, [results.length]);

  const handleDeletePhoto = async (photoId: string) => {
    if (!sessionId) return;
    setDeletingPhotoId(photoId);
    try {
      await deleteSessionPhoto(sessionId, photoId);
      toastSuccess({
        title: "Photo removed",
        description: "The shot has been deleted from your leaderboard.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete photo. Please try again.";
      toastError({
        title: "Could not delete photo",
        description: message,
      });
    } finally {
      setDeletingPhotoId(null);
      if (mergeSourceId === photoId || mergeTargetId === photoId) {
        setMergeSourceId(null);
        setMergeTargetId(null);
      }
      setDeleteConfirmPhoto(prev => (prev?.id === photoId ? null : prev));
    }
  };

  const mergeSourceIndex = mergeSourceId ? results.findIndex(photo => photo.id === mergeSourceId) : -1;

  const handleToggleMergeSource = (photoId: string) => {
    setMergeTargetId(null);
    setMergeSourceId(prev => (prev === photoId ? null : photoId));
  };

  const handleMergePhotos = async (targetId: string) => {
    if (!sessionId || !mergeSourceId || mergeSourceId === targetId) return;
    const targetIndex = results.findIndex(photo => photo.id === targetId);
    const baseIndex = mergeSourceIndex;
    const baseLabel = baseIndex >= 0 ? `Photo #${baseIndex + 1}` : "the selected photo";
    const targetLabel = targetIndex >= 0 ? `Photo #${targetIndex + 1}` : "this photo";
    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(
            `Merge ${targetLabel} into ${baseLabel}? Their stats will be combined and ${targetLabel} will be removed.`
          );
    if (!confirmed) return;
    setMergeTargetId(targetId);
    try {
      await mergeSessionPhotos(sessionId, mergeSourceId, targetId);
      toastSuccess({
        title: "Photos merged",
        description: "The stats have been combined into the selected photo.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to merge photos. Please try again.";
      toastError({
        title: "Could not merge photos",
        description: message,
      });
    } finally {
      setMergeTargetId(null);
      setMergeSourceId(null);
    }
  };

  if (!secretKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Missing secret key</p>
          <p className="text-gray-600 dark:text-gray-400">
            You need the secret key to view results. Check your results link.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link
            href="/tools/photo-feedback"
            className="inline-block text-purple-600 hover:text-purple-700 font-semibold"
          >
            Create New Battle
          </Link>
        </Card>
      </div>
    );
  }

  const totalVotes = results.reduce((sum, r) => sum + r.totalVotes, 0);
  const avgVotesPerPhoto = results.length > 0 ? Math.round(totalVotes / results.length) : 0;
  const canCombinePhotos = results.length > 1;

  return (
    <Fragment>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Your Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Here&apos;s what your friends thought of your photos
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Votes</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{totalVotes}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Votes/Photo</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{avgVotesPerPhoto}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Top Rating</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {results[0]?.rating ?? 0} pts
                </p>
              </div>
            </div>
          </Card>
        </div>

        {mergeSourceId && mergeSourceIndex >= 0 && (
          <div className="mb-4 rounded-lg border border-dashed border-purple-300 bg-purple-50/70 px-4 py-3 text-sm text-purple-900 dark:border-purple-500/50 dark:bg-purple-950/40 dark:text-purple-100">
            Combining stats into <span className="font-semibold">Photo #{mergeSourceIndex + 1}</span>. Select another photo
            to merge or cancel the combine mode.
          </div>
        )}

        {/* Results Grid */}
        {results.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-gray-800">
            <Share2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              No votes yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Share the voting link with your friends to start collecting feedback!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => {
              const winRate = result.totalVotes > 0 ? Math.round((result.wins / result.totalVotes) * 100) : 0;
              const isMergeBase = mergeSourceId === result.id;
              const canMergeWithBase = !!mergeSourceId && mergeSourceId !== result.id;
              const isMergeTargetPending = mergeTargetId === result.id;
              return (
                <Card
                  key={result.id}
                  className={`p-6 bg-white dark:bg-gray-800 border-2 transition-all ${
                    index === 0
                      ? "border-yellow-400 dark:border-yellow-600 shadow-lg"
                      : "border-purple-200 dark:border-purple-800"
                  }`}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="relative w-full md:w-48 h-64">
                        <Image
                          src={result.url}
                          alt={`Photo ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 192px"
                          className="object-cover rounded-lg"
                          priority={index === 0}
                        />
                        {index === 0 && (
                          <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-2">
                            <Trophy className="w-6 h-6" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          #{index + 1}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Photo #{index + 1}</h3>
                        <div className="flex flex-col gap-2 items-start lg:items-end">
                          <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {result.rating} pts
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-400 transition disabled:opacity-50"
                              onClick={() => setDeleteConfirmPhoto(result)}
                              disabled={deletingPhotoId === result.id || isMergeTargetPending}
                            >
                              {deletingPhotoId === result.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Removing…
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  Delete photo
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className={`inline-flex items-center gap-2 text-sm font-semibold transition ${
                                isMergeBase
                                  ? "text-orange-400 hover:text-orange-300"
                                  : "text-blue-500 hover:text-blue-400"
                              }`}
                              onClick={() => handleToggleMergeSource(result.id)}
                              disabled={isMergeTargetPending || !canCombinePhotos}
                            >
                              <GitMerge className="w-4 h-4" />
                              {isMergeBase ? "Cancel combine" : "Combine stats"}
                            </button>
                          </div>
                          {canMergeWithBase && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                              onClick={() => handleMergePhotos(result.id)}
                              disabled={isMergeTargetPending}
                            >
                              {isMergeTargetPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Merging…
                                </>
                              ) : (
                                <>
                                  <GitMerge className="w-4 h-4" />
                                  Merge into {mergeSourceIndex >= 0 ? `Photo #${mergeSourceIndex + 1}` : "selection"}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <StatCard label="Wins" value={result.wins} accent="green" />
                        <StatCard label="Losses" value={result.losses} accent="red" />
                        <StatCard label="Battles" value={result.totalVotes} accent="purple" />
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Win rate</p>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                          <span>{winRate}%</span>
                          <span>
                            {result.wins} / {result.totalVotes} duels
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/tools/photo-feedback"
            className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:shadow-lg text-white rounded-lg font-semibold transition-all"
          >
            Create New Battle
          </Link>
        </div>
      </div>
      </div>

      {deleteConfirmPhoto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeleteConfirmPhoto(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Remove this photo?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">This permanently deletes the image and its stats.</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmPhoto(null)}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                <Image src={deleteConfirmPhoto.url} alt="Photo pending delete" fill sizes="400px" className="object-cover" />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmPhoto(null)} disabled={!!deletingPhotoId}>
                Keep photo
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteConfirmPhoto && handleDeletePhoto(deleteConfirmPhoto.id)}
                disabled={!!deletingPhotoId}
              >
                {deletingPhotoId === deleteConfirmPhoto.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                  </>
                ) : (
                  "Delete photo"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: "green" | "red" | "purple" }) {
  const accentMap = {
    green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
    red: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
    purple: "text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${accentMap[accent]} bg-opacity-30`}>
      <p className="text-xs uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  );
}
