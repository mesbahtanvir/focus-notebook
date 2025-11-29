'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CancellationBannerProps {
  endDate: Date;
  onReactivate: () => void;
}

export function CancellationBanner({ endDate, onReactivate }: CancellationBannerProps) {
  const formattedDate = endDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-orange-300 dark:border-orange-700 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-200/30 to-orange-200/30 dark:from-yellow-800/30 dark:to-orange-800/30 rounded-full blur-3xl" />

      <div className="relative flex items-start gap-4 md:items-center md:flex-row flex-col">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Subscription Canceled
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your subscription will end on <strong>{formattedDate}</strong>. You&apos;ll lose access to Pro features after this date.
            </p>
          </div>
        </div>

        <Button
          onClick={onReactivate}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg min-h-[44px] whitespace-nowrap"
        >
          Reactivate Subscription
        </Button>
      </div>
    </div>
  );
}
