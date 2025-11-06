'use client';

import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CachedPaymentMethod } from '../../../shared/subscription';

interface PaymentMethodCardProps {
  paymentMethod: CachedPaymentMethod | null;
  isLoading: boolean;
  onUpdate: () => void;
}

function getCardBrandIcon(brand: string): string {
  const brandLower = brand.toLowerCase();

  // Map card brands to their display names
  const brandMap: Record<string, string> = {
    'visa': 'Visa',
    'mastercard': 'Mastercard',
    'amex': 'American Express',
    'discover': 'Discover',
    'diners': 'Diners Club',
    'jcb': 'JCB',
    'unionpay': 'UnionPay',
  };

  return brandMap[brandLower] || brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function PaymentMethodCard({ paymentMethod, isLoading, onUpdate }: PaymentMethodCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentMethod) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              No payment method on file
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdate}
              className="min-h-[44px]"
            >
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isExpiringSoon = () => {
    const now = new Date();
    const expDate = new Date(paymentMethod.expYear, paymentMethod.expMonth - 1);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    return expDate <= threeMonthsFromNow;
  };

  const brandName = getCardBrandIcon(paymentMethod.brand);
  const expiring = isExpiringSoon();

  return (
    <Card className="relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-100/20 to-blue-100/20 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-full blur-3xl -z-10" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onUpdate}
            className="min-h-[44px]"
          >
            Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Card info */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg">
            <CreditCard className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="font-medium">
              {brandName} •••• {paymentMethod.last4}
            </div>
            <div className={cn(
              "text-sm",
              expiring
                ? "text-orange-600 dark:text-orange-400 font-medium"
                : "text-gray-600 dark:text-gray-400"
            )}>
              Expires: {String(paymentMethod.expMonth).padStart(2, '0')}/{paymentMethod.expYear}
              {expiring && ' (Expiring Soon)'}
            </div>
          </div>
        </div>

        {/* Expiration warning */}
        {expiring && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Your card is expiring soon. Update your payment method to avoid service interruption.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
