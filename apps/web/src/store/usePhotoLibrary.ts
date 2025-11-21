import { create } from 'zustand';
import { collection, doc, query, getDocs, setDoc, deleteDoc, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, storage, functionsClient } from '@/lib/firebaseClient';

export interface PhotoStats {
  yesVotes: number;
  totalVotes: number;
  sessionCount: number;
  lastVotedAt?: string;
}

export interface PhotoLibraryItem {
  id: string;
  ownerId: string;
  url: string;
  storagePath: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  createdAt: string;
  stats?: PhotoStats;
}

export interface UploadProgressEvent {
  id: string;
  name: string;
  status: 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

type State = {
  library: PhotoLibraryItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  uploadPhotos: (
    photos: File[],
    onProgress?: (uploaded: number, total: number) => void,
    onFileProgress?: (event: UploadProgressEvent) => void
  ) => Promise<PhotoLibraryItem[]>;
  loadLibrary: () => Promise<PhotoLibraryItem[]>;
  deletePhoto: (photoId: string) => Promise<void>;
  deleteAllPhotos: () => Promise<void>;
  updatePhotoMetadata: (photoId: string, updates: Partial<PhotoLibraryItem>) => Promise<void>;
};

export const usePhotoLibrary = create<State>((set, get) => ({
  library: [],
  isLoading: false,
  error: null,

  uploadPhotos: async (
    photos: File[],
    onProgress?: (uploaded: number, total: number) => void,
    onFileProgress?: (event: UploadProgressEvent) => void
  ) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to upload photos.');
    }

    set({ isLoading: true, error: null });

    try {
      const signedUrlCallable = httpsCallable<{ path: string }, { url: string }>(functionsClient, 'getSignedImageUrl');
      const uploaded: PhotoLibraryItem[] = [];

      for (const file of photos) {
        const extension = file.type?.includes('png') ? 'png' : 'jpg';
        const photoId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const storagePath = `images/original/${user.uid}/${photoId}.${extension}`;
        const storageRef = ref(storage, storagePath);
        const fileName = file.name || `Photo ${uploaded.length + 1}`;

        const emitProgress = (update: Partial<UploadProgressEvent>) => {
          onFileProgress?.({
            id: photoId,
            name: fileName,
            progress: update.progress ?? 0,
            status: update.status ?? 'uploading',
            error: update.error,
          });
        };

        emitProgress({ progress: 0, status: 'uploading' });

        try {
          await new Promise<void>((resolve, reject) => {
            const task = uploadBytesResumable(storageRef, file, {
              contentType: file.type || 'image/jpeg',
            });
            task.on(
              'state_changed',
              snapshot => {
                const progress = snapshot.totalBytes > 0 ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
                emitProgress({ progress, status: 'uploading' });
              },
              error => reject(error),
              () => resolve()
            );
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload failed';
          emitProgress({ progress: 0, status: 'failed', error: message });
          throw error;
        }

        let signedUrl: string;
        try {
          const response = await signedUrlCallable({ path: storagePath });
          signedUrl = response.data.url;
        } catch (error) {
          console.warn('Failed to retrieve signed URL, falling back to getDownloadURL:', error);
          signedUrl = await getDownloadURL(storageRef);
        }

        emitProgress({ progress: 1, status: 'completed' });

        const docRef = doc(db, `users/${user.uid}/photoLibrary`, photoId);
        const item: PhotoLibraryItem = {
          id: photoId,
          ownerId: user.uid,
          url: signedUrl,
          storagePath,
          createdAt: new Date().toISOString(),
          stats: {
            yesVotes: 0,
            totalVotes: 0,
            sessionCount: 0,
          },
        };
        await setDoc(docRef, item);
        uploaded.push(item);
        onProgress?.(uploaded.length, photos.length);
      }

      set(state => ({
        library: [...uploaded, ...state.library].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        isLoading: false,
      }));

      return uploaded;
    } catch (error) {
      console.error('Error uploading photos:', error);
      set({ isLoading: false, error: 'Failed to upload photos' });
      throw error;
    }
  },

  loadLibrary: async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      set({ library: [] });
      return [];
    }

    set({ isLoading: true, error: null });

    try {
      const libraryRef = collection(db, `users/${user.uid}/photoLibrary`);
      const snaps = await getDocs(query(libraryRef, orderBy('createdAt', 'desc')));
      const items = snaps.docs.map(doc => {
        const data = doc.data() as PhotoLibraryItem & {
          totalVotes?: number;
          yesVotes?: number;
          sessionCount?: number;
          lastVotedAt?: any;
        };
        const rawStats = (data.stats || {}) as PhotoStats & { lastVotedAt?: any };
        const stats: PhotoStats = {
          yesVotes: rawStats.yesVotes ?? data.yesVotes ?? 0,
          totalVotes: rawStats.totalVotes ?? data.totalVotes ?? 0,
          sessionCount: rawStats.sessionCount ?? data.sessionCount ?? 0,
        };
        const lastVoteSource = rawStats.lastVotedAt ?? data.lastVotedAt;
        if (lastVoteSource) {
          stats.lastVotedAt =
            lastVoteSource.toDate ? lastVoteSource.toDate().toISOString() :
            typeof lastVoteSource === 'string' ? lastVoteSource : undefined;
        }
        return { ...data, stats };
      });
      set({ library: items, isLoading: false });
      return items;
    } catch (error) {
      console.error('Error loading library:', error);
      set({ isLoading: false, error: 'Failed to load your gallery' });
      return [];
    }
  },

  deletePhoto: async (photoId: string) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to delete gallery photos.');
    }

    const target = get().library.find(photo => photo.id === photoId);
    if (!target) return;

    try {
      // Delete from storage (main photo + thumbnail if exists)
      const deletePromises: Promise<void>[] = [];

      // Delete main photo
      const storageRef = ref(storage, target.storagePath);
      deletePromises.push(
        deleteObject(storageRef).catch(error => {
          console.warn('Unable to delete photo file (continuing):', error);
        })
      );

      // Delete thumbnail if it exists
      if (target.thumbnailPath) {
        const thumbnailRef = ref(storage, target.thumbnailPath);
        deletePromises.push(
          deleteObject(thumbnailRef).catch(error => {
            console.warn('Unable to delete thumbnail file (continuing):', error);
          })
        );
      }

      await Promise.all(deletePromises);

      // Delete from library
      await deleteDoc(doc(db, `users/${user.uid}/photoLibrary`, photoId));

      // Update local state
      set(state => ({
        library: state.library.filter(photo => photo.id !== photoId),
      }));
    } catch (error) {
      console.error('Failed to delete gallery photo:', error);
      throw error;
    }
  },

  deleteAllPhotos: async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to delete gallery photos.');
    }

    set({ isLoading: true, error: null });

    try {
      const libraryRef = collection(db, `users/${user.uid}/photoLibrary`);
      const snaps = await getDocs(libraryRef);
      const photos = snaps.docs.map(item => item.data() as PhotoLibraryItem);

      for (const photo of photos) {
        // Delete main photo
        try {
          await deleteObject(ref(storage, photo.storagePath));
        } catch (fileError) {
          console.warn('Unable to delete photo file (continuing):', fileError);
        }

        // Delete thumbnail if exists
        if (photo.thumbnailPath) {
          try {
            await deleteObject(ref(storage, photo.thumbnailPath));
          } catch (fileError) {
            console.warn('Unable to delete thumbnail file (continuing):', fileError);
          }
        }

        // Delete from Firestore
        await deleteDoc(doc(db, `users/${user.uid}/photoLibrary`, photo.id));
      }

      set({
        library: [],
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to delete gallery', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updatePhotoMetadata: async (photoId: string, updates: Partial<PhotoLibraryItem>) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to update photos.');
    }

    try {
      const docRef = doc(db, `users/${user.uid}/photoLibrary`, photoId);
      await updateDoc(docRef, updates);

      set(state => ({
        library: state.library.map(photo =>
          photo.id === photoId ? { ...photo, ...updates } : photo
        ),
      }));
    } catch (error) {
      console.error('Failed to update photo metadata:', error);
      throw error;
    }
  },
}));
