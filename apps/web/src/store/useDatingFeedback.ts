import { create } from 'zustand';
import { collection, doc, query, where, getDocs, setDoc, getDoc, deleteDoc, Timestamp, orderBy, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, storage, functionsClient } from '@/lib/firebaseClient';
import type { PhotoLibraryItem } from '@/store/usePhotoLibrary';

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
  error: string | null;
  userSessions: PhotoBattle[];

  // Actions
  createSessionFromLibrary: (libraryItems: PhotoLibraryItem[], libraryPhotoIds: string[], creatorName?: string) => Promise<{ sessionId: string; secretKey: string }>;
  loadSession: (sessionId: string) => Promise<PhotoBattle | null>;
  getNextPair: (sessionId: string) => Promise<BattlePair>;
  getNextPairs: (sessionId: string, count?: number) => Promise<BattlePair[]>;
  submitVote: (sessionId: string, winnerId: string, loserId: string, skipReload?: boolean) => Promise<void>;
  reloadSession: (sessionId: string) => Promise<void>;
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

export const useDatingFeedback = create<State>((set, get) => ({
  currentSession: null,
  results: [],
  isLoading: false,
  sessionsLoading: false,
  error: null,
  userSessions: [],

  createSessionFromLibrary: async (libraryItems: PhotoLibraryItem[], libraryPhotoIds: string[], creatorName?: string) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to create a photo feedback session.');
    }

    set({ isLoading: true, error: null });

    try {
      const sessionId = user.uid;
      const sessionRef = doc(db, 'photoBattles', sessionId);

      if (libraryItems.length === 0) {
        throw new Error('Upload at least one photo to start a battle.');
      }

      const selectionSet = new Set(libraryPhotoIds);
      const selectedItems =
        selectionSet.size > 0
          ? libraryItems.filter(item => selectionSet.has(item.id))
          : libraryItems;

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

  getNextPairs: async (sessionId: string, count = 10) => {
    try {
      const pairsCallable = httpsCallable<
        { sessionId: string; count: number },
        { pairs: Array<{ left: BattlePhoto; right: BattlePhoto }> }
      >(functionsClient, 'getNextPhotoPairs');
      const response = await pairsCallable({ sessionId, count });
      const { pairs } = response.data ?? {};
      if (!pairs || pairs.length === 0) {
        throw new Error('No pairs available for this battle.');
      }
      return pairs.map(pair => {
        const [normalizedLeft, normalizedRight] = normalizeBattlePhotos([pair.left, pair.right]);
        return { left: normalizedLeft, right: normalizedRight };
      });
    } catch (error) {
      console.error('Error fetching next battle pairs:', error);
      throw error;
    }
  },

  submitVote: async (sessionId: string, winnerId: string, loserId: string, skipReload = false) => {
    try {
      const voteCallable = httpsCallable<
        { sessionId: string; winnerId: string; loserId: string },
        void
      >(functionsClient, 'submitPhotoVote');
      await voteCallable({ sessionId, winnerId, loserId });

      if (!skipReload) {
        const sessionRef = doc(db, 'photoBattles', sessionId);
        const sessionDoc = await getDoc(sessionRef);
        if (sessionDoc.exists()) {
          const session = normalizeBattle({ ...(sessionDoc.data() as PhotoBattle & Record<string, any>) }, sessionDoc.id);
          set({ currentSession: session });
        }
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  },

  reloadSession: async (sessionId: string) => {
    try {
      const sessionRef = doc(db, 'photoBattles', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      if (sessionDoc.exists()) {
        const session = normalizeBattle({ ...(sessionDoc.data() as PhotoBattle & Record<string, any>) }, sessionDoc.id);
        set({ currentSession: session });
      }
    } catch (error) {
      console.error('Error reloading session:', error);
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

      // Delete photo storage files (main + thumbnail)
      if (ensuredRemovedPhoto.storagePath) {
        const storageRef = ref(storage, ensuredRemovedPhoto.storagePath);
        await deleteObject(storageRef).catch(error => {
          console.warn('Unable to delete battle photo file (continuing):', error);
        });
      }

      if (ensuredRemovedPhoto.thumbnailPath) {
        const thumbnailRef = ref(storage, ensuredRemovedPhoto.thumbnailPath);
        await deleteObject(thumbnailRef).catch(error => {
          console.warn('Unable to delete battle photo thumbnail (continuing):', error);
        });
      }

      // Note: We don't delete from library here - that's managed by usePhotoLibrary

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
      const mergeCallable = httpsCallable<
        { sessionId: string; targetPhotoId: string; mergedPhotoId: string },
        { success: boolean }
      >(functionsClient, 'mergePhotos');

      await mergeCallable({ sessionId, targetPhotoId, mergedPhotoId });

      const sessionRef = doc(db, 'photoBattles', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (sessionDoc.exists()) {
        const session = normalizeBattle(
          { ...(sessionDoc.data() as PhotoBattle & Record<string, any>) },
          sessionDoc.id
        );

        set(state => ({
          currentSession: state.currentSession?.id === sessionId ? session : state.currentSession,
          userSessions: state.userSessions.map(sess => (sess.id === sessionId ? session : sess)),
        }));
      }
    } catch (error) {
      console.error('Failed to merge battle photos:', error);
      throw error;
    }
  },

  loadResults: async (sessionId: string, secretKey: string) => {
    set({ isLoading: true, error: null });

    try {
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
  if (typeof window === 'undefined') return 'voter_' + Math.random().toString(36).substring(2, 10);

  let voterId = localStorage.getItem('photoFeedbackVoterId');
  if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('photoFeedbackVoterId', voterId);
  }
  return voterId;
}
