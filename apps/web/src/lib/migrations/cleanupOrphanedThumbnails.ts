/**
 * Migration: Clean up orphaned thumbnails and fix photo battle consistency
 *
 * This migration:
 * 1. Removes photos from battle sessions if their library entry is deleted
 * 2. Cleans up orphaned thumbnail files in storage
 * 3. Ensures all photo deletions are complete across the system
 *
 * Run this once to fix existing data inconsistencies.
 */

import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { ref, listAll, getMetadata, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebaseClient';

interface MigrationResult {
  orphanedThumbnailsDeleted: number;
  photoBattlesFixed: number;
  errors: string[];
}

export async function cleanupOrphanedThumbnails(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    orphanedThumbnailsDeleted: 0,
    photoBattlesFixed: 0,
    errors: [],
  };

  console.log(`[Migration] Starting cleanup for user ${userId}`);

  try {
    // Step 1: Get all library photos to build a map of valid photo IDs
    const libraryRef = collection(db, `users/${userId}/photoLibrary`);
    const librarySnaps = await getDocs(libraryRef);
    const validPhotoIds = new Set(librarySnaps.docs.map(doc => doc.id));
    const validStoragePaths = new Set<string>();

    librarySnaps.docs.forEach(doc => {
      const data = doc.data();
      if (data.storagePath) validStoragePaths.add(data.storagePath);
      if (data.thumbnailPath) validStoragePaths.add(data.thumbnailPath);
    });

    console.log(`[Migration] Found ${validPhotoIds.size} valid library photos`);

    // Step 2: Fix photo battles - remove photos with deleted library entries
    const battlesRef = collection(db, 'photoBattles');
    const battlesQuery = query(battlesRef, where('ownerId', '==', userId));
    const battleSnaps = await getDocs(battlesQuery);

    for (const battleDoc of battleSnaps.docs) {
      const battleData = battleDoc.data();
      const photos = battleData.photos || [];

      // Filter out photos whose library entries no longer exist
      const validPhotos = photos.filter((photo: any) => {
        if (!photo.libraryId) return true; // Keep photos without library IDs
        return validPhotoIds.has(photo.libraryId);
      });

      // Update battle if any photos were removed
      if (validPhotos.length < photos.length) {
        await updateDoc(doc(db, 'photoBattles', battleDoc.id), {
          photos: validPhotos,
          updatedAt: serverTimestamp(),
        });
        result.photoBattlesFixed++;
        console.log(`[Migration] Fixed battle ${battleDoc.id}: removed ${photos.length - validPhotos.length} orphaned photos`);
      }
    }

    // Step 3: Clean up orphaned storage files
    // Check multiple storage locations:
    // 1. Legacy path: users/${userId}/photo-library/
    // 2. Current paths: images/original/${userId}/ and images/thumb/${userId}/
    const storagePaths = [
      `users/${userId}/photo-library`,
      `images/original/${userId}`,
      `images/thumb/${userId}`,
    ];

    for (const storagePath of storagePaths) {
      const storageRef = ref(storage, storagePath);

      try {
        const storageList = await listAll(storageRef);

        for (const itemRef of storageList.items) {
          // Check if this file is referenced by any valid photo
          const isValid = validStoragePaths.has(itemRef.fullPath);

          if (!isValid) {
            try {
              // Verify file exists before trying to delete
              await getMetadata(itemRef);
              await deleteObject(itemRef);
              result.orphanedThumbnailsDeleted++;
              console.log(`[Migration] Deleted orphaned file: ${itemRef.fullPath}`);
            } catch (error) {
              // File might already be deleted or metadata fetch failed
              if ((error as any).code !== 'storage/object-not-found') {
                const errMsg = `Failed to delete ${itemRef.fullPath}: ${error instanceof Error ? error.message : String(error)}`;
                result.errors.push(errMsg);
                console.warn(`[Migration] ${errMsg}`);
              }
            }
          }
        }

        // Also check subdirectories
        for (const prefixRef of storageList.prefixes) {
          const subList = await listAll(prefixRef);
          for (const itemRef of subList.items) {
            const isValid = validStoragePaths.has(itemRef.fullPath);

            if (!isValid) {
              try {
                await getMetadata(itemRef);
                await deleteObject(itemRef);
                result.orphanedThumbnailsDeleted++;
                console.log(`[Migration] Deleted orphaned file: ${itemRef.fullPath}`);
              } catch (error) {
                if ((error as any).code !== 'storage/object-not-found') {
                  const errMsg = `Failed to delete ${itemRef.fullPath}: ${error instanceof Error ? error.message : String(error)}`;
                  result.errors.push(errMsg);
                  console.warn(`[Migration] ${errMsg}`);
                }
              }
            }
          }
        }
      } catch (storageError) {
        // User might not have any photos in this storage path
        if ((storageError as any).code !== 'storage/object-not-found' && (storageError as any).code !== 'storage/unauthorized') {
          const errMsg = `Storage cleanup error for ${storagePath}: ${storageError instanceof Error ? storageError.message : String(storageError)}`;
          result.errors.push(errMsg);
          console.warn(`[Migration] ${errMsg}`);
        } else {
          console.log(`[Migration] No photos found at ${storagePath} or permission denied (skipping)`);
        }
      }
    }

    console.log('[Migration] Cleanup complete:', result);
    return result;

  } catch (error) {
    const errMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errMsg);
    console.error('[Migration]', errMsg);
    throw error;
  }
}

/**
 * Admin version that processes all users
 * Only run this with proper admin credentials
 */
export async function cleanupAllUsers(): Promise<Record<string, MigrationResult>> {
  const results: Record<string, MigrationResult> = {};

  // Get all unique user IDs from photoBattles
  const battlesRef = collection(db, 'photoBattles');
  const allBattles = await getDocs(battlesRef);
  const userIds = new Set<string>();

  allBattles.docs.forEach(doc => {
    const ownerId = doc.data().ownerId;
    if (ownerId) userIds.add(ownerId);
  });

  console.log(`[Migration] Processing ${userIds.size} users`);

  for (const userId of userIds) {
    try {
      results[userId] = await cleanupOrphanedThumbnails(userId);
    } catch (error) {
      results[userId] = {
        orphanedThumbnailsDeleted: 0,
        photoBattlesFixed: 0,
        errors: [`User migration failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  return results;
}
