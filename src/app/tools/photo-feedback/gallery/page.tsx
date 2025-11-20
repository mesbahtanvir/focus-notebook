"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { ArrowLeft, Upload, Trash2, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast-presets";
import { usePhotoFeedback, type PhotoLibraryItem, type UploadProgressEvent } from "@/store/usePhotoFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteGallery } from "@/hooks/useInfiniteGallery";

const PHOTOS_PER_PAGE = 9;
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

export default function GalleryManagerPage() {
  const {
    uploadToLibrary,
    loadLibrary,
    library,
    libraryLoading,
    deleteLibraryPhoto,
  } = usePhotoFeedback();
  const { user, isAnonymous } = useAuth();
  const canManage = !!user && !isAnonymous;

  const [uploadStatus, setUploadStatus] = useState<{ current: number; total: number } | null>(null);
  const [galleryPage, setGalleryPage] = useState(0);
  const [photoPendingDelete, setPhotoPendingDelete] = useState<PhotoLibraryItem | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploadJobs, setUploadJobs] = useState<Record<string, UploadProgressEvent>>({});
  const galleryContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canManage) {
      void loadLibrary();
    }
  }, [canManage, loadLibrary]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(Math.max(library.length, 1) / PHOTOS_PER_PAGE) - 1);
    if (galleryPage > maxPage) {
      setGalleryPage(maxPage);
    }
  }, [library.length, galleryPage]);

  useInfiniteGallery({
    items: library,
    pageSize: PHOTOS_PER_PAGE,
    currentPage: galleryPage,
    setCurrentPage: setGalleryPage,
    containerRef: galleryContainerRef,
  });

  const visiblePhotos = library.slice(0, Math.min(library.length, (galleryPage + 1) * PHOTOS_PER_PAGE));
  const activeUploadJobs = Object.values(uploadJobs);

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
      const processed = await Promise.all(imageFiles.map(resizeImageIfNeeded));
      setUploadStatus({ current: 0, total: processed.length });
      await uploadToLibrary(
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
        description: `${processed.length} photo${processed.length > 1 ? "s" : ""} added.`,
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

  const renderGallery = () => {
    if (!canManage) {
      return (
        <Card className="p-6 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Sign in required</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Uploading photos and editing your gallery require a full account. Head back to the battle dashboard and sign in to keep curating your images.
          </p>
          <Link
            href="/tools/photo-feedback"
            className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-purple-600 text-white text-sm font-semibold"
          >
            Return to dashboard
          </Link>
        </Card>
      );
    }

    return (
      <Card className="p-6 bg-white dark:bg-gray-900 border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Manage gallery</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Every upload joins the battle automatically. Remove a photo here if you don&apos;t want it ranked.
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
            <div ref={galleryContainerRef} className="max-h-[620px] overflow-y-auto pr-1">
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
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-purple-500 dark:text-purple-200 mb-1">Gallery manager</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Curate your battle photos</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload new shots, remove stale ones, and see vote stats for each image without leaving the dashboard.
            </p>
          </div>
          <Link
            href="/tools/photo-feedback"
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-300 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to battle overview
          </Link>
        </div>

        {renderGallery()}

        {canManage && activeUploadJobs.length > 0 && (
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
