"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { smartSync } from '@/lib/syncEngine';
import { useTasks } from '@/store/useTasks';
import { useThoughts } from '@/store/useThoughts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      // Automatically sync data when user logs in (smart merge)
      if (user) {
        try {
          console.log('🔄 User logged in, performing smart sync...');
          const result = await smartSync();
          if (result.success) {
            console.log(`✅ Login sync: ${result.mergedItems} items synced, ${result.conflicts} conflicts resolved`);
            
            // Reload all stores to reflect merged data
            await Promise.all([
              useTasks.getState().loadTasks(),
              useThoughts.getState().loadThoughts(),
            ]);
            console.log('✅ All stores reloaded with merged data');
          } else {
            console.error('❌ Failed to sync data:', result.error);
          }
        } catch (error) {
          console.error('❌ Error syncing data on login:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
