import { useEffect } from 'react';
import { useToolUsage, ToolName } from '@/store/useToolUsage';
import { useAuth } from '@/contexts/AuthContext';

export function useTrackToolUsage(toolName: ToolName) {
  const { user } = useAuth();
  const trackToolClick = useToolUsage((s) => s.trackToolClick);
  const subscribe = useToolUsage((s) => s.subscribe);

  useEffect(() => {
    if (user?.uid) {
      // Subscribe to tool usage data
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  useEffect(() => {
    if (user?.uid) {
      // Track the tool click
      trackToolClick(toolName);
    }
  }, [user?.uid, toolName, trackToolClick]);
}
