'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import {
  Subscription,
  SubscriptionCategory,
  BillingCycle,
  SubscriptionStatus,
  useSubscriptions,
} from '@/store/useSubscriptions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionFormData {
  name: string;
  category: SubscriptionCategory;
  cost: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  startDate: string;
  endDate?: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  paymentMethod?: string;
  notes?: string;
}

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription?: Subscription;
}

export function SubscriptionFormModal({
  isOpen,
  onClose,
  subscription,
}: SubscriptionFormModalProps) {
  const { user } = useAuth();
  const { add, update } = useSubscriptions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SubscriptionFormData>({
    defaultValues: subscription
      ? {
          name: subscription.name,
          category: subscription.category,
          cost: subscription.cost,
          billingCycle: subscription.billingCycle,
          nextBillingDate: subscription.nextBillingDate,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          status: subscription.status,
          autoRenew: subscription.autoRenew,
          paymentMethod: subscription.paymentMethod || '',
          notes: subscription.notes || '',
        }
      : {
          category: 'entertainment',
          billingCycle: 'monthly',
          status: 'active',
          autoRenew: true,
          startDate: new Date().toISOString().split('T')[0],
          nextBillingDate: new Date().toISOString().split('T')[0],
        },
  });

  const category = watch('category');
  const billingCycle = watch('billingCycle');
  const status = watch('status');
  const autoRenew = watch('autoRenew');

  // Reset form when subscription changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (subscription) {
        reset({
          name: subscription.name,
          category: subscription.category,
          cost: subscription.cost,
          billingCycle: subscription.billingCycle,
          nextBillingDate: subscription.nextBillingDate,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          status: subscription.status,
          autoRenew: subscription.autoRenew,
          paymentMethod: subscription.paymentMethod || '',
          notes: subscription.notes || '',
        });
      } else {
        reset({
          name: '',
          category: 'entertainment',
          cost: 0,
          billingCycle: 'monthly',
          status: 'active',
          autoRenew: true,
          startDate: new Date().toISOString().split('T')[0],
          nextBillingDate: new Date().toISOString().split('T')[0],
          paymentMethod: '',
          notes: '',
        });
      }
    }
  }, [isOpen, subscription, reset]);

  const onSubmit = async (data: SubscriptionFormData) => {
    if (!user?.uid) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (subscription) {
        await update(user.uid, subscription.id, {
          name: data.name,
          category: data.category,
          cost: Number(data.cost),
          billingCycle: data.billingCycle,
          nextBillingDate: data.nextBillingDate,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          status: data.status,
          autoRenew: data.autoRenew,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
        });
        toast({ title: 'Success', description: 'Subscription updated successfully!' });
      } else {
        await add(user.uid, {
          name: data.name,
          category: data.category,
          cost: Number(data.cost),
          billingCycle: data.billingCycle,
          nextBillingDate: data.nextBillingDate,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          status: data.status,
          autoRenew: data.autoRenew,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
        });
        toast({ title: 'Success', description: 'Subscription added successfully!' });
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast({ title: 'Error', description: 'Failed to save subscription', variant: 'destructive' });
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
            {subscription ? 'Edit Subscription' : 'Add New Subscription'}
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
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g., Netflix, Spotify, Gym"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setValue('category', e.target.value as SubscriptionCategory)}
              >
                <SelectContent>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                id="status"
                value={status}
                onChange={(e) => setValue('status', e.target.value as SubscriptionStatus)}
              >
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">Cost *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                {...register('cost', {
                  required: 'Cost is required',
                  min: { value: 0, message: 'Must be positive' },
                })}
                placeholder="e.g., 9.99"
              />
              {errors.cost && (
                <p className="text-sm text-red-500 mt-1">{errors.cost.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="billingCycle">Billing *</Label>
              <Select
                id="billingCycle"
                value={billingCycle}
                onChange={(e) => setValue('billingCycle', e.target.value as BillingCycle)}
              >
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'Start date is required' })}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="nextBillingDate">Next Billing *</Label>
              <Input
                id="nextBillingDate"
                type="date"
                {...register('nextBillingDate', { required: 'Next billing date is required' })}
              />
              {errors.nextBillingDate && (
                <p className="text-sm text-red-500 mt-1">{errors.nextBillingDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="endDate">End Date (optional)</Label>
            <Input id="endDate" type="date" {...register('endDate')} />
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Input
              id="paymentMethod"
              {...register('paymentMethod')}
              placeholder="e.g., Visa ending in 1234"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRenew"
              checked={autoRenew}
              onCheckedChange={(checked) => setValue('autoRenew', checked as boolean)}
            />
            <Label htmlFor="autoRenew" className="cursor-pointer">
              Auto-renew enabled
            </Label>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes"
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
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : subscription ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
