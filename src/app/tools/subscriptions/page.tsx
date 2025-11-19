'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Subscription, useSubscriptions } from '@/store/useSubscriptions';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { SubscriptionFormModal } from '@/components/subscription/SubscriptionFormModal';
import { ToolHeader } from '@/components/tools/ToolHeader';
import { SearchAndFilters } from '@/components/tools/SearchAndFilters';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Card } from '@/components/ui/card';
import { toolThemes } from '@/components/tools/themes';
import { Calendar } from 'lucide-react';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast-presets';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const {
    subscriptions,
    isLoading,
    subscribe,
    getTotalMonthlyCost,
    getTotalYearlyCost,
    getActiveSubscriptions,
    getUpcomingBillings,
    delete: deleteSubscription,
  } = useSubscriptions();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || sub.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalMonthlyCost = getTotalMonthlyCost();
  const totalYearlyCost = getTotalYearlyCost();
  const activeCount = getActiveSubscriptions().length;
  const upcomingWeek = getUpcomingBillings(7);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user?.uid) {
      toastWarning({ title: 'You must be logged in', description: 'Sign in to manage subscriptions.' });
      return;
    }

    if (confirm('Are you sure you want to delete this subscription?')) {
      try {
        await deleteSubscription(user.uid, id);
        toastSuccess({ title: 'Success', description: 'Subscription deleted' });
      } catch (error) {
        toastError({ title: 'Error', description: 'Failed to delete subscription' });
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSubscription(undefined);
  };

  const theme = toolThemes.blue;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <ToolHeader
          title="Subscription Tracker"
          emoji="📅"
          showBackButton
          stats={[
            {
              label: 'Monthly',
              value: formatCurrency(totalMonthlyCost),
              variant: 'default',
            },
            {
              label: 'Yearly',
              value: formatCurrency(totalYearlyCost),
              variant: 'info',
            },
            {
              label: 'Active',
              value: activeCount.toString(),
              variant: 'success',
            },
          ]}
          theme={theme}
        />

        {upcomingWeek.length > 0 && (
          <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Billings (Next 7 Days)
            </h3>
            <div className="space-y-2">
              {upcomingWeek.map((sub) => {
                const date = new Date(sub.nextBillingDate);
                return (
                  <div key={sub.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{sub.name}</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                      {formatCurrency(sub.cost)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <SearchAndFilters
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search subscriptions..."
          totalCount={subscriptions.length}
          filteredCount={filteredSubscriptions.length}
          showFilterToggle={true}
          filterContent={
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'active', 'paused', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status as any)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        statusFilter === status
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Category</h4>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'entertainment', 'productivity', 'health', 'utilities', 'education', 'other'].map(
                    (category) => (
                      <button
                        key={category}
                        onClick={() => setCategoryFilter(category)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          categoryFilter === category
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          }
          theme={theme}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">No subscriptions yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start tracking your recurring subscriptions
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <FloatingActionButton onClick={() => setIsFormOpen(true)} title="Add" />

        <SubscriptionFormModal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          subscription={editingSubscription}
        />
      </div>
    </div>
  );
}
