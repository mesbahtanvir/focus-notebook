'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { ContributionType, useInvestments } from '@/store/useInvestments';
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

interface ContributionFormData {
  type: ContributionType;
  amount: number;
  date: string;
  note?: string;
}

interface ContributionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  investmentId: string;
}

export function ContributionFormModal({
  isOpen,
  onClose,
  portfolioId,
  investmentId,
}: ContributionFormModalProps) {
  const { addContribution } = useInvestments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ContributionFormData>({
    defaultValues: {
      type: 'deposit',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const contributionType = watch('type');

  const onSubmit = async (data: ContributionFormData) => {
    setIsSubmitting(true);
    try {
      await addContribution(portfolioId, investmentId, {
        type: data.type,
        amount: Number(data.amount),
        date: data.date,
        note: data.note,
      });
      toast({ title: 'Success', description: 'Contribution added successfully!' });
      reset();
      onClose();
    } catch (error) {
      console.error('Error adding contribution:', error);
      toast({ title: 'Error', description: 'Failed to add contribution', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Add Contribution</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <Label htmlFor="type">Type *</Label>
            <Select
              value={contributionType}
              onValueChange={(value) => setValue('type', value as ContributionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit (Add funds)</SelectItem>
                <SelectItem value="withdrawal">Withdrawal (Remove funds)</SelectItem>
                <SelectItem value="value-update">Value Update (Set new value)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {contributionType === 'deposit' && 'Add money to this investment'}
              {contributionType === 'withdrawal' && 'Remove money from this investment'}
              {contributionType === 'value-update' && 'Update the current market value'}
            </p>
          </div>

          <div>
            <Label htmlFor="amount">
              Amount * {contributionType === 'value-update' && '(New Total Value)'}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0, message: 'Must be positive' },
              })}
              placeholder="e.g., 1000"
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
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
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              {...register('note')}
              placeholder="Optional note about this transaction"
              rows={2}
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
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
