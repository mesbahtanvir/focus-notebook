/**
 * Unit tests for Firebase Client initialization
 * Tests that Firebase is properly initialized with browser-specific cache strategies
 */

import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseFunctions from 'firebase/functions';
import * as firebaseFirestore from 'firebase/firestore';

// Mock Firebase modules
jest.mock('firebase/app');
jest.mock('firebase/auth');
jest.mock('firebase/functions');
jest.mock('firebase/firestore');

// Mock browser detection
jest.mock('@/lib/utils/browserDetection');

describe('Firebase Client Initialization', () => {
  let mockApp: any;
  let mockAuth: any;
  let mockDb: any;
  let mockFunctions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mock values
    mockApp = { name: '[DEFAULT]' };
    mockAuth = { currentUser: null };
    mockDb = { type: 'firestore' };
    mockFunctions = { region: 'us-central1' };

    // Mock Firebase App
    (firebaseApp.getApps as jest.Mock).mockReturnValue([]);
    (firebaseApp.initializeApp as jest.Mock).mockReturnValue(mockApp);

    // Mock Firebase Auth
    (firebaseAuth.getAuth as jest.Mock).mockReturnValue(mockAuth);
    (firebaseAuth.GoogleAuthProvider as jest.Mock).mockImplementation(() => ({
      setCustomParameters: jest.fn(),
    }));
    (firebaseAuth.EmailAuthProvider as jest.Mock).mockImplementation(() => ({}));

    // Mock Firebase Functions
    (firebaseFunctions.getFunctions as jest.Mock).mockReturnValue(mockFunctions);

    // Mock Firebase Firestore
    (firebaseFirestore.initializeFirestore as jest.Mock).mockReturnValue(mockDb);
    (firebaseFirestore.memoryLocalCache as jest.Mock).mockReturnValue({ type: 'memory' });
    (firebaseFirestore.persistentLocalCache as jest.Mock).mockReturnValue({ type: 'persistent' });
    (firebaseFirestore.persistentMultipleTabManager as jest.Mock).mockReturnValue({ type: 'multiTab' });

    // Mock environment variables
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef';
  });

  describe('Module Exports', () => {
    test('should export auth instance', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      const firebaseClient = require('@/lib/firebaseClient');

      expect(firebaseClient.auth).toBeDefined();
      expect(firebaseClient.auth).toBe(mockAuth);
    });

    test('should export db instance', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      const firebaseClient = require('@/lib/firebaseClient');

      expect(firebaseClient.db).toBeDefined();
      expect(firebaseClient.db).toBe(mockDb);
    });

    test('should export functionsClient instance', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      const firebaseClient = require('@/lib/firebaseClient');

      expect(firebaseClient.functionsClient).toBeDefined();
      expect(firebaseClient.functionsClient).toBe(mockFunctions);
    });

    test('should export googleProvider', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      const firebaseClient = require('@/lib/firebaseClient');

      expect(firebaseClient.googleProvider).toBeDefined();
    });

    test('should export emailProvider', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      const firebaseClient = require('@/lib/firebaseClient');

      expect(firebaseClient.emailProvider).toBeDefined();
    });

    test('should export default app', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      const firebaseClient = require('@/lib/firebaseClient');

      expect(firebaseClient.default).toBeDefined();
      expect(firebaseClient.default).toBe(mockApp);
    });
  });

  describe('Cache Strategy Selection', () => {
    test('should use memory cache when Safari is detected', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(true);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Safari');

      require('@/lib/firebaseClient');

      expect(firebaseFirestore.memoryLocalCache).toHaveBeenCalled();
      expect(firebaseFirestore.initializeFirestore).toHaveBeenCalledWith(
        mockApp,
        expect.objectContaining({
          localCache: expect.anything(),
        })
      );
    });

    test('should use persistent cache when non-Safari browser is detected', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      require('@/lib/firebaseClient');

      expect(firebaseFirestore.persistentLocalCache).toHaveBeenCalled();
      expect(firebaseFirestore.persistentMultipleTabManager).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should fallback to memory cache if Firestore initialization fails', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      // Mock first call to throw error, second call to succeed
      (firebaseFirestore.initializeFirestore as jest.Mock)
        .mockImplementationOnce(() => {
          throw new Error('Persistent cache initialization failed');
        })
        .mockReturnValueOnce(mockDb);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      require('@/lib/firebaseClient');

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error initializing Firestore'),
        expect.any(Error)
      );

      // Should fallback to memory cache
      expect(firebaseFirestore.memoryLocalCache).toHaveBeenCalled();
      expect(firebaseFirestore.initializeFirestore).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Firebase App Initialization', () => {
    test('should initialize Firebase app with correct config', () => {
      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      require('@/lib/firebaseClient');

      expect(firebaseApp.initializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:abcdef',
      });
    });

    test('should reuse existing app if already initialized', () => {
      (firebaseApp.getApps as jest.Mock).mockReturnValue([mockApp]);

      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      require('@/lib/firebaseClient');

      expect(firebaseApp.initializeApp).not.toHaveBeenCalled();
    });
  });

  describe('Google Provider Configuration', () => {
    test('should configure Google provider with select_account prompt', () => {
      const mockGoogleProvider = {
        setCustomParameters: jest.fn(),
      };
      (firebaseAuth.GoogleAuthProvider as jest.Mock).mockImplementation(() => mockGoogleProvider);

      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      require('@/lib/firebaseClient');

      expect(mockGoogleProvider.setCustomParameters).toHaveBeenCalledWith({
        prompt: 'select_account',
      });
    });
  });

  describe('Console Logging', () => {
    test('should log Safari detection for Safari browser', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(true);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Safari');

      require('@/lib/firebaseClient');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Safari detected')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('memory cache')
      );

      consoleLogSpy.mockRestore();
    });

    test('should log persistent cache for non-Safari browser', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const browserDetection = require('@/lib/utils/browserDetection');
      browserDetection.isSafariBrowser = jest.fn().mockReturnValue(false);
      browserDetection.getBrowserName = jest.fn().mockReturnValue('Chrome');

      require('@/lib/firebaseClient');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Chrome detected')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('persistent cache')
      );

      consoleLogSpy.mockRestore();
    });
  });
});
