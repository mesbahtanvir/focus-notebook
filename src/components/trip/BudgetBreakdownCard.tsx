'use client';

import { useState } from 'react';
import { Trip, ExpenseCategory, useTrips } from '@/store/useTrips';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryBudgetInput } from './CategoryBudgetInput';
import { Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BudgetBreakdownCardProps {
  trip: Trip;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'airfare',
  'accommodation',
  'food',
  'transportation',
  'activities',
  'shopping',
  'misc',
  'other',
];

export function BudgetBreakdownCard({ trip }: BudgetBreakdownCardProps) {
  const { updateBudgetBreakdown, getTotalPlannedBudget, getPlannedBudgetByCategory } = useTrips();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [budgetBreakdown, setBudgetBreakdown] = useState<Partial<Record<ExpenseCategory, number>>>(
    trip.budgetBreakdown ?? {}
  );
  const canEdit = trip.status === 'planning';

  const handleCategoryChange = (category: ExpenseCategory, value: number) => {
    setBudgetBreakdown((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      await updateBudgetBreakdown(trip.id, budgetBreakdown);
      toast({ title: 'Success', description: 'Budget breakdown updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating budget breakdown:', error);
      toast({
        title: 'Error',
        description: 'Failed to update budget breakdown',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setBudgetBreakdown(trip.budgetBreakdown ?? {});
    setIsEditing(false);
  };

  const totalPlanned = Object.values(budgetBreakdown).reduce((sum, val) => sum + (val || 0), 0);
  const budgetUtilization = trip.budget ? (totalPlanned / trip.budget) * 100 : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Budget Breakdown</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {canEdit
              ? 'Estimate your spend by category to stay on track when the trip begins.'
              : 'Planned budget by category for this trip.'}
          </p>
        </div>
        {canEdit && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPENSE_CATEGORIES.map((category) => (
              <CategoryBudgetInput
                key={category}
                category={category}
                value={budgetBreakdown[category] || 0}
                onChange={handleCategoryChange}
                currency={trip.currency}
              />
            ))}
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Total Planned</span>
              <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                {trip.currency} {totalPlanned.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Trip Budget</span>
              <span>
                {trip.currency} {trip.budget.toFixed(2)}
              </span>
            </div>
            {budgetUtilization > 100 && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                ⚠️ Planned budget exceeds trip budget by {(budgetUtilization - 100).toFixed(1)}%
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {trip.budgetBreakdown && Object.keys(trip.budgetBreakdown).length > 0 ? (
            <>
              <div className="space-y-3">
                {EXPENSE_CATEGORIES.map((category) => {
                  const amount = getPlannedBudgetByCategory(trip.id, category);
                  const percentage = trip.budget ? (amount / trip.budget) * 100 : 0;

                  if (amount === 0) return null;

                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{category.replace('-', ' ')}</span>
                        <span className="font-medium">
                          {trip.currency} {amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-teal-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Planned</span>
                  <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                    {trip.currency} {getTotalPlannedBudget(trip.id).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span>of {trip.currency} {trip.budget.toFixed(2)} budget</span>
                  <span>{budgetUtilization.toFixed(1)}%</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No budget breakdown set yet.</p>
              <p className="text-sm mt-1">
                {canEdit
                  ? 'Click Edit to plan your budget by category.'
                  : 'Budgets can be planned before the trip begins.'}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
