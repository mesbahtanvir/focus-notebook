"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { smartSync } from '@/lib/syncEngine';
import { useTasks } from '@/store/useTasks';
import { useThoughts } from '@/store/useThoughts';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useSyncStatus } from '@/store/useSyncStatus';

/**
 * AutoSync component - Real-time bidirectional sync with Firestore listeners
 * 
 * NEW FEATURES:
 * - Real-time sync via Firestore listeners (< 1 second latency)
 * - Fallback periodic sync every 10 minutes for reliability
 * - Initial full sync on login
 * - Intelligent conflict resolution
 * - Works offline and syncs when back online
 * 
 * MIGRATION FROM OLD SYSTEM:
 * - Replaced 5-minute polling with real-time listeners
 * - Added 10-minute fallback sync for safety
 * - Maintains backward compatibility
 */
export function AutoSync() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);
  const { setSyncStatus } = useSyncStatus();

  // Initialize real-time sync listeners (PRIMARY SYNC METHOD)
  useRealtimeSync();

  useEffect(() => {
    // Only sync if user is logged in
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Perform initial full sync after 3 seconds
    const initialTimeout = setTimeout(async () => {
      if (isSyncingRef.current) return;
      
      console.log('🔄 Performing initial full sync...');
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      
      try {
        const result = await smartSync();
        if (result.success) {
          console.log(`✅ Initial sync: ${result.mergedItems} items synced, ${result.conflicts} conflicts resolved`);
          lastSyncRef.current = Date.now();
          
          // Reload stores to show merged data
          await Promise.all([
            useTasks.getState().loadTasks(),
            useThoughts.getState().loadThoughts(),
          ]);
          
          setSyncStatus('synced');
        } else {
          console.error('❌ Initial sync failed:', result.error);
          setSyncStatus('error');
        }
      } catch (error) {
        console.error('❌ Initial sync error:', error);
        setSyncStatus('error');
      } finally {
        isSyncingRef.current = false;
      }
    }, 3000);

    // Set up FALLBACK periodic sync every 10 minutes
    // This ensures we catch any missed changes from the real-time listeners
    intervalRef.current = setInterval(async () => {
      if (isSyncingRef.current) {
        console.log('⏭️ Skipping fallback sync - already in progress');
        return;
      }
      
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncRef.current;
      
      // Only sync if it's been more than 9 minutes since last sync
      if (timeSinceLastSync < 540000) {
        return;
      }

      console.log('🔄 Performing fallback periodic sync (safety net)...');
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      
      try {
        const result = await smartSync();
        if (result.success) {
          console.log(`✅ Fallback sync: ${result.mergedItems} items synced, ${result.conflicts} conflicts resolved`);
          lastSyncRef.current = now;
          
          // Reload stores to show merged data
          await Promise.all([
            useTasks.getState().loadTasks(),
            useThoughts.getState().loadThoughts(),
          ]);
          
          setSyncStatus('synced');
        } else {
          console.error('❌ Fallback sync failed:', result.error);
          setSyncStatus('error');
        }
      } catch (error) {
        console.error('❌ Fallback sync error:', error);
        setSyncStatus('error');
      } finally {
        isSyncingRef.current = false;
      }
    }, 600000); // 10 minutes (fallback only)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(initialTimeout);
    };
  }, [user, setSyncStatus]);

  return null; // This component doesn't render anything
}
