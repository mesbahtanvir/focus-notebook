/**
 * SyncStatusIndicator Component
 * 
 * Shows real-time sync status with visual feedback
 * Helps users understand if their data is syncing to cloud
 */

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Cloud, CloudOff, WifiOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'notAuthenticated';

export function SyncStatusIndicator() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) setStatus('synced');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Monitor auth state
  useEffect(() => {
    if (!user) {
      setStatus('notAuthenticated');
    } else if (!isOnline) {
      setStatus('offline');
    } else {
      setStatus('synced');
    }
  }, [user, isOnline]);

  // Listen to sync events
  useEffect(() => {
    const handleSyncStart = () => {
      setStatus('syncing');
    };

    const handleSyncSuccess = () => {
      setStatus('synced');
      setLastSyncTime(new Date());
      setErrorMessage('');
    };

    const handleSyncError = (event: any) => {
      setStatus('error');
      setErrorMessage(event.detail?.error || 'Sync failed');
    };

    window.addEventListener('syncStart', handleSyncStart);
    window.addEventListener('syncSuccess', handleSyncSuccess);
    window.addEventListener('syncError', handleSyncError);

    return () => {
      window.removeEventListener('syncStart', handleSyncStart);
      window.removeEventListener('syncSuccess', handleSyncSuccess);
      window.removeEventListener('syncError', handleSyncError);
    };
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          text: 'Synced',
          description: lastSyncTime ? `Last synced ${formatRelativeTime(lastSyncTime)}` : 'All data synced'
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          text: 'Syncing...',
          description: 'Uploading changes to cloud'
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-950/20',
          text: 'Offline',
          description: 'Changes saved locally, will sync when online'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          text: 'Sync Error',
          description: errorMessage || 'Failed to sync data'
        };
      case 'notAuthenticated':
        return {
          icon: <CloudOff className="h-4 w-4" />,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          text: 'Not Signed In',
          description: 'Sign in to sync across devices'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} transition-all`}>
      <span className={config.color}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold ${config.color}`}>
          {config.text}
        </div>
        <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
          {config.description}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for mobile/small screens
 */
export function SyncStatusBadge() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setStatus('notAuthenticated');
    } else if (!isOnline) {
      setStatus('offline');
    } else {
      setStatus('synced');
    }
  }, [user, isOnline]);

  const getIcon = () => {
    switch (status) {
      case 'synced':
        return <Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'notAuthenticated':
        return <CloudOff className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm">
      {getIcon()}
    </div>
  );
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Utility function to trigger sync events
 */
export const syncEvents = {
  start: () => {
    window.dispatchEvent(new CustomEvent('syncStart'));
  },
  success: () => {
    window.dispatchEvent(new CustomEvent('syncSuccess'));
  },
  error: (error: string) => {
    window.dispatchEvent(new CustomEvent('syncError', { detail: { error } }));
  }
};
