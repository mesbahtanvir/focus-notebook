import type { IAuthService } from '../interfaces/IAuthService';

/**
 * Mock authentication service for testing
 */
export class MockAuthService implements IAuthService {
  private userId: string | null = 'test-user-id';
  private listeners: Array<(userId: string | null) => void> = [];

  getCurrentUserId(): string | null {
    return this.userId;
  }

  isAuthenticated(): boolean {
    return this.userId !== null;
  }

  onAuthChange(callback: (userId: string | null) => void): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Test helpers
  setUserId(userId: string | null): void {
    this.userId = userId;
    this.notifyListeners();
  }

  simulateLogin(userId: string): void {
    this.setUserId(userId);
  }

  simulateLogout(): void {
    this.setUserId(null);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.userId));
  }
}

