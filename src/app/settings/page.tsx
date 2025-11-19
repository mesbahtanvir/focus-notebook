"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toastWarning } from '@/lib/toast-presets';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/store/useTasks';
import { useGoals } from '@/store/useGoals';
import { useProjects } from '@/store/useProjects';
import { useThoughts } from '@/store/useThoughts';
import { useMoods } from '@/store/useMoods';
import { useFocus } from '@/store/useFocus';
import { useSubscriptionStatus } from '@/store/useSubscriptionStatus';
import { EnhancedDataManagement } from '@/components/EnhancedDataManagement';
import { TokenUsageDashboard } from '@/components/TokenUsageDashboard';
import { Crown, Database, Rocket, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

const PRO_BENEFITS = [
  {
    icon: Sparkles,
    title: 'Unlimited AI automations',
    description: 'Process every thought with intelligent action plans, summaries, and smart tagging.',
  },
  {
    icon: Rocket,
    title: 'Background processing',
    description: 'Let Focus Notebook run in the background and surface confident suggestions automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Priority support & previews',
    description: 'Get hands-on help from the team and early access to upcoming features.',
  },
] as const;

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
    return <div className="flex items-center justify-center h-64">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto py-4 px-3 space-y-4 max-w-6xl">
      {/* Compact Header */}
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Settings</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">Manage preferences</span>
      </div>

      {/* Ultra-Compact Grid - 3 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

        {/* Background Processing */}
        <Card className="border border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Background Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Auto-analyze thoughts
                </p>
                <Switch
                  id="allowBackgroundProcessing"
                  checked={allowBackgroundProcessing && hasProAccess}
                  disabled={!hasProAccess}
                  onCheckedChange={handleBackgroundToggle}
                />
              </div>
              {!hasProAccess && (
                <Link href="/profile" className="text-xs font-semibold text-purple-600 hover:underline">
                  Pro feature →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="border border-green-200 dark:border-green-800">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Database className="h-4 w-4 text-green-600" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  Import/Export
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  Preview
                </Badge>
              </div>
              <Link href="/settings/data-management" className="block">
                <Button size="sm" className="w-full h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
                  <Database className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Database Migrations */}
        <Card className="border border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-base flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-orange-600" />
              Migrations
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  Sequential
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  Tracked
                </Badge>
              </div>
              <Link href="/tools/migrate" className="block">
                <Button size="sm" variant="outline" className="w-full h-7 text-xs border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-900/20">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Run
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Dashboard - Full Width */}
      <TokenUsageDashboard />
    </div>
  );
}
