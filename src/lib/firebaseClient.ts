import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Detect Safari browser
// Safari has issues with persistentLocalCache that can cause subscriptions to hang
const isSafari = typeof window !== 'undefined' &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Initialize Firestore with appropriate cache strategy
// Use memory cache for Safari to avoid IndexedDB issues
let firestoreDb;
try {
  if (isSafari) {
    console.log('[Firebase] Safari detected, using memory cache for compatibility');
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
  } else {
    console.log('[Firebase] Using persistent cache with multi-tab support');
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  }
} catch (error) {
  console.error('[Firebase] Error initializing Firestore with preferred cache, falling back to memory cache:', error);
  // Fallback to memory cache if persistent cache fails
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
}

export const db = firestoreDb;

export const functionsClient = getFunctions(app);

export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
