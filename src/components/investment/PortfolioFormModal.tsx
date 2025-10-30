'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Portfolio, PortfolioStatus, useInvestments } from '@/store/useInvestments';
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

interface PortfolioFormData {
  name: string;
  description?: string;
  status: PortfolioStatus;
  targetAmount?: number;
  targetDate?: string;
}

interface PortfolioFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio?: Portfolio;
}

export function PortfolioFormModal({ isOpen, onClose, portfolio }: PortfolioFormModalProps) {
  const { addPortfolio, updatePortfolio } = useInvestments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PortfolioFormData>({
    defaultValues: portfolio
      ? {
          name: portfolio.name,
          description: portfolio.description || '',
          status: portfolio.status,
          targetAmount: portfolio.targetAmount,
          targetDate: portfolio.targetDate,
        }
      : {
          status: 'active',
        },
  });

  const status = watch('status');

  const onSubmit = async (data: PortfolioFormData) => {
    setIsSubmitting(true);
    try {
      if (portfolio) {
        await updatePortfolio(portfolio.id, {
          name: data.name,
          description: data.description,
          status: data.status,
          targetAmount: data.targetAmount ? Number(data.targetAmount) : undefined,
          targetDate: data.targetDate || undefined,
        });
        toast({ title: 'Success', description: 'Portfolio updated successfully!' });
      } else {
        await addPortfolio({
          name: data.name,
          description: data.description,
          status: data.status,
          targetAmount: data.targetAmount ? Number(data.targetAmount) : undefined,
          targetDate: data.targetDate || undefined,
        });
        toast({ title: 'Success', description: 'Portfolio created successfully!' });
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving portfolio:', error);
      toast({ title: 'Error', description: 'Failed to save portfolio', variant: 'destructive' });
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
            {portfolio ? 'Edit Portfolio' : 'Create New Portfolio'}
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
            <Label htmlFor="name">Portfolio Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g., Retirement, Trading, Real Estate"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="What is this portfolio for?"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={status}
              onValueChange={(value) => setValue('status', value as PortfolioStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="targetAmount">Target Amount (optional)</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              {...register('targetAmount')}
              placeholder="e.g., 100000"
            />
          </div>

          <div>
            <Label htmlFor="targetDate">Target Date (optional)</Label>
            <Input
              id="targetDate"
              type="date"
              {...register('targetDate')}
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
              {isSubmitting ? 'Saving...' : portfolio ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
