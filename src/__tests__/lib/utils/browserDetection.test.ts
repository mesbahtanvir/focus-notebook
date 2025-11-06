/**
 * Unit tests for browser detection utility
 * Tests Safari detection and browser identification
 */

import { isSafariBrowser, getBrowserName } from '@/lib/utils/browserDetection';

describe('Browser Detection', () => {
  let originalNavigator: Navigator;
  let originalWindow: Window & typeof globalThis;

  beforeAll(() => {
    originalNavigator = global.navigator;
    originalWindow = global.window;
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    global.window = originalWindow;
  });

  const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(global.navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
      writable: true,
    });
  };

  describe('isSafariBrowser', () => {
    describe('Safari Detection', () => {
      test('should detect Safari on macOS', () => {
        mockUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        );
        expect(isSafariBrowser()).toBe(true);
      });

      test('should detect Safari on iOS iPhone', () => {
        mockUserAgent(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        );
        expect(isSafariBrowser()).toBe(true);
      });

      test('should detect Safari on iOS iPad', () => {
        mockUserAgent(
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        );
        expect(isSafariBrowser()).toBe(true);
      });

      test('should detect Safari 16 on macOS', () => {
        mockUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15'
        );
        expect(isSafariBrowser()).toBe(true);
      });
    });

    describe('Non-Safari Detection', () => {
      test('should NOT detect Safari for Chrome on macOS', () => {
        mockUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        expect(isSafariBrowser()).toBe(false);
      });

      test('should NOT detect Safari for Chrome on Windows', () => {
        mockUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        expect(isSafariBrowser()).toBe(false);
      });

      test('should NOT detect Safari for Chrome on Android', () => {
        mockUserAgent(
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        );
        expect(isSafariBrowser()).toBe(false);
      });

      test('should NOT detect Safari for Firefox', () => {
        mockUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0'
        );
        expect(isSafariBrowser()).toBe(false);
      });

      test('should NOT detect Safari for Edge', () => {
        mockUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        );
        expect(isSafariBrowser()).toBe(false);
      });

      test('should NOT detect Safari for Samsung Internet', () => {
        mockUserAgent(
          'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36'
        );
        expect(isSafariBrowser()).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      test('should return false in SSR environment (no window)', () => {
        // @ts-ignore
        delete global.window;
        expect(isSafariBrowser()).toBe(false);
        // Restore window
        global.window = originalWindow;
      });

      test('should handle empty user agent', () => {
        mockUserAgent('');
        expect(isSafariBrowser()).toBe(false);
      });
    });
  });

  describe('getBrowserName', () => {
    test('should return "Safari" for Safari on macOS', () => {
      mockUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      );
      expect(getBrowserName()).toBe('Safari');
    });

    test('should return "Safari" for Safari on iOS', () => {
      mockUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
      expect(getBrowserName()).toBe('Safari');
    });

    test('should return "Chrome" for Chrome', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      expect(getBrowserName()).toBe('Chrome');
    });

    test('should return "Firefox" for Firefox', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
      );
      expect(getBrowserName()).toBe('Firefox');
    });

    test('should return "Edge" for Edge', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      );
      expect(getBrowserName()).toBe('Edge');
    });

    test('should return "SSR" in server environment', () => {
      // @ts-ignore
      delete global.window;
      expect(getBrowserName()).toBe('SSR');
      // Restore window
      global.window = originalWindow;
    });

    test('should return "Unknown" for unrecognized browser', () => {
      mockUserAgent('Custom Browser/1.0');
      expect(getBrowserName()).toBe('Unknown');
    });
  });

  describe('Real World User Agents', () => {
    const testCases = [
      {
        name: 'Safari 17 macOS Ventura',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        expectedSafari: true,
        expectedName: 'Safari',
      },
      {
        name: 'Safari 16 iOS 16',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        expectedSafari: true,
        expectedName: 'Safari',
      },
      {
        name: 'Chrome 120 Desktop',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        expectedSafari: false,
        expectedName: 'Chrome',
      },
      {
        name: 'Chrome 120 Android',
        userAgent:
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        expectedSafari: false,
        expectedName: 'Chrome',
      },
      {
        name: 'Firefox 120 Desktop',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        expectedSafari: false,
        expectedName: 'Firefox',
      },
      {
        name: 'Edge 120 Desktop',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.121',
        expectedSafari: false,
        expectedName: 'Edge',
      },
      {
        name: 'Samsung Internet',
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
        expectedSafari: false,
        expectedName: 'Chrome', // Samsung Internet contains "chrome"
      },
    ];

    testCases.forEach(({ name, userAgent, expectedSafari, expectedName }) => {
      test(`should correctly detect ${name}`, () => {
        mockUserAgent(userAgent);
        expect(isSafariBrowser()).toBe(expectedSafari);
        expect(getBrowserName()).toBe(expectedName);
      });
    });
  });
});
