'use client';

import { Crown, Calendar, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SubscriptionSnapshot } from '@shared/subscription';

interface SubscriptionOverviewProps {
  subscription: SubscriptionSnapshot;
  onManageBilling: () => void;
}

export function SubscriptionOverview({ subscription, onManageBilling }: SubscriptionOverviewProps) {
  const tier = subscription.tier || 'free';
  const status = subscription.status || 'unknown';
  const cancelAtPeriodEnd = subscription.cancelAtPeriodEnd === true;

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number'
      ? new Date(timestamp)
      : new Date(String(timestamp));
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const currentPeriodEnd = subscription.currentPeriodEnd
    ? formatDate(subscription.currentPeriodEnd)
    : null;
  const currentPeriodStart = subscription.currentPeriodStart
    ? formatDate(subscription.currentPeriodStart)
    : null;

  const isPro = tier === 'pro';
  const isActive = status === 'active' || status === 'trialing' || status === 'past_due';

  // Format price
  const formatPrice = (): string => {
    const amount = subscription.amount;
    const currency = subscription.currency || 'usd';
    const interval = subscription.interval || 'month';

    if (!amount) return '$2/month'; // Fallback

    const price = (amount / 100).toFixed(2);
    const currencySymbol = currency === 'usd' ? '$' : currency.toUpperCase();
    return `${currencySymbol}${price}/${interval}`;
  };

  // Check if there's a discount
  const hasDiscount = subscription.discountPercent || subscription.discountAmount;

  // Determine renewal status
  const renewalStatus = cancelAtPeriodEnd ? {
    icon: AlertCircle,
    text: `Ends on ${currentPeriodEnd}`,
    badge: 'warning' as const,
    message: 'Auto-renewal canceled'
  } : {
    icon: CheckCircle2,
    text: `Renews on ${currentPeriodEnd}`,
    badge: 'success' as const,
    message: 'Auto-renewal active'
  };

  const RenewalIcon = renewalStatus.icon;

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className={cn(
              "h-5 w-5",
              isPro ? "text-yellow-500" : "text-gray-400"
            )} />
            {isPro ? 'Focus Notebook Pro' : 'Free Plan'}
          </CardTitle>
          {isPro && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManageBilling}
              className="min-h-[44px]"
            >
              Manage Billing
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
          <Badge
            variant={isActive ? 'default' : 'destructive'}
            className="capitalize"
          >
            {status}
          </Badge>
        </div>

        {/* Renewal Status (only for Pro users) */}
        {isPro && currentPeriodEnd && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Renewal</span>
            <div className="flex items-center gap-2">
              <RenewalIcon className={cn(
                "h-4 w-4",
                cancelAtPeriodEnd ? "text-yellow-600" : "text-green-600"
              )} />
              <span className="text-sm font-medium">{renewalStatus.text}</span>
            </div>
          </div>
        )}

        {/* Current Period (only for Pro users) */}
        {isPro && currentPeriodStart && currentPeriodEnd && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="inline h-4 w-4 mr-1" />
              Current Period
            </span>
            <span className="text-sm">
              {currentPeriodStart} - {currentPeriodEnd}
            </span>
          </div>
        )}

        {/* Price (only for Pro users with active subscription) */}
        {isPro && isActive && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Plan
              </span>
              <span className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {formatPrice()}
              </span>
            </div>
            {hasDiscount && (
              <div className="flex items-center justify-end gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400">
                  {subscription.discountPercent
                    ? `${subscription.discountPercent}% off`
                    : `$${(subscription.discountAmount! / 100).toFixed(2)} off`
                  }
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/20 to-pink-100/20 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full blur-3xl -z-10" />
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
