"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePhotoFeedback, type UploadProgressEvent } from "@/store/usePhotoFeedback";
import type { PhotoLibraryItem } from "@/store/usePhotoFeedback";
import { Upload, ArrowRight, Heart, Loader2, Copy, ExternalLink, CheckCircle, Shuffle, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import NextImage from "next/image";
import { toastError, toastSuccess, toastWarning } from "@/lib/toast-presets";
import { Button } from "@/components/ui/button";
import { pickRandomPhotoIds } from "@/lib/photoGallery";
import { useInfiniteGallery } from "@/hooks/useInfiniteGallery";
import { PhotoLeaderboard } from "@/components/photo-feedback/PhotoLeaderboard";

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
  const router = useRouter();
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
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<{ current: number; total: number } | null>(null);
  const [galleryPage, setGalleryPage] = useState(0);
  const [photoPendingDelete, setPhotoPendingDelete] = useState<PhotoLibraryItem | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploadJobs, setUploadJobs] = useState<Record<string, UploadProgressEvent>>({});
  const galleryContainerRef = useRef<HTMLDivElement>(null);

  const canCreateSession = !!user && !isAnonymous;

  useEffect(() => {
    if (canCreateSession) {
      void loadUserSessions();
      void loadLibrary();
    }
  }, [canCreateSession, loadLibrary, loadUserSessions]);

  useEffect(() => {
    setSelectedPhotoIds(prev => prev.filter(id => library.some(item => item.id === id)));
  }, [library]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(Math.max(library.length, 1) / PHOTOS_PER_PAGE) - 1);
    if (galleryPage > maxPage) {
      setGalleryPage(maxPage);
    }
  }, [library.length, galleryPage]);

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev =>
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  };

  const handleSelectRandom = () => {
    if (library.length === 0) return;
    const randomSelection = pickRandomPhotoIds(library, 10);
    setSelectedPhotoIds(randomSelection);
    toastSuccess({
      title: "Random selection ready",
      description: `Picked ${randomSelection.length} photo${randomSelection.length === 1 ? '' : 's'} from your gallery.`,
    });
  };

  const totalPages = Math.max(1, Math.ceil(Math.max(library.length, 1) / PHOTOS_PER_PAGE));
  const visiblePhotos = library.slice(0, Math.min(library.length, (galleryPage + 1) * PHOTOS_PER_PAGE));
  const hasMorePhotos = visiblePhotos.length < library.length;
  const hasLeaderboardData = library.some(item => (item.stats?.totalVotes ?? 0) > 0);
  const activeUploadJobs = Object.values(uploadJobs);

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
      setSelectedPhotoIds(prev => [...uploaded.map(item => item.id), ...prev]);
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

  const handleCreateSession = async () => {
    if (!canCreateSession) {
      toastWarning({
        title: "Sign in required",
        description: "Sign in to create a feedback session. Friends can still vote without accounts.",
      });
      return;
    }

    try {
      const { sessionId, secretKey } = await createSessionFromLibrary(
        selectedPhotoIds,
        user?.displayName || undefined
      );
      setSelectedPhotoIds([]);

      router.push(`/tools/photo-feedback/share?sessionId=${sessionId}&secretKey=${secretKey}`);
    } catch (error) {
      const description =
        error instanceof Error && error.message ? error.message : "Please try again in a moment.";
      toastError({
        title: "Could not create session",
        description,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full">
              <Heart className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Dating Photo Feedback
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Friends will see two of your photos at a time and choose the stronger one—automated ELO rankings keep score.
          </p>
        </div>
        {canCreateSession && (
          <Card className="p-6 mb-8 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Your gallery</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your battle automatically uses every photo in your gallery. Selecting is optional if you want to spotlight a subset first.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {uploadStatus && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Uploading {uploadStatus.current}/{uploadStatus.total}
                  </p>
                )}
              </div>
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
                <div
                  ref={galleryContainerRef}
                  className="max-h-[520px] overflow-y-auto pr-1 md:max-h-[640px] lg:max-h-[720px]"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {visiblePhotos.map(item => {
                      const selected = selectedPhotoIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => togglePhotoSelection(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              togglePhotoSelection(item.id);
                            }
                          }}
                          className={`rounded-lg border overflow-hidden text-left transition-all relative group cursor-pointer ${selected
                            ? "border-pink-500 ring-2 ring-pink-300 dark:ring-pink-500/50"
                            : "border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-500/40"
                            }`}
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
                            <NextImage
                              src={item.url}
                              alt="Gallery photo"
                              fill
                              sizes="(max-width: 768px) 25vw, 150px"
                              className="object-cover"
                            />
                            <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-2">
                              {!selected && (
                                <span className="text-[11px] font-semibold text-white/0 group-hover:text-white bg-black/0 group-hover:bg-black/40 px-2 py-1 rounded-full transition-all">
                                  Tap to select
                                </span>
                              )}
                            </div>
                            {selected && (
                              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-pink-500 text-white text-xs font-semibold px-2 py-1">
                                <CheckCircle className="w-3 h-3" />
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <p>Uploaded {new Date(item.createdAt).toLocaleDateString()}</p>
                          {item.stats && item.stats.totalVotes > 0 && (
                            <p className="text-gray-700 dark:text-gray-300">
                              Wins {item.stats.yesVotes} / {item.stats.totalVotes} battles
                            </p>
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
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                          Add more photos
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
                </div>

                {library.length > PHOTOS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-700 dark:text-gray-300">
                    <span>
                      Showing {visiblePhotos.length} of {library.length} photos
                    </span>
                    {hasMorePhotos && (
                      <button
                        type="button"
                        onClick={() => setGalleryPage(Math.min(totalPages - 1, galleryPage + 1))}
                        className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                      >
                        Load more
                      </button>
                    )}
                  </div>
                )}

                {activeUploadJobs.length > 0 && (
                  <div className="mt-6">
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
                          <div
                            key={job.id}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/40 p-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-gray-700 dark:text-gray-200 truncate pr-4">
                                {job.name}
                              </span>
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
                  </div>
                )}
              </>
            )}
          </Card>
        )}
        {canCreateSession && hasLeaderboardData && (
          <div className="mt-8">
            <PhotoLeaderboard photos={library} />
          </div>
        )}
        <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Ready to share</h2>

          {!authLoading && !canCreateSession && (
            <Card className="p-4 mb-6 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700">
              <p className="text-sm text-purple-800 dark:text-purple-100 mb-2">
                You need to be signed in to create a feedback link. Voting stays open to anyone with the link.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm font-semibold text-purple-700 dark:text-purple-200 hover:underline"
              >
                Go to login
              </Link>
            </Card>
          )}

          {canCreateSession && (
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-purple-700 dark:text-purple-200">
              {user?.displayName && (
                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-700">
                  Owner: {user.displayName}
                </span>
              )}
              <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-700">
                Photos selected: {selectedPhotoIds.length}
              </span>
            </div>
          )}
          {canCreateSession && (
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Launching a battle will include every uploaded photo. If you toggle selections above, they’ll be prioritized but not required.
            </p>
          )}

          <button
            onClick={handleCreateSession}
            disabled={!canCreateSession || isLoading}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-4 px-6 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                Launch Photo Battle
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </Card>

        {canCreateSession && (
          <Card className="p-6 bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800 mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Your Photo Battle Link</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">One link per account. Share it anytime for fresh matchups.</p>
              </div>
            {sessionsLoading && (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
            )}
          </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</div>
            )}
            {userSessions.length === 0 && !sessionsLoading ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No battles yet. Launch one above to see it here.</p>
            ) : (
              <div className="space-y-4">
                {userSessions.map((session) => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  const votingLink = `${origin}/tools/photo-feedback/session/${session.id}`;
                  const resultsLink = `${origin}/tools/photo-feedback/results/${session.id}?key=${session.secretKey}`;

                  return (
                    <div key={session.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Battle link</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{session.creatorName || 'Your photos'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created {new Date(session.createdAt).toLocaleString()} • Battle stays active
                  </p>
                </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/tools/photo-feedback/share?sessionId=${session.id}&secretKey=${session.secretKey}`}
                            className="text-sm text-purple-700 dark:text-purple-200 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" /> Manage
                          </Link>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <LinkRow label="Voting link" value={votingLink} />
                        <LinkRow label="Results link" value={resultsLink} sensitive />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

function LinkRow({ label, value, sensitive = false }: { label: string; value: string; sensitive?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toastSuccess({ title: "Copied", description: `${label} copied to clipboard.` });
    } catch {
      toastError({ title: "Copy failed", description: "Please try again." });
    }
  };

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
        <Button variant="outline" size="sm" onClick={copy} type="button">
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
