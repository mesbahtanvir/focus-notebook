/**
 * Device and Platform Detection Utility
 *
 * Utility functions for device type detection and display
 */

export type DeviceType = 'iPhone' | 'iPad' | 'Mac' | 'Windows' | 'Android' | 'Linux' | 'Unknown';

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
