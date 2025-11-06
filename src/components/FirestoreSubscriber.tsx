"use client";

import { useEffect } from 'react';
import { useAuthUserId } from '@/hooks/useAuthUserId';
import { useTasks } from '@/store/useTasks';
import { useThoughts } from '@/store/useThoughts';
import { useMoods } from '@/store/useMoods';
import { useFocus } from '@/store/useFocus';
import { useToolEnrollment } from '@/store/useToolEnrollment';
import { useSubscriptionStatus } from '@/store/useSubscriptionStatus';

/**
 * Component that initializes Firestore subscriptions when user is authenticated
 * Replaces the old AutoSync component
 */
export function FirestoreSubscriber() {
  const userId = useAuthUserId();
  const subscribeTasks = useTasks((state) => state.subscribe);
  const subscribeThoughts = useThoughts((state) => state.subscribe);
  const subscribeMoods = useMoods((state) => state.subscribe);
  const subscribeFocus = useFocus((state) => state.subscribe);
  const subscribeToolEnrollment = useToolEnrollment((state) => state.subscribe);
  const loadActiveSession = useFocus((state) => state.loadActiveSession);
  const subscribeSubscriptionStatus = useSubscriptionStatus((state) => state.subscribe);
  const clearSubscriptionStatus = useSubscriptionStatus((state) => state.clear);

  useEffect(() => {
    if (userId) {
      console.log('🔥 [FirestoreSubscriber] Initializing Firestore subscriptions for user:', userId);
      try {
        subscribeTasks(userId);
        subscribeThoughts(userId);
        subscribeMoods(userId);
        subscribeFocus(userId);
        subscribeToolEnrollment(userId);
        subscribeSubscriptionStatus(userId);

        // Load any active focus session
        loadActiveSession();
        console.log('✅ [FirestoreSubscriber] All subscriptions started successfully');
      } catch (error) {
        console.error('❌ [FirestoreSubscriber] Error starting subscriptions:', error);
      }
    } else {
      console.log('⏳ [FirestoreSubscriber] Waiting for userId...');
    }
    return () => {
      if (userId) {
        console.log('🔌 [FirestoreSubscriber] Cleaning up subscriptions for user:', userId);
      }
      clearSubscriptionStatus();
    };
  }, [
    userId,
    subscribeTasks,
    subscribeThoughts,
    subscribeMoods,
    subscribeFocus,
    subscribeToolEnrollment,
    subscribeSubscriptionStatus,
    loadActiveSession,
    clearSubscriptionStatus,
  ]);

  return null; // This component doesn't render anything
}
