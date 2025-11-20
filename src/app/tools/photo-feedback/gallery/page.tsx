"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { ArrowLeft, Upload, Trash2, X, Loader2, CheckCircle2, Circle, AlertTriangle, GitMerge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast-presets";
import { usePhotoFeedback, type PhotoLibraryItem, type UploadProgressEvent } from "@/store/usePhotoFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteGallery } from "@/hooks/useInfiniteGallery";

const PHOTOS_PER_PAGE = 18;
const MAX_IMAGE_DIMENSION = 1024;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
        blob => {
          cleanup();
          if (!blob) {
            reject(new Error("Failed to process image"));
            return;
          }
          resolve(
            new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
          );
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

export default function GalleryManagerPage() {
  const {
    uploadToLibrary,
    loadLibrary,
    library,
    libraryLoading,
    deleteLibraryPhoto,
    deleteAllLibraryPhotos,
    mergeSessionPhotos,
    loadSession,
  } = usePhotoFeedback();
  const { user, isAnonymous } = useAuth();
  const canManage = !!user && !isAnonymous;
  const sessionId = user?.uid;

  const [uploadStatus, setUploadStatus] = useState<{ current: number; total: number } | null>(null);
  const [galleryPage, setGalleryPage] = useState(0);
  const [photoPendingDelete, setPhotoPendingDelete] = useState<PhotoLibraryItem | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploadJobs, setUploadJobs] = useState<Record<string, UploadProgressEvent>>({});
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"selected" | "all" | "poor" | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isDeletingPoor, setIsDeletingPoor] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoLibraryItem | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null);

  const galleryContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (canManage) {
      void loadLibrary();
      if (sessionId) {
        void loadSession(sessionId).catch(err => {
          console.error("Failed to load session for merging:", err);
        });
      }
    }
  }, [canManage, loadLibrary, loadSession, sessionId]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(Math.max(library.length, 1) / PHOTOS_PER_PAGE) - 1);
    if (galleryPage > maxPage) {
      setGalleryPage(maxPage);
    }
  }, [library.length, galleryPage]);

  useEffect(() => {
    setSelectedPhotoIds(prev => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      library.forEach(photo => {
        if (prev.has(photo.id)) {
          next.add(photo.id);
        }
      });
      return next;
    });
  }, [library]);

  useEffect(() => {
    // Reset zoom whenever a new photo is opened
    setPreviewZoom(1);
    if (!previewPhoto) {
      setPreviewDimensions(null);
      return;
    }
    let active = true;
    const img = new Image();
    img.src = previewPhoto.url;
    img.onload = () => {
      if (!active) return;
      const width = img.naturalWidth || 1;
      const height = img.naturalHeight || 1;
      setPreviewDimensions({ width, height });
    };
    img.onerror = () => {
      if (!active) return;
      setPreviewDimensions(null);
    };
    return () => {
      active = false;
    };
  }, [previewPhoto]);

  useInfiniteGallery({
    items: library,
    pageSize: PHOTOS_PER_PAGE,
    currentPage: galleryPage,
    setCurrentPage: setGalleryPage,
    containerRef: galleryContainerRef,
  });

  const visiblePhotos = library.slice(0, Math.min(library.length, (galleryPage + 1) * PHOTOS_PER_PAGE));
  const activeUploadJobs = Object.values(uploadJobs);
  const selectedCount = selectedPhotoIds.size;
  const allSelected = library.length > 0 && selectedCount === library.length;
  const poorPerformers = library.filter(photo => {
    const totalVotes = photo.stats?.totalVotes ?? 0;
    const yesVotes = photo.stats?.yesVotes ?? 0;
    return totalVotes >= 5 && yesVotes === 0;
  });
  const poorCount = poorPerformers.length;

  const togglePhotoSelection = (photoId: string) => {
    if (!canManage) return;
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!canManage || library.length === 0) return;
    if (allSelected) {
      setSelectedPhotoIds(new Set());
      return;
    }
    setSelectedPhotoIds(new Set(library.map(photo => photo.id)));
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!canManage) return;
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
      setSelectedPhotoIds(prev => {
        if (!prev.has(photoId)) return prev;
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!canManage || selectedCount === 0) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedPhotoIds);
      for (const id of ids) {
        await deleteLibraryPhoto(id);
      }
      toastSuccess({
        title: "Photos removed",
        description: `${ids.length} photo${ids.length === 1 ? "" : "s"} deleted from your gallery.`,
      });
      setSelectedPhotoIds(new Set());
    } catch (error) {
      toastError({
        title: "Bulk delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsBulkDeleting(false);
      setBulkAction(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!canManage || library.length === 0) return;
    setIsDeletingAll(true);
    try {
      await deleteAllLibraryPhotos();
      toastSuccess({ title: "Gallery cleared", description: "All photos have been removed." });
      setSelectedPhotoIds(new Set());
    } catch (error) {
      toastError({
        title: "Delete all failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeletingAll(false);
      setBulkAction(null);
    }
  };

  const handleMergeSelected = async () => {
    if (!canManage || selectedCount < 2 || !sessionId) return;
    const [targetId, mergedId] = Array.from(selectedPhotoIds);
    setIsMerging(true);
    try {
      await mergeSessionPhotos(sessionId, targetId, mergedId);
      toastSuccess({
        title: "Photos merged",
        description: "The stats have been combined and the duplicate removed.",
      });
      setSelectedPhotoIds(new Set([targetId]));
    } catch (error) {
      toastError({
        title: "Merge failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsMerging(false);
    }
  };

  const handleDeletePoorPerformers = async () => {
    if (!canManage || poorCount === 0) return;
    setIsDeletingPoor(true);
    try {
      for (const photo of poorPerformers) {
        await deleteLibraryPhoto(photo.id);
      }
      toastSuccess({
        title: "Poor performers removed",
        description: `${poorCount} photo${poorCount === 1 ? "" : "s"} with zero wins deleted.`,
      });
      setSelectedPhotoIds(prev => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        poorPerformers.forEach(photo => next.delete(photo.id));
        return next;
      });
    } catch (error) {
      toastError({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeletingPoor(false);
      setBulkAction(null);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManage) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    const oversized = imageFiles.filter(file => file.size > MAX_FILE_SIZE);

    if (oversized.length > 0) {
      toastError({
        title: "Photo too large",
        description: "Each photo must be under 10MB.",
      });
      return;
    }

    try {
      const processedPairs = await Promise.all(
        imageFiles.map(async file => resizeImageIfNeeded(file))
      );
      setUploadStatus({ current: 0, total: processedPairs.length });
      await uploadToLibrary(
        processedPairs,
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
        description: `${processedPairs.length} photo${processedPairs.length > 1 ? "s" : ""} added.`,
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const galleryHeaderDescription = library.length === 0
    ? "Grab the floating button to add your first shots."
    : "Tap images to select them, then clean up or clear everything in a couple clicks.";

  const summaryLabel = selectedCount > 0
    ? `${selectedCount} selected`
    : `${library.length} photo${library.length === 1 ? "" : "s"}`;

  const showUploadQueue = canManage && activeUploadJobs.length > 0;

  const confirmBulkAction = () => {
    if (bulkAction === "selected") {
      void handleBulkDelete();
    } else if (bulkAction === "all") {
      void handleDeleteAll();
    } else if (bulkAction === "poor") {
      void handleDeletePoorPerformers();
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 text-slate-900 dark:from-slate-950 dark:via-purple-950/60 dark:to-slate-900 dark:text-white">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleGalleryUpload}
        disabled={libraryLoading}
      />

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur px-6 pt-10 pb-6 dark:border-white/10 dark:bg-slate-950/80">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-purple-600 dark:text-purple-300/80">Gallery Manager</p>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Curate your battle photos</h1>
              <p className="text-sm text-slate-600 dark:text-purple-100/80 max-w-2xl">{galleryHeaderDescription}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="text-slate-700 border-slate-200 dark:text-white dark:border-white/20"
                asChild
              >
                <Link href="/tools/photo-feedback" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to overview
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-slate-700 border-slate-200 dark:text-white dark:border-white/30"
                onClick={handleSelectAll}
                disabled={!canManage || library.length === 0}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
              <Button
                variant="ghost"
                className="text-slate-500 hover:text-slate-700 dark:text-white/70 dark:hover:text-white"
                onClick={handleClearSelection}
                disabled={selectedCount === 0}
              >
                Clear selection
              </Button>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => setBulkAction("selected")}
                disabled={selectedCount === 0 || isBulkDeleting}
              >
                Delete selected
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-300 dark:border-red-400/40 dark:hover:bg-red-400/10"
                onClick={() => setBulkAction("all")}
                disabled={library.length === 0 || isDeletingAll}
              >
                Delete all
              </Button>
              <Button
                variant="outline"
                className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-200 dark:border-purple-400/40 dark:hover:bg-purple-400/10"
                onClick={handleMergeSelected}
                disabled={!canManage || selectedCount < 2 || isMerging || !sessionId}
              >
                <GitMerge className="h-4 w-4 mr-2" />
                Merge selected
              </Button>
              <Button
                variant="outline"
                className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-400/40 dark:hover:bg-amber-400/10"
                onClick={() => setBulkAction("poor")}
                disabled={poorCount === 0 || isDeletingPoor}
              >
                Delete poor performers
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-24">
          {!canManage ? (
            <Card className="mx-auto max-w-3xl border border-slate-200 bg-white p-8 text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-white">
              <p className="text-lg font-semibold mb-2">Sign in required</p>
              <p className="text-sm text-slate-600 dark:text-white/80">
                Uploading photos and editing your gallery require a full account. Head back to the battle dashboard and
                sign in to keep curating your images.
              </p>
              <Button
                asChild
                className="mt-6 bg-purple-600 text-white hover:bg-purple-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
              >
                <Link href="/tools/photo-feedback">Return to dashboard</Link>
              </Button>
            </Card>
          ) : (
            <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-white/5 dark:backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/10">
                <div className="text-sm text-slate-600 dark:text-white/70">
                  {summaryLabel}
                  {uploadStatus && (
                    <span className="ml-3 inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700 dark:bg-white/10 dark:text-white">
                      Uploading {uploadStatus.current}/{uploadStatus.total}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-white/60">
                  Scroll to load more • Showing {visiblePhotos.length} of {library.length}
                </div>
              </div>
              <div
                ref={galleryContainerRef}
                className="flex-1 overflow-y-auto px-6 pb-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {library.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-slate-600 dark:text-white/80">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">Your gallery is empty</p>
                    <p className="max-w-md text-sm">
                      Use the floating action button in the corner to start uploading photos. They will automatically be
                      added to your battle.
                    </p>
                    <Button
                      className="bg-purple-600 text-white hover:bg-purple-700 dark:bg-white/10 dark:hover:bg-white/20"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" /> Upload photos
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 pt-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {visiblePhotos.map(item => {
                      const totalVotes = item.stats?.totalVotes ?? 0;
                      const winRate = totalVotes > 0 ? Math.round(((item.stats?.yesVotes ?? 0) / totalVotes) * 100) : null;
                      const sessionCount = item.stats?.sessionCount ?? 0;
                      const isSelected = selectedPhotoIds.has(item.id);
                      const gridUrl = item.url;

                      return (
                        <div
                          key={item.id}
                          className={`group relative overflow-hidden rounded-3xl border bg-white/80 text-left text-gray-900 transition-all dark:bg-slate-900/70 ${
                            isSelected ? "border-purple-400 ring-2 ring-purple-300/60" : "border-white/0"
                          }`}
                          onClick={() => setPreviewPhoto(item)}
                          role="presentation"
                        >
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              togglePhotoSelection(item.id);
                            }}
                            className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border text-white transition ${
                              isSelected ? "bg-purple-600 border-purple-500" : "bg-black/40 border-white/30"
                            }`}
                            aria-label={isSelected ? "Deselect photo" : "Select photo"}
                          >
                            {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setPhotoPendingDelete(item);
                            }}
                            className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
                            aria-label="Delete photo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="relative aspect-[3/4] w-full bg-slate-900">
                            <NextImage
                              src={gridUrl}
                              alt="Gallery photo"
                              fill
                              sizes="(max-width: 768px) 50vw, 240px"
                              className="object-cover"
                            />
                            {winRate !== null && (
                              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                                {winRate}% win • {totalVotes} votes
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 border-t border-white/10 p-4 text-xs text-gray-600 dark:text-gray-300">
                            <p className="font-semibold text-gray-900 dark:text-gray-50">
                              Uploaded {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                            {totalVotes > 0 ? (
                              <p>
                                In {sessionCount} session{sessionCount === 1 ? "" : "s"} • {totalVotes} battle
                                {totalVotes === 1 ? "" : "s"}
                              </p>
                            ) : (
                              <p className="text-gray-500">No votes yet</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showUploadQueue && (
                  <Card className="mt-8 bg-white/90 text-gray-900 dark:bg-slate-900/80 dark:text-white">
                    <p className="text-sm font-semibold mb-3">Upload queue</p>
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
                            ? "text-red-600"
                            : job.status === "completed"
                              ? "text-green-600"
                              : "text-purple-600";

                        return (
                          <div key={job.id} className="rounded-2xl border border-white/10 bg-white/60 dark:bg-white/10 p-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold truncate pr-4">{job.name}</span>
                              <span className={`font-medium ${statusClass}`}>{statusLabel}</span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
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
                              <p className="mt-2 text-xs text-red-600">{job.error}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {canManage && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-5 py-3 text-base font-semibold shadow-2xl transition hover:scale-105"
        >
          <Upload className="h-5 w-5" /> Upload photos
        </button>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => setPreviewPhoto(null)} aria-hidden />
          <div className="relative z-10 w-full max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl bg-black/80 shadow-2xl">
              <button
                type="button"
                className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                onClick={() => setPreviewPhoto(null)}
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
              <div
                className="relative w-full overflow-auto bg-black/60 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                onWheel={event => {
                  if (!previewPhoto) return;
                  if (!event.ctrlKey && !event.metaKey) return;
                  event.preventDefault();
                  const delta = -event.deltaY * 0.0015;
                  setPreviewZoom(prev => Math.min(4, Math.max(1, prev + delta)));
                }}
                onDoubleClick={() =>
                  setPreviewZoom(prev => {
                    if (prev < 1.6) return 2;
                    if (prev < 2.6) return 3;
                    return 1;
                  })
                }
                style={{
                  touchAction: "pinch-zoom pan-x pan-y",
                  maxHeight: "80vh",
                  aspectRatio: previewDimensions
                    ? `${previewDimensions.width} / ${previewDimensions.height}`
                    : "4 / 3",
                }}
              >
                <div className="flex h-full w-full items-center justify-center p-4" role="presentation">
                  <NextImage
                    src={previewPhoto.url}
                    alt="Large preview"
                    width={1920}
                    height={1200}
                    draggable={false}
                    className="select-none rounded-2xl bg-black/40"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      transform: `scale(${previewZoom})`,
                      transformOrigin: "center center",
                      transition: "transform 150ms ease",
                    }}
                    sizes="90vw"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {photoPendingDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPhotoPendingDelete(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-slate-900 dark:text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Remove this photo?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action permanently deletes the image and its stats.</p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPendingDelete(null)}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-5">
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                <NextImage src={photoPendingDelete.url} alt="Photo selected for deletion" fill sizes="400px" className="object-cover" />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setPhotoPendingDelete(null)} disabled={!!deletingPhotoId}>
                Keep photo
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => photoPendingDelete && !deletingPhotoId && handleDeletePhoto(photoPendingDelete.id)}
                disabled={!!deletingPhotoId}
              >
                {deletingPhotoId === photoPendingDelete.id ? (
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

      {canManage && bulkAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setBulkAction(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-slate-900 dark:text-white">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-semibold">
                {bulkAction === "selected"
                  ? "Delete selected photos?"
                  : bulkAction === "poor"
                    ? "Delete poor performers?"
                    : "Delete entire gallery?"}
              </h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {bulkAction === "selected"
                ? `This will permanently delete ${selectedCount} photo${selectedCount === 1 ? "" : "s"}.`
                : bulkAction === "poor"
                  ? `This removes ${poorCount} photo${poorCount === 1 ? "" : "s"} that never won despite at least five battles.`
                  : "This removes every image and its stats. You can't undo this."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBulkAction(null)}
                disabled={isBulkDeleting || isDeletingAll || isDeletingPoor}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmBulkAction}
                disabled={
                  (bulkAction === "selected" && isBulkDeleting) ||
                  (bulkAction === "all" && isDeletingAll) ||
                  (bulkAction === "poor" && isDeletingPoor)
                }
              >
                {(bulkAction === "selected" && isBulkDeleting) ||
                (bulkAction === "all" && isDeletingAll) ||
                (bulkAction === "poor" && isDeletingPoor) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Working…
                  </>
                ) : (
                  bulkAction === "selected"
                    ? "Delete selected"
                    : bulkAction === "poor"
                      ? "Delete poor performers"
                      : "Delete all"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
