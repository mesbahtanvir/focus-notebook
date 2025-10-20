"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { smartSync } from '@/lib/syncEngine';
import { useTasks } from '@/store/useTasks';
import { useThoughts } from '@/store/useThoughts';

/**
 * AutoSync component - Intelligent bidirectional sync with conflict resolution
 * - Pulls from cloud every 5 minutes
 * - Merges local and cloud data
 * - Resolves conflicts by keeping most recent changes
 * - Works offline and syncs when back online
 */
export function AutoSync() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    // Only sync if user is logged in
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Perform initial smart sync after 3 seconds
    const initialTimeout = setTimeout(async () => {
      if (isSyncingRef.current) return;
      
      console.log('🔄 Performing initial smart sync...');
      isSyncingRef.current = true;
      
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
        } else {
          console.error('❌ Initial sync failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Initial sync error:', error);
      } finally {
        isSyncingRef.current = false;
      }
    }, 3000);

    // Set up periodic smart sync every 5 minutes
    intervalRef.current = setInterval(async () => {
      if (isSyncingRef.current) {
        console.log('⏭️ Skipping sync - already in progress');
        return;
      }
      
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncRef.current;
      
      // Only sync if it's been more than 4 minutes since last sync
      if (timeSinceLastSync < 240000) {
        return;
      }

      console.log('🔄 Performing periodic smart sync...');
      isSyncingRef.current = true;
      
      try {
        const result = await smartSync();
        if (result.success) {
          console.log(`✅ Periodic sync: ${result.mergedItems} items synced, ${result.conflicts} conflicts resolved`);
          lastSyncRef.current = now;
          
          // Reload stores to show merged data
          await Promise.all([
            useTasks.getState().loadTasks(),
            useThoughts.getState().loadThoughts(),
          ]);
        } else {
          console.error('❌ Periodic sync failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Periodic sync error:', error);
      } finally {
        isSyncingRef.current = false;
      }
    }, 300000); // 5 minutes

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(initialTimeout);
    };
  }, [user]);

  return null; // This component doesn't render anything
}
