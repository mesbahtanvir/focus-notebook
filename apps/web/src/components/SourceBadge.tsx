/**
 * SourceBadge Component
 * 
 * Displays the device/platform source of data items
 * Shows where the data was created (e.g., iPhone, Mac, Web)
 */

import { parseSource, getDeviceIcon, getDeviceColorClass } from '@/lib/deviceDetection';

interface SourceBadgeProps {
  source?: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SourceBadge({ 
  source, 
  className = '', 
  showIcon = true,
  size = 'sm' 
}: SourceBadgeProps) {
  if (!source) return null;

  const { device, client } = parseSource(source);
  const icon = getDeviceIcon(device);
  const colorClass = getDeviceColorClass(device);

  // Size classes
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colorClass} ${sizeClasses[size]} ${className}`}
      title={`Created on ${device} using ${client}`}
    >
      {showIcon && <span>{icon}</span>}
      <span className="uppercase tracking-wide">{device}</span>
    </span>
  );
}

/**
 * LastModifiedBadge Component
 * 
 * Shows where the item was last modified
 */
interface LastModifiedBadgeProps {
  lastModifiedSource?: string;
  className?: string;
  showLabel?: boolean;
}

export function LastModifiedBadge({ 
  lastModifiedSource, 
  className = '',
  showLabel = false
}: LastModifiedBadgeProps) {
  if (!lastModifiedSource) return null;

  const { device, client } = parseSource(lastModifiedSource);
  const icon = getDeviceIcon(device);

  return (
    <span 
      className={`inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 ${className}`}
      title={`Last modified on ${device} using ${client}`}
    >
      {showLabel && <span>Modified on:</span>}
      <span>{icon}</span>
      <span>{device}</span>
      <span className="text-gray-400 dark:text-gray-500">({client})</span>
    </span>
  );
}

/**
 * SourceInfo Component
 * 
 * Shows both creation and last modification source
 */
interface SourceInfoProps {
  source?: string;
  lastModifiedSource?: string;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export function SourceInfo({ 
  source, 
  lastModifiedSource, 
  className = '',
  layout = 'horizontal'
}: SourceInfoProps) {
  if (!source && !lastModifiedSource) return null;

  const containerClass = layout === 'vertical' ? 'flex flex-col gap-1' : 'flex flex-wrap items-center gap-2';

  return (
    <div className={`${containerClass} ${className}`}>
      {source && (
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="text-gray-400 dark:text-gray-500">Created:</span>
          <SourceBadge source={source} showIcon={true} size="sm" />
        </div>
      )}
      {lastModifiedSource && lastModifiedSource !== source && (
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="text-gray-400 dark:text-gray-500">Modified:</span>
          <SourceBadge source={lastModifiedSource} showIcon={true} size="sm" />
        </div>
      )}
    </div>
  );
}
