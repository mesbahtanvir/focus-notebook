"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toastWarning } from '@/lib/toast-presets';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/store/useTasks';
import { useGoals } from '@/store/useGoals';
import { useProjects } from '@/store/useProjects';
import { useThoughts } from '@/store/useThoughts';
import { useMoods } from '@/store/useMoods';
import { useFocus } from '@/store/useFocus';
import { useSubscriptionStatus } from '@/store/useSubscriptionStatus';
import { TokenUsageDashboard } from '@/components/TokenUsageDashboard';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { Crown, Sparkles, Info, ExternalLink } from 'lucide-react';

const ENTITLEMENT_MESSAGES: Record<string, string> = {
  allowed: 'Focus Notebook Pro is active on your account.',
  'no-record': 'No active subscription detected. Upgrade to Pro to unlock advanced automations.',
  'tier-mismatch': 'Your current plan does not include Pro features.',
  inactive: 'Your subscription is inactive. Renew to continue using Pro features.',
  disabled: 'AI processing is currently disabled for your account.',
  exhausted: 'You have used all available AI credits. Top up or wait for the next billing cycle.',
};

export default function SettingsPage() {
  const { user } = useAuth();

  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [allowBackgroundProcessing, setAllowBackgroundProcessing] = useState(false);

  const tasksSubscribe = useTasks((s) => s.subscribe);
  const goalsSubscribe = useGoals((s) => s.subscribe);
  const projectsSubscribe = useProjects((s) => s.subscribe);
  const thoughtsSubscribe = useThoughts((s) => s.subscribe);
  const moodsSubscribe = useMoods((s) => s.subscribe);
  const focusSubscribe = useFocus((s) => s.subscribe);

  const { subscription, hasProAccess, entitlement, isLoading: subscriptionLoading, lastUpdatedAt } =
    useSubscriptionStatus((state) => ({
      subscription: state.subscription,
      hasProAccess: state.hasProAccess,
      entitlement: state.entitlement,
      isLoading: state.isLoading,
      lastUpdatedAt: state.lastUpdatedAt,
    }));

  const entitlementMessage = useMemo(() => {
    return ENTITLEMENT_MESSAGES[entitlement.code] ?? ENTITLEMENT_MESSAGES['no-record'];
  }, [entitlement.code]);

  const refreshAllStores = () => {
    if (!user?.uid) {
      return;
    }
    tasksSubscribe(user.uid);
    goalsSubscribe(user.uid);
    projectsSubscribe(user.uid);
    thoughtsSubscribe(user.uid);
    moodsSubscribe(user.uid);
    focusSubscribe(user.uid);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('appSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.allowBackgroundProcessing === 'boolean') {
          setAllowBackgroundProcessing(parsed.allowBackgroundProcessing);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSettingsLoading) {
      return;
    }

    try {
      const saved = localStorage.getItem('appSettings');
      const parsed = saved ? JSON.parse(saved) : {};
      const next = {
        ...parsed,
        allowBackgroundProcessing: hasProAccess ? allowBackgroundProcessing : false,
      };
      localStorage.setItem('appSettings', JSON.stringify(next));
    } catch (error) {
      console.error('Failed to persist settings:', error);
    }
  }, [allowBackgroundProcessing, hasProAccess, isSettingsLoading]);

  useEffect(() => {
    if (!hasProAccess && allowBackgroundProcessing) {
      setAllowBackgroundProcessing(false);
    }
  }, [hasProAccess, allowBackgroundProcessing]);

  const handleBackgroundToggle = (checked: boolean) => {
    if (!hasProAccess) {
      toastWarning({
        title: 'Focus Notebook Pro required',
        description: 'Upgrade to Pro to unlock automatic background processing.',
      });
      return;
    }

    setAllowBackgroundProcessing(checked);
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const formatDate = (value: unknown) => {
    if (!value) return null;
    const date =
      value instanceof Date
        ? value
        : typeof value === 'string' || typeof value === 'number'
          ? new Date(value)
          : null;
    if (!date || Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isSettingsLoading || (subscriptionLoading && !subscription)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <SettingsLayout
      title="General"
      description="Manage your app preferences and subscription"
    >
      <div className="space-y-8">
        {/* AI Features Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Features
            </h3>
          </div>

          <div className="space-y-4">
            {/* Background Processing */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="allowBackgroundProcessing"
                    className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                  >
                    Background Processing
                  </Label>
                  {!hasProAccess && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      <Crown className="h-3 w-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically analyze and process your thoughts in the background
                </p>
              </div>
              <Switch
                id="allowBackgroundProcessing"
                checked={allowBackgroundProcessing && hasProAccess}
                disabled={!hasProAccess}
                onCheckedChange={handleBackgroundToggle}
              />
            </div>

            {/* Pro Status */}
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                    {hasProAccess ? 'Pro Active' : 'Pro Features'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {entitlementMessage}
                  </p>
                  {!hasProAccess && (
                    <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mt-2">
                      Upgrade to Pro
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Token Usage Section */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Token Usage
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor your AI token consumption and limits
            </p>
          </div>
          <TokenUsageDashboard />
        </section>
      </div>
    </SettingsLayout>
  );
}
