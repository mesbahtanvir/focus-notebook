"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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
      toast({
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
    <div className="container mx-auto py-6 px-4 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          ⚙️ Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your Focus Notebook preferences and membership
        </p>
      </div>

      {/* Grid Layout for Compact Organization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Background Processing */}
        <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Background Processing
            </CardTitle>
            <CardDescription className="text-xs">
              Automatic AI analysis for new thoughts
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Auto-analyze thoughts and queue AI suggestions
                </p>
                {!hasProAccess && (
                  <Link href="/profile" className="text-xs font-semibold text-purple-600 hover:underline inline-block mt-1">
                    Pro feature →
                  </Link>
                )}
              </div>
              <Switch
                id="allowBackgroundProcessing"
                checked={allowBackgroundProcessing && hasProAccess}
                disabled={!hasProAccess}
                onCheckedChange={handleBackgroundToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="border-2 border-green-200 dark:border-green-800 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Data Management
            </CardTitle>
            <CardDescription className="text-xs">
              Import, export, and manage your data
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  Preview
                </Badge>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  Conflicts
                </Badge>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  Progress
                </Badge>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  Selective
                </Badge>
              </div>
              <Link href="/settings/data-management" className="block">
                <Button size="sm" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                  <Database className="h-3.5 w-3.5 mr-1.5" />
                  Open Data Management
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Database Migrations */}
        <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              Database Migrations
            </CardTitle>
            <CardDescription className="text-xs">
              Update your data structure
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Run ordered migrations to keep your database schema up to date
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  Sequential
                </Badge>
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  Tracked
                </Badge>
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  Safe
                </Badge>
              </div>
              <Link href="/tools/migrate" className="block">
                <Button size="sm" variant="outline" className="w-full border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-900/20">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Run Migrations
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
