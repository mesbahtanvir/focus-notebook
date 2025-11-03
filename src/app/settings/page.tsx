"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
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
import { functionsClient } from '@/lib/firebaseClient';
import { ArrowUpRight, Crown, Loader2, Rocket, ShieldCheck, Sparkles } from 'lucide-react';

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
  const { user, isAnonymous } = useAuth();
  const { toast } = useToast();

  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [allowBackgroundProcessing, setAllowBackgroundProcessing] = useState(false);
  const [billingAction, setBillingAction] = useState<'upgrade' | 'portal' | null>(null);

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

  const isUpgradeLoading = billingAction === 'upgrade';
  const isPortalLoading = billingAction === 'portal';
  const billingButtonLabel = hasProAccess
    ? isPortalLoading
      ? 'Opening portal…'
      : 'Manage subscription'
    : isUpgradeLoading
      ? 'Redirecting…'
      : 'Upgrade to Pro';
  const billingButtonDisabled = hasProAccess ? isPortalLoading : isUpgradeLoading;

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

  const handleBillingRedirect = async (action: 'upgrade' | 'portal') => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to manage your membership.',
        variant: 'destructive',
      });
      return;
    }

    if (action === 'upgrade') {
      if (isAnonymous) {
        toast({
          title: 'Create a permanent account',
          description:
            'Upgrade requires a permanent account. Link your email or continue with Google before upgrading.',
          variant: 'destructive',
        });
        return;
      }

      if (!user.email) {
        toast({
          title: 'Email required',
          description: 'Please add an email address to your profile before upgrading.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setBillingAction(action);
      const callableName =
        action === 'upgrade' ? 'createStripeCheckoutSession' : 'createStripePortalSession';
      const callable = httpsCallable(functionsClient, callableName);
      const result = await callable({
        origin: window.location.origin,
      });
      const data = result.data as { url?: string; error?: string };
      if (!data?.url) {
        const fallbackMessage =
          data?.error ||
          (action === 'upgrade'
            ? 'Unable to start checkout. Please try again shortly.'
            : 'Unable to open the billing portal right now.');
        toast({
          title: 'Billing unavailable',
          description: fallbackMessage,
          variant: 'destructive',
        });
        return;
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error('Billing redirect failed', error);
      let message =
        'Something went wrong while contacting Stripe. Please try again shortly.';
      if (error instanceof FirebaseError && typeof error.message === 'string') {
        message = error.message.replace(/^FunctionsError:\s*/, '');
      }
      toast({
        title: 'Billing unavailable',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setBillingAction(null);
    }
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
          <section className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6 shadow-inner">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4">
                <Badge
                  variant={hasProAccess ? 'default' : 'secondary'}
                  className={hasProAccess ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : ''}
                >
                  {hasProAccess ? 'Focus Notebook Pro' : 'Free plan'}
                </Badge>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Unlock advanced automation</h2>
                    <p className="text-sm text-gray-600 max-w-xl">{entitlementMessage}</p>
                  </div>
                </div>

                {hasProAccess && (
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700 bg-white/70 border border-purple-200 rounded-xl p-4">
                    <div>
                      <span className="font-semibold text-gray-900">Status:</span>{' '}
                      {subscription?.status ? subscription.status : 'active'}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">Tier:</span>{' '}
                      {subscription?.tier ?? 'pro'}
                    </div>
                    {formatDate(subscription?.currentPeriodEnd) && (
                      <div>
                        <span className="font-semibold text-gray-900">Renews on:</span>{' '}
                        {formatDate(subscription?.currentPeriodEnd)}
                      </div>
                    )}
                    {formatDate(lastUpdatedAt) && (
                      <div>
                        <span className="font-semibold text-gray-900">Last updated:</span>{' '}
                        {formatDate(lastUpdatedAt)}
                      </div>
                    )}
                  </div>
                )}

                {!hasProAccess && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {PRO_BENEFITS.map((benefit) => (
                      <div
                        key={benefit.title}
                        className="flex gap-3 rounded-xl border border-purple-200 bg-white/60 p-4"
                      >
                        <div className="mt-1 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-2 text-white shadow">
                          <benefit.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{benefit.title}</h4>
                          <p className="text-sm text-gray-600">{benefit.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full md:w-auto flex flex-col gap-3">
                <Button
                  type="button"
                  size="lg"
                  disabled={billingButtonDisabled}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-400 disabled:to-pink-400 disabled:cursor-not-allowed"
                  onClick={() => {
                    void handleBillingRedirect(hasProAccess ? 'portal' : 'upgrade');
                  }}
                >
                  {billingButtonLabel}
                  {billingButtonDisabled ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </Button>
                {!hasProAccess && (
                  <Button variant="outline" asChild>
                    <Link href="mailto:hello@focusnotebook.ai?subject=Focus%20Notebook%20Pro">
                      Talk to the team
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="allowBackgroundProcessing" className="text-base font-semibold text-gray-800">
                    Background processing
                  </Label>
                  {!hasProAccess && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      Pro feature
                    </Badge>
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

      <EnhancedDataManagement onDataChanged={refreshAllStores} />
    </div>
  );
}
