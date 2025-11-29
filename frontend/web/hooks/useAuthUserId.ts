import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Hook to get current authenticated user ID
 * Returns null if not authenticated or still loading
 */
export function useAuthUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  return userId;
}
