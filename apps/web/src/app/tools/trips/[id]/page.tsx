'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, ExpenseCategory, useTrips } from '@/store/useTrips';
import { ExpenseFormModal } from '@/components/trip/ExpenseFormModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BudgetBreakdownCard } from '@/components/trip/BudgetBreakdownCard';
import { PackingListInline } from '@/components/trip/PackingListInline';
import { formatCurrency } from '@/lib/services/currency';

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
  const isPlanning = trip.status === 'planning';
  const canAddExpenses = true;
  const hasBudgetBreakdown = !!(trip.budgetBreakdown && Object.keys(trip.budgetBreakdown).length > 0);

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

  const categories: ExpenseCategory[] = [
    'airfare',
    'accommodation',
    'food',
    'transportation',
    'activities',
    'shopping',
    'misc',
    'other',
  ];

  const spendByCategory = categories.reduce<Record<ExpenseCategory, number>>((acc, category) => {
    acc[category] = getSpentByCategory(trip.id, category);
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  const categorySpending = categories
    .map((category) => ({
      category,
      amount: spendByCategory[category],
    }))
    .filter((item) => item.amount > 0);

  const budgetVsActual = categories
    .map((category) => ({
      category,
      planned: trip.budgetBreakdown?.[category] || 0,
      actual: spendByCategory[category],
    }))
    .filter((item) => item.planned > 0 || item.actual > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Unified Header */}
        <Card className="p-6 bg-white dark:bg-gray-900 border-teal-200 dark:border-teal-800">
          <div className="space-y-4">
            {/* Back button and emoji */}
            <div className="flex items-start justify-between">
              <Button
                variant="ghost"
                onClick={() => router.push('/tools/trips')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 -ml-2"
              >
                ← Back to Trips
              </Button>
              <span className="text-4xl">✈️</span>
            </div>

            {/* Trip name */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {trip.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {trip.destination}
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </span>
              </div>
            </div>

            {/* Budget info and progress */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-4 text-base">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Budget: {formatCurrency(trip.budget, trip.currency)}
                </span>
                <span className="text-gray-400">•</span>
                <span className={isOverBudget ? 'text-red-600 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                  Spent: {formatCurrency(totalSpent, trip.currency)}
                </span>
                <span className="text-gray-400">•</span>
                <span className={remaining < 0 ? 'text-red-600 font-semibold' : 'text-teal-600 dark:text-teal-400 font-semibold'}>
                  Remaining: {formatCurrency(remaining, trip.currency)}
                </span>
              </div>

              {/* Progress bar with percentage */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        isOverBudget ? 'bg-red-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                  {budgetPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {(isPlanning || hasBudgetBreakdown) && <BudgetBreakdownCard trip={trip} />}

        <PackingListInline tripId={trip.id} tripName={trip.name} tripStatus={trip.status} />

        {!isPlanning && budgetVsActual.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Planned vs. Actual Spend</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Planned</th>
                    <th className="py-2 pr-4 font-medium">Actual</th>
                    <th className="py-2 font-medium">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {budgetVsActual.map(({ category, planned, actual }) => {
                    const variance = actual - planned;
                    return (
                      <tr key={category}>
                        <td className="py-2 pr-4 capitalize">{category}</td>
                        <td className="py-2 pr-4">
                          {formatCurrency(planned, trip.currency)}
                        </td>
                        <td className="py-2 pr-4">
                          {formatCurrency(actual, trip.currency)}
                        </td>
                        <td className={`py-2 ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                          {formatCurrency(variance, trip.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {categorySpending.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categorySpending.map(({ category, amount }) => (
                <div key={category} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{category}</p>
                  <p className="text-lg font-bold">{formatCurrency(amount, trip.currency)}</p>
                  <p className="text-xs text-gray-500">
                    {totalSpent > 0 ? `${((amount / totalSpent) * 100).toFixed(0)}%` : '—'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Expenses</h2>
            {!isPlanning && (
              <Button
                onClick={() => setIsExpenseFormOpen(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Add Expense
              </Button>
            )}
          </div>
          {isPlanning ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Expense tracking unlocks once your trip starts. Use the budget planner above to
                outline expected spending by category.
              </p>
            </Card>
          ) : trip.expenses.length === 0 ? (
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
                          {expense.currency !== trip.currency && (
                            <p className="text-xs text-gray-500">
                              ({expense.currency})
                            </p>
                          )}
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

        <ExpenseFormModal
          isOpen={canAddExpenses && isExpenseFormOpen}
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
