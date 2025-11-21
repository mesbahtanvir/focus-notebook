import '@testing-library/jest-dom'

// Mock Firebase modules to prevent initialization errors in tests
jest.mock('@/lib/firebaseClient', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' },
    onAuthStateChanged: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
  },
  db: {},
  googleProvider: {},
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date) => ({ toDate: () => date })),
  },
}))

// Mock Firebase Auth Context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id' },
    loading: false,
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}))

// Mock data gateway functions
jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn().mockResolvedValue(undefined),
  setAt: jest.fn().mockResolvedValue(undefined),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn().mockResolvedValue(undefined),
}))

// Mock data subscribe functions
jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn((query, callback) => {
    // Immediately call with empty data
    callback([], { fromCache: false, hasPendingWrites: false })
    // Return unsubscribe function
    return jest.fn()
  }),
}))