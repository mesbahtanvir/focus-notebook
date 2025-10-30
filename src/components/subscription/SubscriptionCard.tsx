'use client';

import { Edit, Trash2 } from 'lucide-react';
import { Subscription } from '@/store/useSubscriptions';
import { Card } from '@/components/ui/card';

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
}: SubscriptionCardProps) {
  const getStatusBadge = (status: Subscription['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntilBilling = () => {
    const today = new Date();
    const billingDate = new Date(subscription.nextBillingDate);
    const diffTime = billingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilBilling();

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">{subscription.name}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(subscription.status)}`}>
              {subscription.status}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
              {formatCurrency(subscription.cost)}
            </span>
            <span className="text-sm text-gray-500">/ {subscription.billingCycle}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Next: {formatDate(subscription.nextBillingDate)}</span>
            {daysUntil >= 0 && daysUntil <= 7 && (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                in {daysUntil}d
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => onEdit(subscription)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label="Edit"
          >
            <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(subscription.id)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </Card>
  );
}
