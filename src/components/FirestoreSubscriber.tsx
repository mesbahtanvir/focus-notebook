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
      console.log('🔥 Initializing Firestore subscriptions for user:', userId);
      subscribeTasks(userId);
      subscribeThoughts(userId);
      subscribeMoods(userId);
      subscribeFocus(userId);
      subscribeToolEnrollment(userId);
      subscribeSubscriptionStatus(userId);
      
      // Load any active focus session
      loadActiveSession();
    }
    return () => {
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
