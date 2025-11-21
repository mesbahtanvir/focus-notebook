'use client';

import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/modal-portal';

interface ReactivateConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  nextBillingDate: Date;
  amount: string;
}

export function ReactivateConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  nextBillingDate,
  amount,
}: ReactivateConfirmDialogProps) {
  const formattedDate = nextBillingDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <ModalPortal.Backdrop onClick={onCancel} opacity={60} />

        <ModalPortal.Content className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border-4 border-purple-200 dark:border-purple-800 overflow-hidden">

            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/20 to-pink-100/20 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full blur-3xl -z-10" />

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Icon */}
              <div className="flex items-center justify-center">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-full">
                  <CheckCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100">
                Reactivate Subscription?
              </h2>

              {/* Message */}
              <p className="text-center text-gray-600 dark:text-gray-400">
                Resume your subscription? You&apos;ll continue to be charged{' '}
                <strong className="text-gray-900 dark:text-gray-100">{amount}</strong> starting on{' '}
                <strong className="text-gray-900 dark:text-gray-100">{formattedDate}</strong>.
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={onCancel}
                  className="flex-1 min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg min-h-[44px]"
                >
                  Reactivate
                </Button>
              </div>
            </div>
          </ModalPortal.Content>
        </div>
      </ModalPortal>
  );
}
