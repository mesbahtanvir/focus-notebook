'use client';

import { motion } from 'framer-motion';
import { Calendar, DollarSign, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { Subscription } from '@/store/useSubscriptions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SubscriptionCardProps {
  subscription: Subscription;
  index: number;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionCard({
  subscription,
  index,
  onEdit,
  onDelete,
}: SubscriptionCardProps) {
  const getStatusColor = (status: Subscription['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getCategoryColor = (category: Subscription['category']) => {
    switch (category) {
      case 'entertainment':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'productivity':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'health':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'utilities':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      case 'education':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntilBilling = () => {
    const today = new Date();
    const billingDate = new Date(subscription.nextBillingDate);
    const diffTime = billingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilBilling();
  const isUpcoming = daysUntil <= 7 && daysUntil >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={`p-6 hover:shadow-lg transition-all border-l-4 ${
        isUpcoming ? 'border-l-blue-500' : 'border-l-cyan-500'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{subscription.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(subscription.status)}>
                {subscription.status}
              </Badge>
              <Badge className={getCategoryColor(subscription.category)}>
                {subscription.category}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(subscription)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(subscription.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-600" />
              <span className="text-sm font-medium">Cost</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-cyan-600">
                {formatCurrency(subscription.cost)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                /{subscription.billingCycle}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium">Next Billing</span>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatDate(subscription.nextBillingDate)}</p>
              {daysUntil >= 0 && (
                <p className={`text-xs ${isUpcoming ? 'text-blue-600 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                  in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {subscription.autoRenew && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <RefreshCw className="w-4 h-4" />
              <span>Auto-renews</span>
            </div>
          )}

          {subscription.paymentMethod && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Payment: {subscription.paymentMethod}
            </div>
          )}

          {subscription.notes && (
            <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              {subscription.notes}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
