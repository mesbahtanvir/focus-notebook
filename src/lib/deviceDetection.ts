/**
 * Device and Platform Detection Utility
 * 
 * Detects the device type, operating system, and browser
 * to track data source across different platforms
 */

export type DeviceType = 'iPhone' | 'iPad' | 'Mac' | 'Windows' | 'Android' | 'Linux' | 'Unknown';
export type BrowserType = 'Safari' | 'Chrome' | 'Firefox' | 'Edge' | 'Opera' | 'Unknown';
export type PlatformType = 'iOS' | 'iPadOS' | 'macOS' | 'Windows' | 'Android' | 'Linux' | 'Unknown';

export interface DeviceInfo {
  deviceType: DeviceType;
  platform: PlatformType;
  browser: BrowserType;
  isCapacitor: boolean;
  source: string; // Human-readable source like "iPhone (Safari)" or "Mac (Chrome)"
}

/**
 * Detects if running in Capacitor (native mobile app)
 */
export function isCapacitorApp(): boolean {
  return typeof window !== 'undefined' && 
         (window as any).Capacitor !== undefined;
}

/**
 * Detects the device type
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'Unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for iPhone
  if (/iphone/.test(ua)) {
    return 'iPhone';
  }
  
  // Check for iPad
  // Note: iOS 13+ on iPad reports as Mac, so we need additional checks
  if (/ipad/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'iPad';
  }
  
  // Check for Mac
  if (/mac/.test(ua) && !/iphone|ipad/.test(ua)) {
    return 'Mac';
  }
  
  // Check for Windows
  if (/win/.test(ua)) {
    return 'Windows';
  }
  
  // Check for Android
  if (/android/.test(ua)) {
    return 'Android';
  }
  
  // Check for Linux
  if (/linux/.test(ua)) {
    return 'Linux';
  }
  
  return 'Unknown';
}

/**
 * Detects the platform/OS
 */
export function detectPlatform(): PlatformType {
  if (typeof window === 'undefined') return 'Unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  
  // iOS (iPhone)
  if (/iphone/.test(ua)) {
    return 'iOS';
  }
  
  // iPadOS
  if (/ipad/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'iPadOS';
  }
  
  // macOS
  if (/mac/.test(ua) && !/iphone|ipad/.test(ua)) {
    return 'macOS';
  }
  
  // Windows
  if (/win/.test(ua)) {
    return 'Windows';
  }
  
  // Android
  if (/android/.test(ua)) {
    return 'Android';
  }
  
  // Linux
  if (/linux/.test(ua)) {
    return 'Linux';
  }
  
  return 'Unknown';
}

/**
 * Detects the browser
 */
export function detectBrowser(): BrowserType {
  if (typeof window === 'undefined') return 'Unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Safari (must check before Chrome since Chrome UA contains "safari")
  if (/safari/.test(ua) && !/chrome|chromium|edg|opr/.test(ua)) {
    return 'Safari';
  }
  
  // Chrome
  if (/chrome|chromium/.test(ua) && !/edg|opr/.test(ua)) {
    return 'Chrome';
  }
  
  // Edge
  if (/edg/.test(ua)) {
    return 'Edge';
  }
  
  // Firefox
  if (/firefox|fxios/.test(ua)) {
    return 'Firefox';
  }
  
  // Opera
  if (/opr|opera/.test(ua)) {
    return 'Opera';
  }
  
  return 'Unknown';
}

/**
 * Gets complete device information
 */
export function getDeviceInfo(): DeviceInfo {
  const deviceType = detectDeviceType();
  const platform = detectPlatform();
  const browser = detectBrowser();
  const isCapacitor = isCapacitorApp();
  
  // Generate human-readable source
  let source = deviceType;
  
  // Add app context
  if (isCapacitor) {
    source += ' (App)';
  } else {
    source += ` (${browser})`;
  }
  
  return {
    deviceType,
    platform,
    browser,
    isCapacitor,
    source
  };
}

/**
 * Gets a compact source string for storage
 * Examples: "iPhone-Safari", "Mac-Chrome", "iPad-App"
 */
export function getCompactSource(): string {
  const info = getDeviceInfo();
  const browserOrApp = info.isCapacitor ? 'App' : info.browser;
  return `${info.deviceType}-${browserOrApp}`;
}

/**
 * Gets a display-friendly source string
 * Examples: "iPhone (Safari)", "Mac (Chrome)", "iPad (App)"
 */
export function getDisplaySource(): string {
  return getDeviceInfo().source;
}

/**
 * Parses a compact source string back into components
 */
export function parseSource(source: string): { device: string; client: string } {
  const parts = source.split('-');
  return {
    device: parts[0] || 'Unknown',
    client: parts[1] || 'Unknown'
  };
}

/**
 * Gets an emoji icon for the device type
 */
export function getDeviceIcon(deviceType: DeviceType | string): string {
  switch (deviceType) {
    case 'iPhone':
      return '📱';
    case 'iPad':
      return '📱';
    case 'Mac':
      return '💻';
    case 'Windows':
      return '🖥️';
    case 'Android':
      return '📱';
    case 'Linux':
      return '🖥️';
    default:
      return '🌐';
  }
}

/**
 * Gets a color class for the device type (for Tailwind CSS)
 */
export function getDeviceColorClass(deviceType: DeviceType | string): string {
  switch (deviceType) {
    case 'iPhone':
    case 'iPad':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
    case 'Mac':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'Windows':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300';
    case 'Android':
      return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300';
    case 'Linux':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}
