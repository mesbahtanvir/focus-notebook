import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsClient } from '@/lib/firebaseClient';
import { useAuth } from '@/contexts/AuthContext';
import type { UsageStats } from '@shared/subscription';

interface UsageStatsResponse {
  stats: UsageStats[];
  totalAllTime: number;
  currentMonthTotal: number;
}

interface UseUsageStatsReturn {
  stats: UsageStats[];
  currentMonthTotal: number;
  totalAllTime: number;
  isLoading: boolean;
  error: string | null;
}

export function useUsageStats(months = 3): UseUsageStatsReturn {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [totalAllTime, setTotalAllTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Fetch historical stats
    const fetchStats = async () => {
      try {
        const getStats = httpsCallable<{ months?: number }, UsageStatsResponse>(
          functionsClient,
          'getUsageStats'
        );

        const result = await getStats({ months });
        setStats(result.data.stats);
        setTotalAllTime(result.data.totalAllTime);
        setCurrentMonthTotal(result.data.currentMonthTotal);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch usage stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load usage statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Set up real-time listener for current month stats
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const statsRef = doc(db, `users/${user.uid}/usageStats/${currentMonth}`);

    const unsubscribe = onSnapshot(
      statsRef,
      (snapshot) => {
        const data = snapshot.data();
        if (data && typeof data.thoughtsProcessed === 'number') {
          setCurrentMonthTotal(data.thoughtsProcessed);

          // Update stats array with latest current month data
          setStats((prevStats) => {
            const updatedStats = [...prevStats];
            const currentMonthIndex = updatedStats.findIndex((s) => s.month === currentMonth);

            if (currentMonthIndex >= 0) {
              updatedStats[currentMonthIndex] = {
                month: currentMonth,
                thoughtsProcessed: data.thoughtsProcessed,
                lastProcessedAt: data.lastProcessedAt || 0,
                dailyBreakdown: data.dailyBreakdown || {},
              };
            } else {
              updatedStats.unshift({
                month: currentMonth,
                thoughtsProcessed: data.thoughtsProcessed,
                lastProcessedAt: data.lastProcessedAt || 0,
                dailyBreakdown: data.dailyBreakdown || {},
              });
            }

            return updatedStats;
          });
        }
      },
      (err) => {
        console.error('Error listening to usage stats:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, months]);

  return {
    stats,
    currentMonthTotal,
    totalAllTime,
    isLoading,
    error,
  };
}
