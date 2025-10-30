'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, useTrips } from '@/store/useTrips';
import { ExpenseFormModal } from '@/components/trip/ExpenseFormModal';
import { ToolHeader } from '@/components/tools/ToolHeader';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toolThemes } from '@/components/tools/themes';
import { MapPin, Calendar, DollarSign, Trash2, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TripDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    subscribe,
    getTrip,
    getTotalSpent,
    getBudgetRemaining,
    getSpentByCategory,
    getAverageDailySpend,
    deleteExpense,
  } = useTrips();

  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const trip = getTrip(params.id);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Trip not found</h2>
          <Button onClick={() => router.push('/tools/trips')}>Back to Trips</Button>
        </div>
      </div>
    );
  }

  const totalSpent = getTotalSpent(trip.id);
  const remaining = getBudgetRemaining(trip.id);
  const budgetPercent = trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0;
  const isOverBudget = budgetPercent > 100;
  const avgDaily = getAverageDailySpend(trip.id);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(trip.id, expenseId);
        toast({ title: 'Success', description: 'Expense deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete expense', variant: 'destructive' });
      }
    }
  };

  const categories: Array<Expense['category']> = ['food', 'transport', 'accommodation', 'entertainment', 'shopping', 'other'];
  const categorySpending = categories.map((category) => ({
    category,
    amount: getSpentByCategory(trip.id, category),
  })).filter((item) => item.amount > 0);

  const theme = toolThemes.teal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <ToolHeader
          title={trip.name}
          emoji="✈️"
          showBackButton
          stats={[
            {
              label: 'Spent',
              value: formatCurrency(totalSpent, trip.currency),
              variant: isOverBudget ? 'warning' : 'default',
            },
            {
              label: 'Remaining',
              value: formatCurrency(remaining, trip.currency),
              variant: remaining < 0 ? 'warning' : 'success',
            },
          ]}
          theme={theme}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-5 h-5 text-teal-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">
                  Destination
                </h3>
                <p className="text-xl font-bold">{trip.destination}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-teal-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">Dates</h3>
                <p className="text-lg">
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget</h3>
                <p className="text-2xl font-bold">{formatCurrency(trip.budget, trip.currency)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Usage</span>
                  <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>
                    {budgetPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isOverBudget ? 'bg-red-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Spent</h3>
            <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-teal-600'}`}>
              {formatCurrency(totalSpent, trip.currency)}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Avg Daily Spend</h3>
            <p className="text-2xl font-bold">{formatCurrency(avgDaily, trip.currency)}</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Expenses</h3>
            <p className="text-2xl font-bold">{trip.expenses.length}</p>
          </Card>
        </div>

        {categorySpending.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categorySpending.map(({ category, amount }) => (
                <div key={category} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{category}</p>
                  <p className="text-lg font-bold">{formatCurrency(amount, trip.currency)}</p>
                  <p className="text-xs text-gray-500">
                    {((amount / totalSpent) * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-4">Expenses</h2>
          {trip.expenses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No expenses recorded yet</p>
              <Button
                onClick={() => setIsExpenseFormOpen(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Add First Expense
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {trip.expenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((expense) => (
                  <Card key={expense.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{expense.description}</h3>
                          <Badge className="capitalize">{expense.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(expense.date)}
                          </span>
                          {expense.tags && expense.tags.length > 0 && (
                            <div className="flex gap-1">
                              {expense.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {formatCurrency(expense.amount, expense.currency)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {trip.notes && (
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-gray-700 dark:text-gray-300">{trip.notes}</p>
          </Card>
        )}

        <FloatingActionButton onClick={() => setIsExpenseFormOpen(true)} title="Add" />

        <ExpenseFormModal
          isOpen={isExpenseFormOpen}
          onClose={() => {
            setIsExpenseFormOpen(false);
            setEditingExpense(undefined);
          }}
          tripId={trip.id}
          expense={editingExpense}
        />
      </div>
    </div>
  );
}
