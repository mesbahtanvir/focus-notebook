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
import { Crown, Database, Rocket, ShieldCheck, Sparkles } from 'lucide-react';

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
    <div className="container mx-auto py-8 space-y-6">
      <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 border-b-4 border-purple-200">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ⚙️ Settings
          </CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Manage your Focus Notebook preferences and membership
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-10">

          <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="allowBackgroundProcessing" className="text-base font-semibold text-gray-800">
                    Background processing
                  </Label>
                  {!hasProAccess && (
                    <Link href="/profile" className="text-sm font-semibold text-purple-600 underline-offset-4 hover:underline">
                      Pro feature
                    </Link>
                  )}
                </div>
                <p className="text-sm text-gray-600 max-w-2xl">
                  Let Focus Notebook automatically analyze new thoughts and queue AI suggestions in the background.
                  You&apos;ll receive confident actions without lifting a finger.
                </p>
                <p className="text-xs text-gray-500">
                  We only run background jobs while your account is active. You can toggle this anytime.
                </p>
              </div>

              <Switch
                id="allowBackgroundProcessing"
                checked={allowBackgroundProcessing && hasProAccess}
                disabled={!hasProAccess}
                onCheckedChange={handleBackgroundToggle}
              />
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Data Management Card - Link to Dedicated Page */}
      <Card className="border-4 border-green-200 dark:border-green-700 shadow-xl bg-gradient-to-br from-white to-green-50 dark:from-gray-900 dark:to-green-900/20">
        <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-b-4 border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Data Management
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 font-medium">
                Import, export, and manage your data
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Access advanced data management tools including import/export, preview, conflict resolution, and progress tracking.
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                ✓ Preview before import
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                ✓ Conflict detection
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                ✓ Progress tracking
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                ✓ Selective import/export
              </Badge>
            </div>

            <Link href="/settings/data-management" className="block">
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium">
                <Database className="h-4 w-4 mr-2" />
                Open Data Management
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <TokenUsageDashboard />
    </div>
  );
}
