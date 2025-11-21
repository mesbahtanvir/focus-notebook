"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { CachedImage } from "../components/CachedImage";
import { enqueueUploadJob, UploadManager } from "../upload/UploadManager";
import { compressImageForUpload } from "../upload/imageProcessor";
import { useUploadQueue } from "../upload/useUploadQueue";
import type { UploadJob } from "../upload/types";

interface RemotePhoto {
  id: string;
  originalUrl: string;
  thumbnailUrl?: string;
}

interface PhotoUploaderScreenProps {
  userId: string;
  onPhotoUploaded?: (photo: RemotePhoto) => void;
}

export function PhotoUploaderScreen({ userId, onPhotoUploaded }: PhotoUploaderScreenProps) {
  const [photos, setPhotos] = useState<RemotePhoto[]>([]);
  const uploadQueueState = useUploadQueue(state => ({
    jobs: state.jobs,
    order: state.order,
  }));
  const managerRef = useRef<UploadManager | null>(null);

  useEffect(() => {
    const manager = new UploadManager({
      onJobComplete: async (job, downloadUrl) => {
        const photo: RemotePhoto = {
          id: job.id,
          originalUrl: downloadUrl,
        };
        setPhotos(prev => [photo, ...prev]);
        onPhotoUploaded?.(photo);
      },
    });
    manager.start();
    managerRef.current = manager;
    return () => manager.stop();
  }, [onPhotoUploaded]);

  const activeJobs = useMemo(() => {
    return uploadQueueState.order
      .map(id => uploadQueueState.jobs[id])
      .filter(Boolean)
      .filter(job => job?.status !== "completed") as UploadJob[];
  }, [uploadQueueState]);

  const handleSelectPhotos = async () => {
    const result = await launchImageLibrary({ mediaType: "photo", selectionLimit: 10 });
    if (result.didCancel || !result.assets?.length) {
      return;
    }

    for (const asset of result.assets) {
      if (!asset.uri) continue;
      const processed = await compressImageForUpload(asset.uri);
      const fileName = asset.fileName ?? `${Date.now()}.jpg`;
      enqueueUploadJob({
        localUri: processed.uri,
        storagePath: `images/original/${userId}/${Date.now()}-${fileName}`,
        mimeType: asset.type ?? "image/jpeg",
        metadata: { userId, name: fileName },
      });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.primaryButton} onPress={handleSelectPhotos}>
        <Text style={styles.primaryButtonText}>Add photos</Text>
      </TouchableOpacity>

      {activeJobs.length > 0 && (
        <View style={styles.uploadQueue}>
          <Text style={styles.queueTitle}>Background uploads</Text>
          {activeJobs.map(job => {
            const percent = Math.round((job.progress ?? 0) * 100);
            return (
              <View key={job.id} style={styles.queueItem}>
                <View style={styles.queueRow}>
                  <Text style={styles.queueLabel}>{job.metadata?.name ?? job.id}</Text>
                  <Text style={styles.queuePercent}>{percent}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${percent}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <FlatList
        data={photos}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.gallery}
        renderItem={({ item }) => (
          <View style={styles.photoCard}>
            <CachedImage fullUrl={item.originalUrl} thumbUrl={item.thumbnailUrl} style={styles.photo} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Upload a few photos to get started.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
    backgroundColor: "#f8f0ff",
  },
  primaryButton: {
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#7c3aed",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  uploadQueue: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  queueTitle: {
    fontWeight: "600",
    color: "#1f2933",
    marginBottom: 12,
  },
  queueItem: {
    marginBottom: 12,
  },
  queueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  queueLabel: {
    color: "#334155",
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  queuePercent: {
    color: "#9333ea",
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
  },
  gallery: {
    padding: 24,
    gap: 12,
  },
  photoCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#fff",
    margin: 6,
    overflow: "hidden",
  },
  photo: {
    height: 180,
    width: "100%",
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
  },
});
