import { create } from 'zustand';
import { collection, doc, query, where, getDocs, setDoc, getDoc, deleteDoc, Timestamp, orderBy, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebaseClient';

export interface PhotoSession {
  id: string;
  ownerId: string;
  creatorName?: string; // Optional
  isPublic?: boolean;
  photos: {
    id: string;
    url: string;
    storagePath: string;
    libraryId?: string;
  }[];
  secretKey: string; // For accessing results
  expiresAt: string; // ISO date
  createdAt: string;
}

export interface PhotoVote {
  id: string;
  sessionId: string;
  photoId: string;
  vote: 'yes' | 'no';
  voterId: string; // Anonymous ID
  createdAt: string;
  comment?: string;
}

export interface VoteResults {
  photoId: string;
  photoUrl: string;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  percentage: number; // Percentage of yes votes
}

export interface PhotoStats {
  yesVotes: number;
  totalVotes: number;
  sessionCount: number;
}

export interface PhotoLibraryItem {
  id: string;
  ownerId: string;
  url: string;
  storagePath: string;
  createdAt: string;
  stats?: PhotoStats;
}

type State = {
  currentSession: PhotoSession | null;
  votes: PhotoVote[];
  results: VoteResults[];
  isLoading: boolean;
  sessionsLoading: boolean;
  libraryLoading: boolean;
  error: string | null;
  userSessions: PhotoSession[];
  library: PhotoLibraryItem[];

  // Actions
  createSessionFromLibrary: (libraryPhotoIds: string[], creatorName?: string) => Promise<{ sessionId: string; secretKey: string }>;
  uploadToLibrary: (photos: File[], onProgress?: (uploaded: number, total: number) => void) => Promise<PhotoLibraryItem[]>;
  loadLibrary: () => Promise<PhotoLibraryItem[]>;
  deleteLibraryPhoto: (photoId: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<PhotoSession | null>;
  submitVote: (sessionId: string, photoId: string, vote: 'yes' | 'no', voterId: string, comment?: string) => Promise<void>;
  loadResults: (sessionId: string, secretKey: string) => Promise<VoteResults[]>;
  checkSessionExpired: (session: PhotoSession) => boolean;
  loadUserSessions: () => Promise<PhotoSession[]>;
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
  votes: [],
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
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // 3 days from now

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

      const sessionPhotos = selectedItems.map((item, index) => ({
        id: `${sessionId}_${index}`,
        url: item.url,
        storagePath: item.storagePath,
        libraryId: item.id,
      }));

      // Create session document
      const session: PhotoSession = {
        id: sessionId,
        ownerId: user.uid,
        creatorName,
        photos: sessionPhotos,
        secretKey,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        isPublic: false,
      };

      const sessionRef = doc(db, 'photoSessions', sessionId);
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

  uploadToLibrary: async (photos: File[], onProgress?: (uploaded: number, total: number) => void) => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error('You must be signed in to upload photos.');
    }

    set({ libraryLoading: true, error: null });

    try {
      const uploaded: PhotoLibraryItem[] = [];
      for (const file of photos) {
        const photoId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const storagePath = `users/${user.uid}/photo-library/${photoId}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file, {
          contentType: file.type || 'image/jpeg',
        });
        const url = await getDownloadURL(storageRef);

        const docRef = doc(db, `users/${user.uid}/photoLibrary`, photoId);
        const item: PhotoLibraryItem = {
          id: photoId,
          ownerId: user.uid,
          url,
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
      const items = snaps.docs.map(doc => doc.data() as PhotoLibraryItem);
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

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const sessionRef = doc(db, 'photoSessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        set({ error: 'Session not found', isLoading: false });
        return null;
      }

      const session = sessionDoc.data() as PhotoSession;

      // Check if expired
      if (get().checkSessionExpired(session)) {
        set({ error: 'This session has expired', isLoading: false });
        return null;
      }

      set({ currentSession: session, isLoading: false });
      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      set({ error: 'Failed to load session', isLoading: false });
      return null;
    }
  },

  submitVote: async (sessionId: string, photoId: string, vote: 'yes' | 'no', voterId: string, comment?: string) => {
    try {
      const voteId = `${sessionId}_${photoId}_${voterId}`;
      const voteRef = doc(db, 'photoSessions', sessionId, 'votes', voteId);

      const voteData: PhotoVote = {
        id: voteId,
        sessionId,
        photoId,
        vote,
        voterId,
        createdAt: new Date().toISOString(),
      };
      if (comment && comment.trim()) {
        voteData.comment = comment.trim();
      }

      await setDoc(voteRef, voteData);

      const session = get().currentSession;
      const photo = session?.photos.find(p => p.id === photoId);
      const ownerId = session?.ownerId;
      if (photo?.libraryId && ownerId) {
        await updateLibraryStats(ownerId, photo.libraryId, vote, sessionId);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  },

  loadResults: async (sessionId: string, secretKey: string) => {
    set({ isLoading: true, error: null });

    try {
      // Verify secret key
      const sessionRef = doc(db, 'photoSessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        set({ error: 'Session not found', isLoading: false });
        return [];
      }

      const session = sessionDoc.data() as PhotoSession;

      if (session.secretKey !== secretKey) {
        set({ error: 'Invalid secret key', isLoading: false });
        return [];
      }

      // Load all votes
      const votesRef = collection(db, 'photoSessions', sessionId, 'votes');
      const votesSnapshot = await getDocs(votesRef);
      const votes = votesSnapshot.docs.map(doc => doc.data() as PhotoVote);

      // Calculate results for each photo
      const results: VoteResults[] = session.photos.map(photo => {
        const photoVotes = votes.filter(v => v.photoId === photo.id);
        const yesVotes = photoVotes.filter(v => v.vote === 'yes').length;
        const noVotes = photoVotes.filter(v => v.vote === 'no').length;
        const totalVotes = photoVotes.length;
        const percentage = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

        return {
          photoId: photo.id,
          photoUrl: photo.url,
          yesVotes,
          noVotes,
          totalVotes,
          percentage,
        };
      });

      // Sort by percentage (highest first)
      results.sort((a, b) => b.percentage - a.percentage);

      set({ results, votes, isLoading: false });
      return results;
    } catch (error) {
      console.error('Error loading results:', error);
      set({ error: 'Failed to load results', isLoading: false });
      return [];
    }
  },

  checkSessionExpired: (session: PhotoSession) => {
    return new Date(session.expiresAt) < new Date();
  },

  loadUserSessions: async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      return [];
    }

    set({ sessionsLoading: true, error: null });

    try {
      const sessionsRef = collection(db, 'photoSessions');
      const q = query(
        sessionsRef,
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => doc.data() as PhotoSession);
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
      await updateDoc(doc(db, 'photoSessions', sessionId), { isPublic });
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

async function updateLibraryStats(ownerId: string, libraryId: string, vote: 'yes' | 'no', sessionId: string) {
  const statsRef = doc(db, `users/${ownerId}/photoLibrary/${libraryId}`);

  try {
    const snap = await getDoc(statsRef);
    if (!snap.exists()) return;

    const data = snap.data() as PhotoLibraryItem;
    const sessionIds = (data as any).sessionIds || [];
    const alreadyCounted = sessionIds.includes(sessionId);

    const updates: any = {
      totalVotes: increment(1),
      yesVotes: vote === 'yes' ? increment(1) : increment(0),
      lastVotedAt: Timestamp.fromDate(new Date()),
    };

    if (!alreadyCounted) {
      updates.sessionCount = increment(1);
      updates.sessionIds = arrayUnion(sessionId);
    }

    await updateDoc(statsRef, updates);
  } catch (error) {
    console.error('Failed to update library stats', error);
  }
}
