/**
 * Browser detection utilities
 * Used to determine optimal Firebase cache strategy
 */

/**
 * Detects if the current browser is Safari
 * Safari has known issues with Firebase's persistentLocalCache that can cause subscriptions to hang
 *
 * @returns true if Safari is detected, false otherwise
 */
export function isSafariBrowser(): boolean {
  if (typeof window === 'undefined') {
    return false; // SSR environment
  }

  const userAgent = navigator.userAgent;

  // Regex to detect Safari but exclude Chrome-based browsers
  // Safari user agents contain "Safari" but not "Chrome" or "Android"
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}

/**
 * Get browser name for logging
 */
export function getBrowserName(): string {
  if (typeof window === 'undefined') {
    return 'SSR';
  }

  const ua = navigator.userAgent;

  if (isSafariBrowser()) {
    return 'Safari';
  } else if (/chrome/i.test(ua)) {
    return 'Chrome';
  } else if (/firefox/i.test(ua)) {
    return 'Firefox';
  } else if (/edg/i.test(ua)) {
    return 'Edge';
  } else {
    return 'Unknown';
  }
}
