import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider, getToken as getAppCheckToken, AppCheck } from "firebase/app-check";
import { isSafariBrowser, getBrowserName } from "@/lib/utils/browserDetection";

function normalizeStorageBucket(rawBucket?: string): string {
  if (!rawBucket) {
    // During build time, return a placeholder value instead of throwing
    if (typeof window === 'undefined') {
      return 'placeholder.firebasestorage.app';
    }
    throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');
  }

  let bucket = rawBucket.trim();

  if (!bucket) {
    // During build time, return a placeholder value instead of throwing
    if (typeof window === 'undefined') {
      return 'placeholder.firebasestorage.app';
    }
    throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET cannot be empty');
  }

  bucket = bucket.replace(/^gs:\/\//, '');

  // Default to the new naming convention when no domain suffix is provided
  if (!bucket.includes('.')) {
    console.info(
      '[Firebase] Storage bucket missing domain suffix; defaulting to ".firebasestorage.app" per Oct 2024 policy.'
    );
    bucket = `${bucket}.firebasestorage.app`;
  }

  if (bucket.endsWith('.firebasestorage.app')) {
    return bucket;
  }

  if (bucket.endsWith('.appspot.com')) {
    console.warn(
      '[Firebase] Using legacy ".appspot.com" Storage bucket. Consider migrating to the ".firebasestorage.app" format for new projects.'
    );
    return bucket;
  }

  return bucket;
}

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'placeholder',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder',
    storageBucket: normalizeStorageBucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '0',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'placeholder',
  };
}

const firebaseConfig = getFirebaseConfig();
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Detect Safari browser
// Safari has issues with persistentLocalCache that can cause subscriptions to hang
const isSafari = isSafariBrowser();

// Initialize Firestore with appropriate cache strategy
// Use memory cache for Safari to avoid IndexedDB issues
let firestoreDb;
try {
  if (isSafari) {
    console.log(`[Firebase] ${getBrowserName()} detected, using memory cache for compatibility`);
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
  } else {
    console.log(`[Firebase] ${getBrowserName()} detected, using persistent cache with multi-tab support`);
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

export const storage = getStorage(app);

export const functionsClient = getFunctions(app);

let appCheckInstance: AppCheck | null = null;
let attemptedAppCheckInit = false;
let appCheckWarningLogged = false;

function initializeAppCheckIfNeeded() {
  if (appCheckInstance || attemptedAppCheckInit) {
    return appCheckInstance;
  }
  attemptedAppCheckInit = true;

  if (typeof window === 'undefined') {
    return null;
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;

  if (!siteKey) {
    if (!appCheckWarningLogged) {
      console.warn('[Firebase] App Check site key is not configured; callable functions that enforce App Check may reject requests.');
      appCheckWarningLogged = true;
    }
    return null;
  }

  if (debugToken) {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken;
  }

  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheckInstance;
}

export async function getClientAppCheckToken(forceRefresh = false): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const instance = initializeAppCheckIfNeeded();
  if (!instance) {
    return null;
  }

  try {
    const { token } = await getAppCheckToken(instance, forceRefresh);
    return token;
  } catch (error) {
    console.warn('[Firebase] Unable to fetch App Check token:', error);
    return null;
  }
}

export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
