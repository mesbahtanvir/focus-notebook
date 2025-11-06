/**
 * Unit tests for Firebase Client initialization with browser-specific cache strategies
 * Tests Safari detection and appropriate cache selection
 */

import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: jest.fn(),
  EmailAuthProvider: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
}));

jest.mock('firebase/firestore', () => ({
  initializeFirestore: jest.fn(),
  persistentLocalCache: jest.fn(() => ({ type: 'persistent' })),
  persistentMultipleTabManager: jest.fn(() => ({ type: 'multiTab' })),
  memoryLocalCache: jest.fn(() => ({ type: 'memory' })),
}));

describe('Firebase Client - Browser Detection and Cache Strategy', () => {
  let originalNavigator: Navigator;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    originalNavigator = global.navigator;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Mock environment variables
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef';
  });

  const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(global.navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
      writable: true,
    });
  };

  describe('Safari Detection', () => {
    test('should detect Safari on macOS', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');

      // Re-require the module to trigger initialization with new navigator
      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(memoryLocalCache).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Safari detected')
      );
    });

    test('should detect Safari on iOS', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(memoryLocalCache).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Safari detected')
      );
    });

    test('should detect Safari on iPad', () => {
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(memoryLocalCache).toHaveBeenCalled();
    });

    test('should NOT detect Safari for Chrome on macOS', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(persistentLocalCache).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using persistent cache')
      );
    });

    test('should NOT detect Safari for Chrome on mobile', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(persistentLocalCache).toHaveBeenCalled();
    });

    test('should NOT detect Safari for Firefox', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(persistentLocalCache).toHaveBeenCalled();
    });

    test('should NOT detect Safari for Edge', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(persistentLocalCache).toHaveBeenCalled();
    });
  });

  describe('Cache Strategy Selection', () => {
    test('should use memory cache for Safari', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(initializeFirestore).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          localCache: expect.objectContaining({ type: 'memory' })
        })
      );
    });

    test('should use persistent cache with multi-tab for Chrome', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(persistentMultipleTabManager).toHaveBeenCalled();
      expect(persistentLocalCache).toHaveBeenCalledWith(
        expect.objectContaining({ tabManager: expect.anything() })
      );
    });

    test('should use persistent cache for Firefox', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0');

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(persistentLocalCache).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Fallback', () => {
    test('should fallback to memory cache if persistent cache initialization fails', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Mock persistent cache to throw error
      (initializeFirestore as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Persistent cache initialization failed');
      });

      jest.isolateModules(() => {
        require('@/lib/firebaseClient');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error initializing Firestore'),
        expect.any(Error)
      );

      // Should have attempted to initialize again with memory cache
      expect(initializeFirestore).toHaveBeenCalledTimes(2);
      expect(memoryLocalCache).toHaveBeenCalled();
    });

    test('should handle window undefined in SSR', () => {
      // Simulate SSR environment
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      jest.isolateModules(() => {
        const firebaseClient = require('@/lib/firebaseClient');
        expect(firebaseClient.db).toBeDefined();
      });

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Browser-Specific User Agents', () => {
    const testCases = [
      {
        name: 'Safari 17 macOS',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        expectedCache: 'memory',
      },
      {
        name: 'Safari 16 iOS',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        expectedCache: 'memory',
      },
      {
        name: 'Chrome 120 Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        expectedCache: 'persistent',
      },
      {
        name: 'Chrome 120 Android',
        userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        expectedCache: 'persistent',
      },
      {
        name: 'Firefox 120 Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        expectedCache: 'persistent',
      },
      {
        name: 'Edge 120 Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.121',
        expectedCache: 'persistent',
      },
      {
        name: 'Samsung Internet Mobile',
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
        expectedCache: 'persistent',
      },
    ];

    testCases.forEach(({ name, userAgent, expectedCache }) => {
      test(`should use ${expectedCache} cache for ${name}`, () => {
        mockUserAgent(userAgent);

        jest.isolateModules(() => {
          require('@/lib/firebaseClient');
        });

        if (expectedCache === 'memory') {
          expect(memoryLocalCache).toHaveBeenCalled();
        } else {
          expect(persistentLocalCache).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Exports', () => {
    beforeEach(() => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    });

    test('should export auth instance', () => {
      jest.isolateModules(() => {
        const { auth } = require('@/lib/firebaseClient');
        expect(auth).toBeDefined();
      });
    });

    test('should export db instance', () => {
      jest.isolateModules(() => {
        const { db } = require('@/lib/firebaseClient');
        expect(db).toBeDefined();
      });
    });

    test('should export functionsClient instance', () => {
      jest.isolateModules(() => {
        const { functionsClient } = require('@/lib/firebaseClient');
        expect(functionsClient).toBeDefined();
      });
    });

    test('should export auth providers', () => {
      jest.isolateModules(() => {
        const { googleProvider, emailProvider } = require('@/lib/firebaseClient');
        expect(googleProvider).toBeDefined();
        expect(emailProvider).toBeDefined();
      });
    });
  });
});
