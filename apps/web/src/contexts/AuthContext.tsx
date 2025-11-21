"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  linkWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebaseClient';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAnonymousSession } from '@/store/useAnonymousSession';
import { visibilityManager } from '@/lib/firebase/visibility-manager';

const ANONYMOUS_SESSION_COLLECTION = 'anonymousSessions';
const ANONYMOUS_SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLIENT_ANONYMOUS_AI_OVERRIDE_KEY = process.env.NEXT_PUBLIC_ANONYMOUS_AI_OVERRIDE_KEY;

// Token refresh configuration
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes (tokens expire after 1 hour)
const TOKEN_AGE_THRESHOLD = 50 * 60 * 1000; // 50 minutes - refresh on visibility change if older

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  anonymousSessionExpiresAt: Date | null;
  anonymousSessionExpired: boolean;
  isAnonymousAiAllowed: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  linkAnonymousToEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAnonymous: false,
  anonymousSessionExpiresAt: null,
  anonymousSessionExpired: false,
  isAnonymousAiAllowed: false,
  signInWithGoogle: async () => {},
  signInAnonymously: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  sendPasswordResetEmail: async () => {},
  linkAnonymousToEmail: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [anonymousSessionExpiresAt, setAnonymousSessionExpiresAt] = useState<Date | null>(null);
  const [anonymousSessionExpired, setAnonymousSessionExpired] = useState(false);
  const expirationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTokenRefreshRef = useRef<number>(Date.now());
  const setAnonymousSession = useAnonymousSession((state) => state.setSession);
  const clearAnonymousSession = useAnonymousSession((state) => state.clearSession);
  const markAnonymousSessionExpired = useAnonymousSession((state) => state.markExpired);
  const allowAnonymousAi = useAnonymousSession((state) => state.allowAi);

  const clearExpirationTimer = useCallback(() => {
    if (expirationTimeoutRef.current) {
      clearTimeout(expirationTimeoutRef.current);
      expirationTimeoutRef.current = null;
    }
  }, []);

  const clearTokenRefreshTimer = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
  }, []);

  /**
   * Proactively refresh auth token
   * This prevents auth errors when returning to background tabs
   */
  const refreshAuthToken = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    try {
      console.log('[AuthContext] Refreshing auth token...');
      await currentUser.getIdToken(forceRefresh);
      lastTokenRefreshRef.current = Date.now();
      console.log('[AuthContext] Token refreshed successfully');
    } catch (error) {
      console.error('[AuthContext] Token refresh failed:', error);
      // Don't throw - let the app continue and handle auth errors in operations
    }
  }, []);

  const handleAnonymousExpiration = useCallback(
    async (uid: string) => {
      clearExpirationTimer();
      try {
        const sessionRef = doc(db, ANONYMOUS_SESSION_COLLECTION, uid);
        await setDoc(
          sessionRef,
          {
            status: 'expired',
            cleanupPending: true,
            expiredAt: Timestamp.fromMillis(Date.now()),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Failed to mark anonymous session as expired:', error);
      }

      markAnonymousSessionExpired();
      setAnonymousSessionExpired(true);
      setAnonymousSessionExpiresAt(null);

      try {
        await firebaseSignOut(auth);
      } catch (error) {
        console.error('Error signing out expired anonymous session:', error);
      }
    },
    [clearExpirationTimer, markAnonymousSessionExpired]
  );

  const scheduleAnonymousSignOut = useCallback(
    (uid: string, expiresAtMillis: number) => {
      clearExpirationTimer();

      const timeUntilExpiration = expiresAtMillis - Date.now();

      if (timeUntilExpiration <= 0) {
        void (async () => {
          await handleAnonymousExpiration(uid);
        })();
        return;
      }

      expirationTimeoutRef.current = setTimeout(() => {
        void (async () => {
          await handleAnonymousExpiration(uid);
        })();
      }, timeUntilExpiration);
    },
    [clearExpirationTimer, handleAnonymousExpiration]
  );

  const synchronizeAnonymousSession = useCallback(
    async (currentUser: User) => {
      const uid = currentUser.uid;
      try {
        const sessionRef = doc(db, ANONYMOUS_SESSION_COLLECTION, uid);
        const sessionSnap = await getDoc(sessionRef);
        const now = Date.now();
        const defaultExpiresAt = now + ANONYMOUS_SESSION_DURATION_MS;
        const expiresAtTimestamp = Timestamp.fromMillis(defaultExpiresAt);

        const existingData = sessionSnap.data();
        const ciOverrideKey = existingData?.ciOverrideKey ?? null;
        const overrideMatch =
          ciOverrideKey && CLIENT_ANONYMOUS_AI_OVERRIDE_KEY && ciOverrideKey === CLIENT_ANONYMOUS_AI_OVERRIDE_KEY;
        const allowAi = existingData?.allowAi === true || !!overrideMatch;
        const expiresAt = existingData?.expiresAt?.toMillis?.() ?? defaultExpiresAt;
        const cleanupPending = existingData?.cleanupPending === true;

        if (!sessionSnap.exists()) {
          await setDoc(sessionRef, {
            uid,
            createdAt: Timestamp.fromMillis(now),
            expiresAt: expiresAtTimestamp,
            cleanupPending: false,
            allowAi: false,
            ciOverrideKey: null,
            status: 'active',
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(sessionRef, {
            expiresAt: Timestamp.fromMillis(expiresAt),
            updatedAt: serverTimestamp(),
            status: 'active',
            cleanupPending: false,
          });
        }

        const expiresAtDate = new Date(expiresAt);
        setAnonymousSession({
          uid,
          expiresAt: expiresAtDate.toISOString(),
          allowAi,
          cleanupPending,
          ciOverrideKey,
        });

        setAnonymousSessionExpiresAt(expiresAtDate);
        setAnonymousSessionExpired(false);

        scheduleAnonymousSignOut(uid, expiresAt);
      } catch (error) {
        console.error('Failed to synchronize anonymous session metadata:', error);
      }
    },
    [scheduleAnonymousSignOut, setAnonymousSession]
  );

  // Set up proactive token refresh when user changes
  useEffect(() => {
    if (!user) {
      clearTokenRefreshTimer();
      return;
    }

    console.log('[AuthContext] Setting up proactive token refresh');

    // Initial refresh
    refreshAuthToken(false);

    // Periodic refresh every 45 minutes
    tokenRefreshIntervalRef.current = setInterval(() => {
      refreshAuthToken(true); // Force refresh
    }, TOKEN_REFRESH_INTERVAL);

    return () => {
      clearTokenRefreshTimer();
    };
  }, [user, refreshAuthToken, clearTokenRefreshTimer]);

  // Handle visibility changes - refresh token if tab was in background for a while
  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribeVisibility = visibilityManager.onVisibilityChange(
      async (isBackground, backgroundDuration) => {
        if (isBackground || backgroundDuration === undefined) {
          return;
        }

        // Tab returned to foreground
        const tokenAge = Date.now() - lastTokenRefreshRef.current;

        // If token is older than threshold OR tab was background for a while, refresh
        if (tokenAge > TOKEN_AGE_THRESHOLD || backgroundDuration > TOKEN_AGE_THRESHOLD) {
          console.log(
            `[AuthContext] Tab returned to foreground. Token age: ${Math.round(tokenAge / 1000)}s, ` +
            `Background duration: ${Math.round(backgroundDuration / 1000)}s. Refreshing token...`
          );
          await refreshAuthToken(true); // Force refresh
        }
      }
    );

    return unsubscribeVisibility;
  }, [user, refreshAuthToken]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log('[AuthContext] Auth state changed:', {
        hasUser: !!authUser,
        userId: authUser?.uid,
        isAnonymous: authUser?.isAnonymous,
        email: authUser?.email
      });

      setUser(authUser);
      setLoading(false);

      if (authUser?.isAnonymous) {
        await synchronizeAnonymousSession(authUser);
      } else {
        clearExpirationTimer();
        setAnonymousSessionExpiresAt(null);
        setAnonymousSessionExpired(false);
        clearAnonymousSession();
      }

      if (authUser) {
        console.log('✅ [AuthContext] User authenticated:', authUser.email || authUser.uid);
      } else {
        console.log('👋 [AuthContext] User logged out');
      }
    });

    return () => {
      clearExpirationTimer();
      clearTokenRefreshTimer();
      unsubscribe();
    };
  }, [clearAnonymousSession, clearExpirationTimer, clearTokenRefreshTimer, synchronizeAnonymousSession]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const handleSignInAnonymously = async () => {
    try {
      const credential = await signInAnonymously(auth);
      const anonymousUser = credential.user;
      if (anonymousUser) {
        await synchronizeAnonymousSession(anonymousUser);
      }
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
    }
  };

  const handleSignInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  const handleSendPasswordResetEmail = async (email: string) => {
    try {
      await firebaseSendPasswordReset(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  const handleLinkAnonymousToEmail = async (email: string, password: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.isAnonymous) {
        throw new Error('Current user is not anonymous');
      }

      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(currentUser, credential);
    } catch (error) {
      console.error('Error linking anonymous account:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser?.isAnonymous) {
        try {
          const sessionRef = doc(db, ANONYMOUS_SESSION_COLLECTION, currentUser.uid);
          await setDoc(
            sessionRef,
            {
              status: 'signed-out',
              cleanupPending: true,
              signedOutAt: Timestamp.fromMillis(Date.now()),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error('Failed to mark anonymous session for cleanup:', error);
        }
      }
      await firebaseSignOut(auth);
      clearExpirationTimer();
      setAnonymousSessionExpiresAt(null);
      setAnonymousSessionExpired(false);
      clearAnonymousSession();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAnonymous: user?.isAnonymous || false,
    anonymousSessionExpiresAt,
    anonymousSessionExpired,
    isAnonymousAiAllowed: !user?.isAnonymous || allowAnonymousAi,
    signInWithGoogle,
    signInAnonymously: handleSignInAnonymously,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    sendPasswordResetEmail: handleSendPasswordResetEmail,
    linkAnonymousToEmail: handleLinkAnonymousToEmail,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
