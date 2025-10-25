/**
 * Authentication service interface
 * Abstracts auth operations for testing and flexibility
 */
export interface IAuthService {
  /**
   * Get the current authenticated user's ID
   * @returns User ID or null if not authenticated
   */
  getCurrentUserId(): string | null;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Subscribe to authentication state changes
   * @param callback Called when auth state changes
   * @returns Unsubscribe function
   */
  onAuthChange(callback: (userId: string | null) => void): () => void;
}

