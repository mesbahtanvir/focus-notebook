import { create } from 'zustand';
import { collection, doc, query, where, getDocs, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebaseClient';

export interface PhotoSession {
  id: string;
  creatorName?: string; // Optional
  photos: {
    id: string;
    url: string;
    storagePath: string;
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
}

export interface VoteResults {
  photoId: string;
  photoUrl: string;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  percentage: number; // Percentage of yes votes
}

type State = {
  currentSession: PhotoSession | null;
  votes: PhotoVote[];
  results: VoteResults[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createSession: (photos: File[], creatorName?: string) => Promise<{ sessionId: string; secretKey: string }>;
  loadSession: (sessionId: string) => Promise<PhotoSession | null>;
  submitVote: (sessionId: string, photoId: string, vote: 'yes' | 'no', voterId: string) => Promise<void>;
  loadResults: (sessionId: string, secretKey: string) => Promise<VoteResults[]>;
  checkSessionExpired: (session: PhotoSession) => boolean;
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
  error: null,

  createSession: async (photos: File[], creatorName?: string) => {
    set({ isLoading: true, error: null });

    try {
      const sessionId = Date.now().toString();
      const secretKey = generateSecretKey();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // 3 days from now

      // Upload photos to Firebase Storage
      const uploadedPhotos = await Promise.all(
        photos.map(async (file, index) => {
          const photoId = `${sessionId}_${index}`;
          const storagePath = `photo-feedback/${sessionId}/${photoId}`;
          const storageRef = ref(storage, storagePath);

          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);

          return {
            id: photoId,
            url,
            storagePath,
          };
        })
      );

      // Create session document
      const session: PhotoSession = {
        id: sessionId,
        creatorName,
        photos: uploadedPhotos,
        secretKey,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      };

      const sessionRef = doc(db, 'photoSessions', sessionId);
      await setDoc(sessionRef, session);

      set({ currentSession: session, isLoading: false });
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

  submitVote: async (sessionId: string, photoId: string, vote: 'yes' | 'no', voterId: string) => {
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

      await setDoc(voteRef, voteData);
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
