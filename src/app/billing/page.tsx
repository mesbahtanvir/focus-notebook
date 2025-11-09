'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functionsClient } from '@/lib/firebaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionStatus } from '@/store/useSubscriptionStatus';
import { useBillingData } from '@/store/useBillingData';
import { useUsageStats } from '@/store/useUsageStats';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview';
import { CancellationBanner } from '@/components/billing/CancellationBanner';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';
import { InvoiceHistory } from '@/components/billing/InvoiceHistory';
import { UsageStatsCard } from '@/components/billing/UsageStatsCard';
import { ReactivateConfirmDialog } from '@/components/billing/ReactivateConfirmDialog';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscription, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const {
    invoices,
    paymentMethod,
    isLoading: billingLoading,
    hasMore,
    loadMore,
    refresh,
    reactivateSubscription,
  } = useBillingData();
  const {
    stats,
    currentMonthTotal,
    totalAllTime,
    isLoading: usageLoading,
  } = useUsageStats(3);

  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  // Redirect if not logged in (client-side only)
  useEffect(() => {
    if (!user && !subscriptionLoading) {
      router.push('/profile');
    }
  }, [user, subscriptionLoading, router]);

  const handleManageBilling = async () => {
    try {
      const createPortal = httpsCallable<{ origin?: string }, { url: string }>(
        functionsClient,
        'createStripePortalSession'
      );

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const result = await createPortal({ origin });

      if (typeof window !== 'undefined') {
        window.location.href = result.data.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReactivateClick = () => {
    setShowReactivateDialog(true);
  };

  const handleReactivateConfirm = async () => {
    setIsReactivating(true);
    try {
      await reactivateSubscription();

      toast({
        title: 'Subscription Reactivated!',
        description: 'Your subscription has been successfully reactivated.',
      });

      setShowReactivateDialog(false);

      // Refresh data
      await refresh();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to reactivate subscription. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd === true;
  const currentPeriodEnd = subscription?.currentPeriodEnd
    ? typeof subscription.currentPeriodEnd === 'number'
      ? new Date(subscription.currentPeriodEnd)
      : new Date(String(subscription.currentPeriodEnd))
    : new Date();

  // Format price for display
  const formatPrice = (): string => {
    if (!subscription) return '$2/month';

    const amount = subscription.amount;
    const currency = subscription.currency || 'usd';
    const interval = subscription.interval || 'month';

    if (!amount) return '$2/month'; // Fallback

    const price = (amount / 100).toFixed(2);
    const currencySymbol = currency === 'usd' ? '$' : currency.toUpperCase();
    return `${currencySymbol}${price}/${interval}`;
  };

  const isLoading = subscriptionLoading || billingLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/profile')}
            className="min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Billing Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your subscription, invoices, and usage statistics
            </p>
          </div>
        </div>

        {/* Cancellation Banner */}
        {!isLoading && cancelAtPeriodEnd && (
          <CancellationBanner
            endDate={currentPeriodEnd}
            onReactivate={handleReactivateClick}
          />
        )}

        {/* Top Row: Subscription + Payment Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
              <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            </>
          ) : (
            <>
              {subscription && (
                <SubscriptionOverview
                  subscription={subscription}
                  onManageBilling={handleManageBilling}
                />
              )}
              <PaymentMethodCard
                paymentMethod={paymentMethod}
                isLoading={billingLoading}
                onUpdate={handleManageBilling}
              />
            </>
          )}
        </div>

        {/* Usage Stats */}
        <UsageStatsCard
          stats={stats}
          currentMonthTotal={currentMonthTotal}
          totalAllTime={totalAllTime}
          isLoading={usageLoading}
        />

        {/* Invoice History */}
        <InvoiceHistory
          invoices={invoices}
          isLoading={billingLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />

        {/* Reactivate Confirmation Dialog */}
        <ReactivateConfirmDialog
          isOpen={showReactivateDialog}
          onConfirm={handleReactivateConfirm}
          onCancel={() => setShowReactivateDialog(false)}
          nextBillingDate={currentPeriodEnd}
          amount={formatPrice()}
        />
      </div>
    </div>
  );
}
