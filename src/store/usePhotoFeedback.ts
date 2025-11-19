import { create } from 'zustand';
import { collection, doc, query, where, getDocs, setDoc, getDoc, deleteDoc, Timestamp, orderBy, updateDoc, increment, arrayUnion, runTransaction } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, storage, functionsClient } from '@/lib/firebaseClient';

export interface BattlePhoto {
  id: string;
  url: string;
  storagePath: string;
  libraryId?: string;
  rating: number;
  wins: number;
  losses: number;
  totalVotes: number;
}

export interface PhotoBattle {
  id: string;
  ownerId: string;
  creatorName?: string;
  photos: BattlePhoto[];
  secretKey: string;
  createdAt: string;
  isPublic?: boolean;
}

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
  thumbnailPath?: string;
  thumbnailUrl?: string;
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
  currentSession: PhotoBattle | null;
  results: BattlePhoto[];
  isLoading: boolean;
  sessionsLoading: boolean;
  libraryLoading: boolean;
  error: string | null;
  userSessions: PhotoBattle[];
  library: PhotoLibraryItem[];

  // Actions
  createSessionFromLibrary: (libraryPhotoIds: string[], creatorName?: string) => Promise<{ sessionId: string; secretKey: string }>;
  uploadToLibrary: (
    photos: File[],
    onProgress?: (uploaded: number, total: number) => void,
    onFileProgress?: (event: UploadProgressEvent) => void
  ) => Promise<PhotoLibraryItem[]>;
  loadLibrary: () => Promise<PhotoLibraryItem[]>;
  deleteLibraryPhoto: (photoId: string) => Promise<void>;
  deleteAllLibraryPhotos: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<PhotoBattle | null>;
  submitVote: (sessionId: string, winnerId: string, loserId: string) => Promise<void>;
  loadResults: (sessionId: string, secretKey: string) => Promise<BattlePhoto[]>;
  loadUserSessions: () => Promise<PhotoBattle[]>;
  setSessionPublic: (sessionId: string, isPublic: boolean) => Promise<void>;
};

// Generate a random secret key
function generateSecretKey(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Generate a short anonymous voter ID
function generateVoterId(): string {
  return 'voter_' + Math.random().toString(36).substring(2, 10);
}

export const usePhotoFeedback = create<State>((set, get) => ({
  currentSession: null,
  results: [],
  isLoading: false,
  sessionsLoading: false,
  libraryLoading: false,
  error: null,
  userSessions: [],
  library: [],

  createSessionFromLibrary: async (libraryPhotoIds: string[], creatorName?: string) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to create a photo feedback session.');
    }

    if (libraryPhotoIds.length === 0) {
      throw new Error('Select at least one photo to create a session.');
    }

    set({ isLoading: true, error: null });

    try {
      const sessionId = Date.now().toString();
      const secretKey = generateSecretKey();

      // Ensure library photos are loaded
      let library = get().library;
      const missingIds = libraryPhotoIds.filter(id => !library.find(item => item.id === id));
      if (missingIds.length > 0) {
        const refs = missingIds.map(id => doc(db, `users/${user.uid}/photoLibrary`, id));
        const snaps = await Promise.all(refs.map(r => getDoc(r)));
        const loaded = snaps
          .filter(s => s.exists())
          .map(s => {
            const data = s.data() as PhotoLibraryItem;
            return { ...data, id: s.id };
          });
        library = [...library, ...loaded];
      }

      const selectedItems = libraryPhotoIds
        .map(id => library.find(item => item.id === id))
        .filter(Boolean) as PhotoLibraryItem[];

      if (selectedItems.length === 0) {
        throw new Error('No valid photos found in your gallery.');
      }

      const sessionPhotos: BattlePhoto[] = selectedItems.map((item, index) => ({
        id: `${sessionId}_${index}`,
        url: item.url,
        storagePath: item.storagePath,
        libraryId: item.id,
        rating: 1200,
        wins: 0,
        losses: 0,
        totalVotes: 0,
      }));

      // Create session document
      const session: PhotoBattle = {
        id: sessionId,
        ownerId: user.uid,
        creatorName,
        photos: sessionPhotos,
        secretKey,
        createdAt: new Date().toISOString(),
        isPublic: false,
      };

      const sessionRef = doc(db, 'photoBattles', sessionId);
      await setDoc(sessionRef, session);

      set(state => ({
        currentSession: session,
        isLoading: false,
        userSessions: [session, ...state.userSessions],
      }));
      return { sessionId, secretKey };
    } catch (error) {
      console.error('Error creating session:', error);
      set({ error: 'Failed to create session', isLoading: false });
      throw error;
    }
  },

  uploadToLibrary: async (photos: File[], onProgress?: (uploaded: number, total: number) => void, onFileProgress?: (event: UploadProgressEvent) => void) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to upload photos.');
    }

    set({ libraryLoading: true, error: null });

    try {
      const signedUrlCallable = httpsCallable<{ path: string }, { url: string }>(functionsClient, 'getSignedImageUrl');
      const uploaded: PhotoLibraryItem[] = [];
      for (const file of photos) {
        const extension = file.type?.includes('png') ? 'png' : 'jpg';
        const photoId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const storagePath = `images/original/${user.uid}/${photoId}.${extension}`;
        const thumbnailPath = storagePath.replace('/original/', '/thumb/');
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

        let thumbnailUrl: string | undefined;
        try {
          const response = await signedUrlCallable({ path: thumbnailPath });
          thumbnailUrl = response.data.url;
        } catch {
          thumbnailUrl = undefined;
        }

        emitProgress({ progress: 1, status: 'completed' });

        const docRef = doc(db, `users/${user.uid}/photoLibrary`, photoId);
        const item: PhotoLibraryItem = {
          id: photoId,
          ownerId: user.uid,
          url: signedUrl,
          storagePath,
          thumbnailPath,
          thumbnailUrl,
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
        libraryLoading: false,
      }));

      return uploaded;
    } catch (error) {
      console.error('Error uploading to library:', error);
      set({ libraryLoading: false, error: 'Failed to upload photos' });
      throw error;
    }
  },

  loadLibrary: async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      set({ library: [] });
      return [];
    }

    set({ libraryLoading: true, error: null });

    try {
      const libraryRef = collection(db, `users/${user.uid}/photoLibrary`);
      const snaps = await getDocs(query(libraryRef, orderBy('createdAt', 'desc')));
      const items = snaps.docs.map(doc => {
        const data = doc.data() as PhotoLibraryItem & {
          totalVotes?: number;
          yesVotes?: number;
          sessionCount?: number;
          lastVotedAt?: Timestamp | string;
        };
        const rawStats = (data.stats || {}) as PhotoStats & { lastVotedAt?: Timestamp | string };
        const stats: PhotoStats = {
          yesVotes: rawStats.yesVotes ?? data.yesVotes ?? 0,
          totalVotes: rawStats.totalVotes ?? data.totalVotes ?? 0,
          sessionCount: rawStats.sessionCount ?? data.sessionCount ?? 0,
        };
        const lastVoteSource = rawStats.lastVotedAt ?? data.lastVotedAt;
        if (lastVoteSource) {
          stats.lastVotedAt =
            lastVoteSource instanceof Timestamp
              ? lastVoteSource.toDate().toISOString()
              : typeof lastVoteSource === 'string'
                ? lastVoteSource
                : undefined;
        }
        return { ...data, stats };
      });
      set({ library: items, libraryLoading: false });
      return items;
    } catch (error) {
      console.error('Error loading library:', error);
      set({ libraryLoading: false, error: 'Failed to load your gallery' });
      return [];
    }
  },

  deleteLibraryPhoto: async (photoId: string) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to delete gallery photos.');
    }

    const target = get().library.find(photo => photo.id === photoId);
    if (!target) return;

    try {
      const storageRef = ref(storage, target.storagePath);
      await deleteObject(storageRef).catch(error => {
        console.warn('Unable to delete photo file (continuing):', error);
      });
      if (target.thumbnailPath) {
        const thumbRef = ref(storage, target.thumbnailPath);
        await deleteObject(thumbRef).catch(error => {
          console.warn('Unable to delete thumbnail (continuing):', error);
        });
      }
      await deleteDoc(doc(db, `users/${user.uid}/photoLibrary`, photoId));
      set(state => ({
        library: state.library.filter(photo => photo.id !== photoId),
        userSessions: state.userSessions,
      }));
    } catch (error) {
      console.error('Failed to delete gallery photo:', error);
      throw error;
    }
  },

  deleteAllLibraryPhotos: async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to delete gallery photos.');
    }

    set({ libraryLoading: true, error: null });

    try {
      const libraryRef = collection(db, `users/${user.uid}/photoLibrary`);
      const snaps = await getDocs(libraryRef);
      const photos = snaps.docs.map(item => item.data() as PhotoLibraryItem);

      for (const photo of photos) {
        try {
          const storageRef = ref(storage, photo.storagePath);
          await deleteObject(storageRef);
        } catch (fileError) {
          console.warn('Unable to delete photo file (continuing):', fileError);
        }
        await deleteDoc(doc(db, `users/${user.uid}/photoLibrary`, photo.id));
      }

      set({ library: [], libraryLoading: false });
    } catch (error) {
      console.error('Failed to delete gallery', error);
      set({ libraryLoading: false });
      throw error;
    }
  },

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const sessionRef = doc(db, 'photoBattles', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        set({ error: 'Session not found', isLoading: false });
        return null;
      }

      const session = sessionDoc.data() as PhotoBattle;

      set({ currentSession: session, isLoading: false });
      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      set({ error: 'Failed to load session', isLoading: false });
      return null;
    }
  },

  submitVote: async (sessionId: string, winnerId: string, loserId: string) => {
    try {
      await runTransaction(db, async transaction => {
        const sessionRef = doc(db, 'photoBattles', sessionId);
        const snap = await transaction.get(sessionRef);
        if (!snap.exists()) {
          throw new Error('Session not found');
        }

        const session = snap.data() as PhotoBattle;
        const photos = session.photos.map(photo => ({ ...photo }));
        const winner = photos.find(photo => photo.id === winnerId);
        const loser = photos.find(photo => photo.id === loserId);

        if (!winner || !loser) {
          throw new Error('Invalid photos selected');
        }

        const K = 32;
        const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
        const expectedLoser = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

        winner.rating = Math.max(0, Math.round(winner.rating + K * (1 - expectedWinner)));
        loser.rating = Math.max(0, Math.round(loser.rating + K * (0 - expectedLoser)));
        winner.wins += 1;
        winner.totalVotes += 1;
        loser.losses += 1;
        loser.totalVotes += 1;

        transaction.update(sessionRef, { photos, updatedAt: new Date().toISOString() });

        if (winner.libraryId) {
          void updateLibraryStats(session.ownerId, winner.libraryId, 'win', sessionId);
        }
        if (loser.libraryId) {
          void updateLibraryStats(session.ownerId, loser.libraryId, 'loss', sessionId);
        }
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  },

  loadResults: async (sessionId: string, secretKey: string) => {
    set({ isLoading: true, error: null });

    try {
      // Verify secret key
      const sessionRef = doc(db, 'photoBattles', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        set({ error: 'Session not found', isLoading: false });
        return [];
      }

      const session = sessionDoc.data() as PhotoBattle;

      if (session.secretKey !== secretKey) {
        set({ error: 'Invalid secret key', isLoading: false });
        return [];
      }

      const sorted = [...session.photos].sort((a, b) => b.rating - a.rating);
      set({ results: sorted, isLoading: false });
      return sorted;
    } catch (error) {
      console.error('Error loading results:', error);
      set({ error: 'Failed to load results', isLoading: false });
      return [];
    }
  },

  loadUserSessions: async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      return [];
    }

    set({ sessionsLoading: true, error: null });

    try {
      const sessionsRef = collection(db, 'photoBattles');
      const q = query(
        sessionsRef,
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => doc.data() as PhotoBattle);
      set({ userSessions: sessions, sessionsLoading: false });
      return sessions;
    } catch (error) {
      console.error('Error loading your sessions:', error);
      set({ sessionsLoading: false, error: 'Failed to load your sessions' });
      return [];
    }
  },

  setSessionPublic: async (sessionId: string, isPublic: boolean) => {
    try {
      await updateDoc(doc(db, 'photoBattles', sessionId), { isPublic });
      set(state => ({
        userSessions: state.userSessions.map(session =>
          session.id === sessionId ? { ...session, isPublic } : session
        ),
      }));
    } catch (error) {
      console.error('Failed to update session visibility', error);
      throw error;
    }
  },
}));

// Helper to get/create voter ID from localStorage
export function getOrCreateVoterId(): string {
  if (typeof window === 'undefined') return generateVoterId();

  let voterId = localStorage.getItem('photoFeedbackVoterId');
  if (!voterId) {
    voterId = generateVoterId();
    localStorage.setItem('photoFeedbackVoterId', voterId);
  }
  return voterId;
}

async function updateLibraryStats(ownerId: string, libraryId: string, result: 'win' | 'loss', sessionId: string) {
  const statsRef = doc(db, `users/${ownerId}/photoLibrary/${libraryId}`);

  try {
    const snap = await getDoc(statsRef);
    if (!snap.exists()) return;

    const data = snap.data() as PhotoLibraryItem;
    const sessionIds = (data as any).sessionIds || [];
    const alreadyCounted = sessionIds.includes(sessionId);

    const updates: Record<string, any> = {
      "stats.totalVotes": increment(1),
      "stats.yesVotes": result === 'win' ? increment(1) : increment(0),
      "stats.lastVotedAt": Timestamp.fromDate(new Date()),
    };

    if (!alreadyCounted) {
      updates["stats.sessionCount"] = increment(1);
      updates.sessionIds = arrayUnion(sessionId);
    }

    await updateDoc(statsRef, updates);
  } catch (error) {
    console.error('Failed to update library stats', error);
  }
}
