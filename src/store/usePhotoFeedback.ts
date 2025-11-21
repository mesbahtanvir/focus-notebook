import { create } from 'zustand';
import { collection, doc, query, where, getDocs, setDoc, getDoc, deleteDoc, Timestamp, orderBy, updateDoc, increment, arrayUnion, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, storage, functionsClient } from '@/lib/firebaseClient';

export interface BattlePhoto {
  id: string;
  url: string;
  storagePath: string;
  libraryId?: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  rating: number;
  wins: number;
  losses: number;
  totalVotes: number;
}

export interface BattleHistoryEntry {
  id: string;
  winnerId: string;
  loserId: string;
  createdAt: string;
}

export interface BattlePair {
  left: BattlePhoto;
  right: BattlePhoto;
}

export interface LinkHistoryEntry {
  secretKey: string;
  createdAt: string;
  expiresAt?: string;
}

export interface PhotoBattle {
  id: string;
  ownerId: string;
  creatorName?: string;
  photos: BattlePhoto[];
  photoAliases?: Record<string, string>;
  secretKey: string;
  createdAt: string;
  isPublic?: boolean;
  linkExpiresAt?: string;
  linkHistory?: LinkHistoryEntry[];
  updatedAt?: string;
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

function convertLibraryItemToBattlePhoto(item: PhotoLibraryItem): BattlePhoto {
  return {
    id: item.id,
    url: item.url,
    storagePath: item.storagePath,
    libraryId: item.id,
    thumbnailUrl: item.thumbnailUrl,
    thumbnailPath: item.thumbnailPath,
    rating: 1200,
    wins: 0,
    losses: 0,
    totalVotes: 0,
  };
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
  getNextPair: (sessionId: string) => Promise<BattlePair>;
  submitVote: (sessionId: string, winnerId: string, loserId: string) => Promise<void>;
  deleteSessionPhoto: (sessionId: string, photoId: string) => Promise<void>;
  mergeSessionPhotos: (sessionId: string, targetPhotoId: string, mergedPhotoId: string) => Promise<void>;
  loadResults: (sessionId: string, secretKey: string) => Promise<BattlePhoto[]>;
  loadUserSessions: () => Promise<PhotoBattle[]>;
  setSessionPublic: (sessionId: string, isPublic: boolean) => Promise<void>;
};

const BATTLE_LINK_DURATION_DAYS = 30;

// Generate a random secret key
function generateSecretKey(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function nextLinkExpiry(): string {
  const expires = new Date();
  expires.setDate(expires.getDate() + BATTLE_LINK_DURATION_DAYS);
  return expires.toISOString();
}

// Generate a short anonymous voter ID
function generateVoterId(): string {
  return 'voter_' + Math.random().toString(36).substring(2, 10);
}

function toIsoString(value?: string | Timestamp): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function normalizeLinkHistoryEntries(entries?: Array<Partial<LinkHistoryEntry> & { createdAt?: string | Timestamp; expiresAt?: string | Timestamp }>): LinkHistoryEntry[] {
  if (!entries) return [];
  return entries
    .map(entry => {
      if (!entry || !entry.secretKey) return null;
      const createdAt = toIsoString(entry.createdAt) ?? new Date().toISOString();
      const expiresAt = toIsoString(entry.expiresAt);
      return expiresAt ? { secretKey: entry.secretKey, createdAt, expiresAt } : { secretKey: entry.secretKey, createdAt };
    })
    .filter((entry): entry is LinkHistoryEntry => entry !== null);
}

function normalizeBattlePhotos(photos?: BattlePhoto[]): BattlePhoto[] {
  if (!photos) return [];
  return photos.map(photo => ({
    ...photo,
    rating: typeof photo.rating === 'number' ? photo.rating : 1200,
    wins: typeof photo.wins === 'number' ? photo.wins : 0,
    losses: typeof photo.losses === 'number' ? photo.losses : 0,
    totalVotes: typeof photo.totalVotes === 'number' ? photo.totalVotes : 0,
  }));
}

function normalizeBattle(data: PhotoBattle & Record<string, any>, id?: string): PhotoBattle {
  return {
    ...data,
    ...(id ? { id } : {}),
    photos: normalizeBattlePhotos(data.photos),
    createdAt: toIsoString(data.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(data.updatedAt),
    linkExpiresAt: toIsoString(data.linkExpiresAt),
    linkHistory: normalizeLinkHistoryEntries(data.linkHistory as any),
    photoAliases: data.photoAliases ?? {},
  };
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

    set({ isLoading: true, error: null });

    try {
      const sessionId = user.uid;
      const sessionRef = doc(db, 'photoBattles', sessionId);
      const sessionLibrary = get().library.length > 0 ? get().library : await get().loadLibrary();

      if (sessionLibrary.length === 0) {
        throw new Error('Upload at least one photo to start a battle.');
      }

      const selectionSet = new Set(libraryPhotoIds);
      const selectedItems =
        selectionSet.size > 0
          ? sessionLibrary.filter(item => selectionSet.has(item.id))
          : sessionLibrary;

      if (selectedItems.length === 0) {
        throw new Error('No valid photos found in your gallery.');
      }

      const existing = await getDoc(sessionRef);

      let session: PhotoBattle;
      if (existing.exists()) {
        const data = existing.data() as PhotoBattle & Record<string, any>;
        const existingPhotos = data.photos || [];
        const missing = selectedItems.filter(item => !existingPhotos.some(photo => photo.libraryId === item.id));
        const updates: Partial<PhotoBattle> = {};

        if (missing.length > 0) {
          updates.photos = [...existingPhotos, ...missing.map(convertLibraryItemToBattlePhoto)];
        }
        if (creatorName && creatorName !== data.creatorName) {
          updates.creatorName = creatorName;
        }
        if (libraryPhotoIds.length === 0) {
          const historyEntry: LinkHistoryEntry = {
            secretKey: data.secretKey,
            createdAt: new Date().toISOString(),
            expiresAt: data.linkExpiresAt,
          };
          updates.linkHistory = [historyEntry, ...(data.linkHistory ?? [])].slice(0, 5);
          updates.secretKey = generateSecretKey();
          updates.linkExpiresAt = nextLinkExpiry();
        }

        if (Object.keys(updates).length > 0) {
          await setDoc(sessionRef, updates, { merge: true });
        }

        const merged: PhotoBattle & Record<string, any> = {
          ...data,
          ...updates,
          id: sessionId,
          photos: (updates.photos as BattlePhoto[]) ?? existingPhotos,
          secretKey: updates.secretKey ?? data.secretKey,
          creatorName: updates.creatorName ?? data.creatorName,
          linkExpiresAt: updates.linkExpiresAt ?? data.linkExpiresAt,
          linkHistory: updates.linkHistory ?? data.linkHistory,
        };
        session = normalizeBattle(merged, sessionId);

        set(state => ({
          currentSession: session,
          isLoading: false,
          userSessions: [
            session,
            ...state.userSessions.filter(entry => entry.id !== session.id),
          ],
        }));
        return { sessionId, secretKey: session.secretKey };
      }

      const secretKey = generateSecretKey();
      const sessionPhotos: BattlePhoto[] = selectedItems.map(convertLibraryItemToBattlePhoto);
      session = normalizeBattle({
        id: sessionId,
        ownerId: user.uid,
        creatorName,
        photos: sessionPhotos,
        photoAliases: {},
        secretKey,
        createdAt: new Date().toISOString(),
        isPublic: false,
        linkExpiresAt: nextLinkExpiry(),
        linkHistory: [],
      });
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

  uploadToLibrary: async (
    photos: File[],
    onProgress?: (uploaded: number, total: number) => void,
    onFileProgress?: (event: UploadProgressEvent) => void
  ) => {
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
        void appendPhotoToBattle(user.uid, convertLibraryItemToBattlePhoto(item));
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
          await deleteObject(ref(storage, photo.storagePath));
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

      const session = normalizeBattle({ ...(sessionDoc.data() as PhotoBattle & Record<string, any>) }, sessionDoc.id);

      set({ currentSession: session, isLoading: false });
      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      set({ error: 'Failed to load session', isLoading: false });
      return null;
    }
  },

  getNextPair: async (sessionId: string) => {
    try {
      const pairCallable = httpsCallable<
        { sessionId: string },
        { left: BattlePhoto; right: BattlePhoto }
      >(functionsClient, 'getNextPhotoPair');
      const response = await pairCallable({ sessionId });
      const { left, right } = response.data ?? {};
      if (!left || !right) {
        throw new Error('No pair available for this battle.');
      }
      const [normalizedLeft, normalizedRight] = normalizeBattlePhotos([left, right]);
      return { left: normalizedLeft, right: normalizedRight };
    } catch (error) {
      console.error('Error fetching next battle pair:', error);
      throw error;
    }
  },

  submitVote: async (sessionId: string, winnerId: string, loserId: string) => {
    try {
      const voteCallable = httpsCallable<
        { sessionId: string; winnerId: string; loserId: string },
        void
      >(functionsClient, 'submitPhotoVote');
      await voteCallable({ sessionId, winnerId, loserId });

      // Reload session to get updated ratings and vote counts
      const sessionRef = doc(db, 'photoBattles', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      if (sessionDoc.exists()) {
        const session = normalizeBattle({ ...(sessionDoc.data() as PhotoBattle & Record<string, any>) }, sessionDoc.id);
        set({ currentSession: session });
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  },

  deleteSessionPhoto: async (sessionId: string, photoId: string) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to delete battle photos.');
    }

    let removedPhoto: BattlePhoto | null = null;
    try {
      await runTransaction(db, async transaction => {
        const sessionRef = doc(db, 'photoBattles', sessionId);
        const snap = await transaction.get(sessionRef);
        if (!snap.exists()) {
          throw new Error('Session not found');
        }

        const session = snap.data() as PhotoBattle;
        if (session.ownerId !== user.uid) {
          throw new Error('You do not have permission to update this session.');
        }

        const index = session.photos.findIndex(photo => photo.id === photoId);
        if (index === -1) {
          throw new Error('Photo not found in this battle.');
        }

        removedPhoto = session.photos[index];
        const updatedPhotos = session.photos.filter(photo => photo.id !== photoId);
        transaction.update(sessionRef, {
          photos: updatedPhotos,
          updatedAt: serverTimestamp(),
        });
      });

      const ensuredRemovedPhoto = removedPhoto as BattlePhoto | null;
      if (!ensuredRemovedPhoto) {
        return;
      }

      if (ensuredRemovedPhoto.storagePath) {
        const storageRef = ref(storage, ensuredRemovedPhoto.storagePath);
        await deleteObject(storageRef).catch(error => {
          console.warn('Unable to delete battle photo file (continuing):', error);
        });
      }

      const removedLibraryId = ensuredRemovedPhoto.libraryId;
      if (removedLibraryId) {
        await deleteDoc(doc(db, `users/${user.uid}/photoLibrary`, removedLibraryId)).catch(error => {
          console.warn('Unable to remove library photo entry (continuing):', error);
        });
      }

      const prune = (photos: BattlePhoto[]) => photos.filter(photo => photo.id !== photoId);
      set(state => ({
        results: prune(state.results),
        currentSession:
          state.currentSession && state.currentSession.id === sessionId
            ? { ...state.currentSession, photos: prune(state.currentSession.photos) }
            : state.currentSession,
        userSessions: state.userSessions.map(session =>
          session.id === sessionId ? { ...session, photos: prune(session.photos) } : session
        ),
        library: removedLibraryId ? state.library.filter(entry => entry.id !== removedLibraryId) : state.library,
      }));
    } catch (error) {
      console.error('Failed to delete battle photo:', error);
      throw error;
    }
  },

  mergeSessionPhotos: async (sessionId: string, targetPhotoId: string, mergedPhotoId: string) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to merge battle photos.');
    }
    if (targetPhotoId === mergedPhotoId) {
      throw new Error('Choose two different photos to merge.');
    }

    try {
      const sessionRef = doc(db, 'photoBattles', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) {
        throw new Error('Session not found');
      }

      const session = sessionSnap.data() as PhotoBattle;
      if (session.ownerId !== user.uid) {
        throw new Error('You do not have permission to update this session.');
      }

      const baseAliases = session.photoAliases ?? {};
      const canonicalTarget = resolveAlias(targetPhotoId, baseAliases);
      const canonicalMerged = resolveAlias(mergedPhotoId, baseAliases);

      if (canonicalTarget === canonicalMerged) {
        throw new Error('These photos are already combined.');
      }

      const targetPhoto = session.photos.find(photo => photo.id === canonicalTarget);
      const mergedPhoto = session.photos.find(photo => photo.id === canonicalMerged);
      if (!targetPhoto || !mergedPhoto) {
        throw new Error('Unable to find both photos to merge.');
      }

      const history = await fetchBattleHistory(sessionId);
      const aliasMap = { ...baseAliases, [canonicalMerged]: canonicalTarget };
      const recomputedMap = replayBattleWithHistory(session, history, aliasMap);

      const updatedPhotos = session.photos
        .filter(photo => photo.id !== canonicalMerged)
        .map(photo => {
          const next = recomputedMap.get(photo.id);
          if (!next) {
            return { ...photo, rating: 1200, wins: 0, losses: 0, totalVotes: 0 };
          }
          return {
            ...photo,
            rating: next.rating,
            wins: next.wins,
            losses: next.losses,
            totalVotes: next.totalVotes,
          };
        });

      const previousUpdatedAt = session.updatedAt;
      await runTransaction(db, async transaction => {
        const freshSnap = await transaction.get(sessionRef);
        if (!freshSnap.exists()) {
          throw new Error('Session not found');
        }
        const freshData = freshSnap.data() as PhotoBattle;
        if (previousUpdatedAt && freshData.updatedAt && previousUpdatedAt !== freshData.updatedAt) {
          throw new Error('Session changed while combining. Please try again.');
        }
        transaction.update(sessionRef, {
          photos: updatedPhotos,
          photoAliases: aliasMap,
          updatedAt: serverTimestamp(),
        });
      });

      const storageRef = ref(storage, mergedPhoto.storagePath);
      await deleteObject(storageRef).catch(error => {
        console.warn('Unable to delete merged photo file (continuing):', error);
      });

      if (mergedPhoto.libraryId) {
        await deleteDoc(doc(db, `users/${user.uid}/photoLibrary`, mergedPhoto.libraryId)).catch(error => {
          console.warn('Unable to remove merged library entry (continuing):', error);
        });
      }

      set(state => {
        const applyUpdate = (photos: BattlePhoto[]) =>
          photos
            .filter(photo => photo.id !== canonicalMerged)
            .map(photo => {
              const next = recomputedMap.get(photo.id);
              if (!next) {
                return { ...photo, rating: 1200, wins: 0, losses: 0, totalVotes: 0 };
              }
              return {
                ...photo,
                rating: next.rating,
                wins: next.wins,
                losses: next.losses,
                totalVotes: next.totalVotes,
              };
            });

        const updatedResults =
          state.results.length > 0 ? applyUpdate(state.results).sort((a, b) => b.rating - a.rating) : state.results;

        return {
          ...state,
          results: updatedResults,
          currentSession:
            state.currentSession && state.currentSession.id === sessionId
              ? { ...state.currentSession, photos: applyUpdate(state.currentSession.photos), photoAliases: aliasMap }
              : state.currentSession,
          userSessions: state.userSessions.map(entry =>
            entry.id === sessionId ? { ...entry, photos: applyUpdate(entry.photos), photoAliases: aliasMap } : entry
          ),
          library: mergedPhoto.libraryId ? state.library.filter(item => item.id !== mergedPhoto.libraryId) : state.library,
        };
      });
    } catch (error) {
      console.error('Failed to merge battle photos:', error);
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

      const session = normalizeBattle({ ...(sessionDoc.data() as PhotoBattle & Record<string, any>) }, sessionDoc.id);

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
      const sessions = snapshot.docs.map(doc => normalizeBattle({ ...(doc.data() as PhotoBattle & Record<string, any>) }, doc.id));
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

async function appendPhotoToBattle(ownerId: string, photo: BattlePhoto) {
  const battleRef = doc(db, 'photoBattles', ownerId);
  try {
    await runTransaction(db, async transaction => {
      const snap = await transaction.get(battleRef);
      if (!snap.exists()) return;
      const data = snap.data() as PhotoBattle;
      const photos = data.photos || [];
      if (photos.some(existing => existing.libraryId === photo.libraryId)) {
        return;
      }
      transaction.update(battleRef, { photos: [...photos, photo] });
    });
  } catch (error) {
    console.warn('Unable to append photo to battle session', error);
  }
}

function resolveAlias(photoId: string, aliasMap: Record<string, string>): string {
  let current = photoId;
  const seen = new Set<string>();
  while (aliasMap[current] && !seen.has(current)) {
    seen.add(current);
    current = aliasMap[current];
  }
  return current;
}

async function fetchBattleHistory(sessionId: string): Promise<BattleHistoryEntry[]> {
  const sessionRef = doc(db, 'photoBattles', sessionId);
  const historyRef = collection(sessionRef, 'history');
  const snapshot = await getDocs(historyRef);
  const entries = snapshot.docs.map(item => {
    const data = item.data() as Partial<BattleHistoryEntry>;
    return {
      id: item.id,
      winnerId: data.winnerId ?? '',
      loserId: data.loserId ?? '',
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  });
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function replayBattleWithHistory(session: PhotoBattle, history: BattleHistoryEntry[], aliasMap: Record<string, string>) {
  const canonical = (id: string) => resolveAlias(id, aliasMap);
  const metadata = new Map<string, BattlePhoto>();
  session.photos.forEach(photo => {
    metadata.set(photo.id, photo);
  });

  const state = new Map<string, BattlePhoto>();
  const ensurePhoto = (id: string) => {
    const existing = state.get(id);
    if (existing) return existing;
    const base = metadata.get(id);
    const fresh: BattlePhoto = {
      id,
      url: base?.url ?? '',
      storagePath: base?.storagePath ?? '',
      libraryId: base?.libraryId,
      rating: 1200,
      wins: 0,
      losses: 0,
      totalVotes: 0,
    };
    state.set(id, fresh);
    return fresh;
  };

  // Seed existing photos so even those without history retain default ratings
  session.photos.forEach(photo => {
    if (!state.has(photo.id)) {
      state.set(photo.id, {
        ...photo,
        rating: 1200,
        wins: 0,
        losses: 0,
        totalVotes: 0,
      });
    }
  });

  history.forEach(entry => {
    const winnerId = canonical(entry.winnerId);
    const loserId = canonical(entry.loserId);
    if (!winnerId || !loserId || winnerId === loserId) {
      return;
    }
    const winner = ensurePhoto(winnerId);
    const loser = ensurePhoto(loserId);

    const K = 32;
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

    winner.rating = Math.max(0, Math.round(winner.rating + K * (1 - expectedWinner)));
    loser.rating = Math.max(0, Math.round(loser.rating + K * (0 - expectedLoser)));
    winner.wins += 1;
    winner.totalVotes += 1;
    loser.losses += 1;
    loser.totalVotes += 1;
  });

  return state;
}
