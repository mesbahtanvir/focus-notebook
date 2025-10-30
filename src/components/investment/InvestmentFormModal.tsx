'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Investment, InvestmentType, useInvestments } from '@/store/useInvestments';
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

interface InvestmentFormData {
  name: string;
  type: InvestmentType;
  initialAmount: number;
  currentValue: number;
  notes?: string;
}

interface InvestmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  investment?: Investment;
}

export function InvestmentFormModal({
  isOpen,
  onClose,
  portfolioId,
  investment,
}: InvestmentFormModalProps) {
  const { addInvestment, updateInvestment } = useInvestments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<InvestmentFormData>({
    defaultValues: investment
      ? {
          name: investment.name,
          type: investment.type,
          initialAmount: investment.initialAmount,
          currentValue: investment.currentValue,
          notes: investment.notes || '',
        }
      : {
          type: 'stocks',
          initialAmount: 0,
          currentValue: 0,
        },
  });

  const investmentType = watch('type');

  const onSubmit = async (data: InvestmentFormData) => {
    setIsSubmitting(true);
    try {
      if (investment) {
        await updateInvestment(portfolioId, investment.id, {
          name: data.name,
          type: data.type,
          initialAmount: Number(data.initialAmount),
          currentValue: Number(data.currentValue),
          notes: data.notes,
        });
        toast({ title: 'Success', description: 'Investment updated successfully!' });
      } else {
        await addInvestment(portfolioId, {
          name: data.name,
          type: data.type,
          initialAmount: Number(data.initialAmount),
          currentValue: Number(data.currentValue),
          notes: data.notes,
        });
        toast({ title: 'Success', description: 'Investment added successfully!' });
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving investment:', error);
      toast({ title: 'Error', description: 'Failed to save investment', variant: 'destructive' });
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
            {investment ? 'Edit Investment' : 'Add New Investment'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <Label htmlFor="name">Investment Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g., Apple Stock, Bitcoin, Rental Property"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Type *</Label>
            <Select
              value={investmentType}
              onChange={(e) => setValue('type', e.target.value as InvestmentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stocks">Stocks</SelectItem>
                <SelectItem value="bonds">Bonds</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                <SelectItem value="real-estate">Real Estate</SelectItem>
                <SelectItem value="retirement">Retirement Account</SelectItem>
                <SelectItem value="mutual-funds">Mutual Funds</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="initialAmount">Initial Amount *</Label>
            <Input
              id="initialAmount"
              type="number"
              step="0.01"
              {...register('initialAmount', {
                required: 'Initial amount is required',
                min: { value: 0, message: 'Must be positive' },
              })}
              placeholder="e.g., 10000"
            />
            {errors.initialAmount && (
              <p className="text-sm text-red-500 mt-1">{errors.initialAmount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="currentValue">Current Value *</Label>
            <Input
              id="currentValue"
              type="number"
              step="0.01"
              {...register('currentValue', {
                required: 'Current value is required',
                min: { value: 0, message: 'Must be positive' },
              })}
              placeholder="e.g., 12500"
            />
            {errors.currentValue && (
              <p className="text-sm text-red-500 mt-1">{errors.currentValue.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes about this investment"
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
              {isSubmitting ? 'Saving...' : investment ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
