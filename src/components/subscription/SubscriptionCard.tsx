'use client';

import { Edit, Trash2 } from 'lucide-react';
import { Subscription } from '@/store/useSubscriptions';

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
  const getStatusColor = (status: Subscription['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400';
      case 'paused':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getCategoryColor = (category: Subscription['category']) => {
    switch (category) {
      case 'entertainment':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'productivity':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'health':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'utilities':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'education':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
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
  const isUpcoming = daysUntil >= 0 && daysUntil <= 7;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
      isUpcoming ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <span className="font-medium text-sm truncate min-w-[120px]">{subscription.name}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(subscription.category)}`}>
          {subscription.category}
        </span>
        <span className={`text-xs font-medium ${getStatusColor(subscription.status)}`}>
          {subscription.status}
        </span>
        <span className="font-semibold text-cyan-600 dark:text-cyan-400 text-sm">
          {formatCurrency(subscription.cost)}
        </span>
        <span className="text-xs text-gray-500">/{subscription.billingCycle}</span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {formatDate(subscription.nextBillingDate)}
        </span>
        {isUpcoming && (
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            in {daysUntil}d
          </span>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onEdit(subscription)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Edit"
        >
          <Edit className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={() => onDelete(subscription.id)}
          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>
    </div>
  );
}
