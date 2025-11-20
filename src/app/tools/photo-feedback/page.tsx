"use client";

import { useEffect, useRef, useState } from "react";
import { usePhotoFeedback, type UploadProgressEvent } from "@/store/usePhotoFeedback";
import type { PhotoLibraryItem, LinkHistoryEntry } from "@/store/usePhotoFeedback";
import { Upload, ArrowRight, Loader2, Copy, ExternalLink, CheckCircle, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import NextImage from "next/image";
import { toastError, toastSuccess, toastWarning } from "@/lib/toast-presets";
import { Button } from "@/components/ui/button";
import { useInfiniteGallery } from "@/hooks/useInfiniteGallery";

const PHOTOS_PER_PAGE = 8;
const MAX_IMAGE_DIMENSION = 1024;

async function resizeImageIfNeeded(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (file.type === "image/gif") return file;

  return new Promise<File>((resolve, reject) => {
    const img = typeof window !== "undefined" && window.Image ? new window.Image() : document.createElement("img");
    const cleanup = () => {
      URL.revokeObjectURL(img.src);
    };

    img.onload = () => {
      let { width, height } = img;
      if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
        cleanup();
        resolve(file);
        return;
      }

      if (width >= height) {
        const scale = MAX_IMAGE_DIMENSION / width;
        width = MAX_IMAGE_DIMENSION;
        height = Math.round(height * scale);
      } else {
        const scale = MAX_IMAGE_DIMENSION / height;
        height = MAX_IMAGE_DIMENSION;
        width = Math.round(width * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Unable to resize image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            reject(new Error("Failed to process image"));
            return;
          }
          resolve(new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, ".jpg"), { type: "image/jpeg", lastModified: Date.now() }));
        },
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => {
      cleanup();
      reject(new Error("Unable to load image for resizing"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function PhotoFeedbackPage() {
  const {
    createSessionFromLibrary,
    uploadToLibrary,
    loadLibrary,
    library,
    libraryLoading,
    deleteLibraryPhoto,
    isLoading,
    userSessions,
    sessionsLoading,
    loadUserSessions,
    error,
  } = usePhotoFeedback();
  const { user, isAnonymous, loading: authLoading } = useAuth();

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per storage.rules
  const [uploadStatus, setUploadStatus] = useState<{ current: number; total: number } | null>(null);
  const [galleryPage, setGalleryPage] = useState(0);
  const [photoPendingDelete, setPhotoPendingDelete] = useState<PhotoLibraryItem | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploadJobs, setUploadJobs] = useState<Record<string, UploadProgressEvent>>({});
  const galleryContainerRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState("");
  const [votingLinkCopied, setVotingLinkCopied] = useState(false);
  const [resultsLinkCopied, setResultsLinkCopied] = useState(false);

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

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(Math.max(library.length, 1) / PHOTOS_PER_PAGE) - 1);
    if (galleryPage > maxPage) {
      setGalleryPage(maxPage);
    }
  }, [library.length, galleryPage]);

  const visiblePhotos = library.slice(0, Math.min(library.length, (galleryPage + 1) * PHOTOS_PER_PAGE));
  const hasLeaderboardData = library.some(item => (item.stats?.totalVotes ?? 0) > 0);
  const activeUploadJobs = Object.values(uploadJobs);
  const battle = userSessions[0] ?? null;
  const totalBattleVotes = battle ? battle.photos.reduce((sum, photo) => sum + (photo.totalVotes ?? 0), 0) : 0;
  const totalBattlePhotos = battle ? battle.photos.length : library.length;
  const averageBattlesPerPhoto = totalBattlePhotos > 0 ? Math.round(totalBattleVotes / totalBattlePhotos) : 0;
  const topBattlePhotos = battle ? [...battle.photos].sort((a, b) => b.rating - a.rating).slice(0, 3) : [];
  const galleryPreview = library.slice(0, 6);
  const photosNeedingVotes = battle ? battle.photos.filter(photo => (photo.totalVotes ?? 0) < 5).length : 0;
  const votingLink = battle && origin ? `${origin}/tools/photo-feedback/session/${battle.id}` : "";
  const resultsLink = battle && origin ? `${origin}/tools/photo-feedback/results/${battle.id}?key=${battle.secretKey}` : "";
  const linkHistory = (battle?.linkHistory ?? []) as LinkHistoryEntry[];
  const linkExpiresLabel = battle?.linkExpiresAt ? new Date(battle.linkExpiresAt).toLocaleString() : "Not set";
  const qrSrc = votingLink ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(votingLink)}` : "";
  const lastVoteLabel = battle ? (battle.updatedAt ? new Date(battle.updatedAt).toLocaleString() : "No votes yet") : "";

  useInfiniteGallery({
    items: library,
    pageSize: PHOTOS_PER_PAGE,
    currentPage: galleryPage,
    setCurrentPage: setGalleryPage,
    containerRef: galleryContainerRef,
  });

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    try {
      await deleteLibraryPhoto(photoId);
      toastSuccess({ title: "Photo removed", description: "This image has been removed from your gallery." });
    } catch (error) {
      toastError({
        title: "Could not delete photo",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeletingPhotoId(null);
      setPhotoPendingDelete(null);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const oversized = imageFiles.filter(file => file.size > MAX_FILE_SIZE);

    if (oversized.length > 0) {
      toastError({
        title: "Photo too large",
        description: "Each photo must be under 10MB.",
      });
      return;
    }

    try {
      const processed = await Promise.all(imageFiles.map(resizeImageIfNeeded));
      setUploadStatus({ current: 0, total: processed.length });
      const uploaded = await uploadToLibrary(
        processed,
        (current, total) => {
          setUploadStatus({ current, total });
        },
        event => {
          setUploadJobs(prev => ({
            ...prev,
            [event.id]: event,
          }));

          if (event.status === "completed") {
            setTimeout(() => {
              setUploadJobs(current => {
                if (!current[event.id] || current[event.id].status !== "completed") {
                  return current;
                }
                const { [event.id]: _done, ...rest } = current;
                return rest;
              });
            }, 4000);
          }
        }
      );
      toastSuccess({
        title: "Gallery updated",
        description: `${processed.length} photo${processed.length > 1 ? 's' : ''} added.`,
      });
    } catch (err) {
      const description =
        err instanceof Error && err.message
          ? err.message
          : "Could not add photos to your gallery.";
      toastError({
        title: "Upload failed",
        description,
      });
    } finally {
      setUploadStatus(null);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Gallery preview</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {library.length} photo{library.length === 1 ? "" : "s"} in rotation
                </p>
              </div>
              <label
                htmlFor="gallery-upload"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-purple-600 text-white text-sm font-semibold cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Upload
              </label>
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
            <button
              type="button"
              onClick={() => document.getElementById("gallery-manager")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-4 text-sm font-semibold text-purple-600 dark:text-purple-300 hover:underline"
            >
              Manage gallery
            </button>
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
          <>
            <Card className="p-6 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Share with friends</p>
                  <LinkRow
                    label="Voting link"
                    value={votingLink}
                    copied={votingLinkCopied}
                    onCopy={() => copyLink(votingLink, setVotingLinkCopied)}
                  />
                  <LinkRow
                    label="Results link"
                    value={resultsLink}
                    sensitive
                    copied={resultsLinkCopied}
                    onCopy={() => copyLink(resultsLink, setResultsLinkCopied)}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Link expires {linkExpiresLabel}. Renewing refreshes the URL without removing past votes.
                  </p>
                </div>
                {qrSrc && (
                  <div className="mt-6 md:mt-0 flex justify-center">
                    <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-950">
                      <NextImage src={qrSrc} alt="QR code for battle link" width={160} height={160} className="h-36 w-36" unoptimized />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40">
              <div className={`grid gap-4 ${photosNeedingVotes > 0 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
                <StatChip label="Total votes" value={totalBattleVotes} />
                <StatChip label="Avg battles / photo" value={averageBattlesPerPhoto} />
                <StatChip label="Photos in battle" value={totalBattlePhotos} />
                {photosNeedingVotes > 0 && <StatChip label="Need more votes" value={photosNeedingVotes} />}
              </div>
            </Card>

            {linkHistory.length > 0 && (
              <Card className="p-6 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Past links</p>
                <div className="space-y-3">
                  {linkHistory.map((entry, index) => (
                    <div key={`${entry.secretKey}-${index}`} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Secret key ending in …{entry.secretKey.slice(-4)} • Expired{" "}
                          {entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-purple-600 dark:text-purple-300 hover:underline"
                        onClick={() => copyLink(`${origin}/tools/photo-feedback/results/${battle.id}?key=${entry.secretKey}`)}
                      >
                        Copy results link
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
        {canCreateSession && (
          <Card id="gallery-manager" className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Manage gallery</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Every uploaded photo enters the battle automatically. Remove an image here if you don&apos;t want it ranked.
                </p>
              </div>
              {uploadStatus && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Uploading {uploadStatus.current}/{uploadStatus.total}
                </p>
              )}
            </div>

            {library.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your gallery is empty. Upload photos below to get started.
                </p>
                <label
                  htmlFor="gallery-upload"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg cursor-pointer bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <Upload className="w-8 h-8 text-purple-500 mb-2" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB each</p>
                  </div>
                  <input
                    id="gallery-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    disabled={libraryLoading}
                  />
                </label>
              </div>
            ) : (
              <>
                <div ref={galleryContainerRef} className="max-h-[520px] overflow-y-auto pr-1 md:max-h-[640px] lg:max-h-[720px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {visiblePhotos.map(item => {
                      const totalVotes = item.stats?.totalVotes ?? 0;
                      const winRate = totalVotes > 0 ? Math.round(((item.stats?.yesVotes ?? 0) / totalVotes) * 100) : null;
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border overflow-hidden text-left transition-shadow relative group border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoPendingDelete(item);
                            }}
                            className="absolute top-2 left-2 z-10 inline-flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 w-7 h-7 transition"
                            aria-label="Remove photo from gallery"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
                            <NextImage src={item.url} alt="Gallery photo" fill sizes="(max-width: 768px) 25vw, 150px" className="object-cover" />
                            {totalVotes > 0 && (
                              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 text-white text-xs font-semibold px-2 py-1">
                                {winRate !== null ? `${winRate}% win` : `${totalVotes} votes`}
                              </span>
                            )}
                          </div>
                          <div className="p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <p>Uploaded {new Date(item.createdAt).toLocaleDateString()}</p>
                            {totalVotes > 0 ? (
                              <p className="text-gray-700 dark:text-gray-300">
                                {item.stats?.yesVotes ?? 0} wins • {totalVotes} total votes
                              </p>
                            ) : (
                              <p className="text-gray-500 dark:text-gray-400">Waiting for first votes</p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <label
                      htmlFor="gallery-upload"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg cursor-pointer bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <Upload className="w-8 h-8 text-purple-500 mb-2" />
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Add more photos</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB each</p>
                      </div>
                      <input
                        id="gallery-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryUpload}
                        disabled={libraryLoading}
                      />
                    </label>
                  </div>
                </div>
                {library.length > PHOTOS_PER_PAGE && (
                  <div className="flex items-center justify-end mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Showing {visiblePhotos.length} of {library.length} photos
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {activeUploadJobs.length > 0 && (
          <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Upload queue</p>
            <div className="space-y-2">
              {activeUploadJobs.map(job => {
                const progressPercent = Math.round(job.progress * 100);
                const statusLabel =
                  job.status === "completed"
                    ? "Completed"
                    : job.status === "failed"
                      ? "Failed"
                      : `Uploading • ${progressPercent}%`;
                const statusClass =
                  job.status === "failed"
                    ? "text-red-600 dark:text-red-400"
                    : job.status === "completed"
                      ? "text-green-600 dark:text-green-400"
                      : "text-purple-600 dark:text-purple-300";

                return (
                  <div key={job.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/40 p-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700 dark:text-gray-200 truncate pr-4">{job.name}</span>
                      <span className={`font-medium ${statusClass}`}>{statusLabel}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          job.status === "failed"
                            ? "bg-red-500"
                            : job.status === "completed"
                              ? "bg-green-500"
                              : "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"
                        }`}
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                      />
                    </div>
                    {job.status === "failed" && job.error && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">{job.error}</p>
                    )}
                  </div>
                );
              })}
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
      {photoPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPhotoPendingDelete(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Remove photo?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This deletes the image and its stats everywhere. You can&apos;t undo this action.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPendingDelete(null)}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                aria-label="Close delete dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg overflow-hidden mb-4 border border-gray-200 dark:border-gray-700">
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                <NextImage
                  src={photoPendingDelete.url}
                  alt="Photo selected for deletion"
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (deletingPhotoId) return;
                  setPhotoPendingDelete(null);
                }}
                disabled={!!deletingPhotoId}
              >
                Keep photo
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                onClick={() => {
                  if (!photoPendingDelete || deletingPhotoId) return;
                  void handleDeletePhoto(photoPendingDelete.id);
                }}
                disabled={!!deletingPhotoId}
              >
                {deletingPhotoId === photoPendingDelete.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete photo"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkRow({
  label,
  value,
  sensitive = false,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  sensitive?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        {sensitive && <span className="text-[10px] text-orange-600 dark:text-orange-400">Keep private</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={value}
          className="flex-1 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200"
        />
        <Button variant="outline" size="sm" onClick={onCopy} type="button" disabled={!value}>
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
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
