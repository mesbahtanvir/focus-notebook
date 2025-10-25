import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import type { IAuthService } from '../interfaces/IAuthService';

/**
 * Firebase implementation of authentication service
 */
export class FirebaseAuthService implements IAuthService {
  getCurrentUserId(): string | null {
    return auth.currentUser?.uid ?? null;
  }

  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  onAuthChange(callback: (userId: string | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user?.uid ?? null);
    });
  }
}

// Singleton instance for the app
export const firebaseAuthService = new FirebaseAuthService();

