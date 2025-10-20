import '@testing-library/jest-dom'

// Mock Firebase modules to prevent initialization errors in tests
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
  },
  db: {},
  googleProvider: {},
}))

// Mock Firebase Auth Context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}))

// Mock window.indexedDB for tests
Object.defineProperty(global, 'indexedDB', {
  writable: true,
  value: undefined,
})