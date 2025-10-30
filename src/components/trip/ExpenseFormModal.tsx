'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Expense, ExpenseCategory, useTrips } from '@/store/useTrips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ExpenseFormData {
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string;
  description: string;
  tags?: string;
}

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  expense?: Expense;
}

export function ExpenseFormModal({
  isOpen,
  onClose,
  tripId,
  expense,
}: ExpenseFormModalProps) {
  const { addExpense, updateExpense, addStandaloneExpense, updateStandaloneExpense, getTrip } =
    useTrips();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const trip = tripId ? getTrip(tripId) : null;
  const defaultCurrency = trip?.currency || 'USD';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ExpenseFormData>({
    defaultValues: expense
      ? {
          category: expense.category,
          amount: expense.amount,
          currency: expense.currency,
          date: expense.date,
          description: expense.description,
          tags: expense.tags?.join(', ') || '',
        }
      : {
          category: 'food',
          currency: defaultCurrency,
          date: new Date().toISOString().split('T')[0],
        },
  });

  const category = watch('category');

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const tags = data.tags
        ?.split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (expense) {
        // Updating existing expense
        if (tripId && expense.tripId) {
          await updateExpense(tripId, expense.id, {
            category: data.category,
            amount: Number(data.amount),
            currency: data.currency,
            date: data.date,
            description: data.description,
            tags,
          });
        } else {
          await updateStandaloneExpense(expense.id, {
            category: data.category,
            amount: Number(data.amount),
            currency: data.currency,
            date: data.date,
            description: data.description,
            tags,
          });
        }
        toast({ title: 'Success', description: 'Expense updated successfully!' });
      } else {
        // Adding new expense
        if (tripId) {
          await addExpense(tripId, {
            category: data.category,
            amount: Number(data.amount),
            currency: data.currency,
            date: data.date,
            description: data.description,
            tags,
          });
        } else {
          await addStandaloneExpense({
            category: data.category,
            amount: Number(data.amount),
            currency: data.currency,
            date: data.date,
            description: data.description,
            tags,
          });
        }
        toast({ title: 'Success', description: 'Expense added successfully!' });
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({ title: 'Error', description: 'Failed to save expense', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {tripId && trip && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-lg">
              <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
                Adding expense to: {trip.name}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              {...register('description', { required: 'Description is required' })}
              placeholder="e.g., Dinner at restaurant"
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={category}
              onChange={(e) => setValue('category', (e.target?.value ?? '') as ExpenseCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="airfare">Airfare</SelectItem>
                <SelectItem value="accommodation">Accommodation</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="transportation">Transportation</SelectItem>
                <SelectItem value="activities">Activities</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="misc">Miscellaneous</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0, message: 'Must be positive' },
                })}
                placeholder="e.g., 25.50"
              />
              {errors.amount && (
                <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="currency">Currency *</Label>
              <Input
                id="currency"
                {...register('currency', { required: 'Currency is required' })}
                placeholder="e.g., USD"
              />
              {errors.currency && (
                <p className="text-sm text-red-500 mt-1">{errors.currency.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              {...register('date', { required: 'Date is required' })}
            />
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              {...register('tags')}
              placeholder="e.g., business, meal, tokyo"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : expense ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
