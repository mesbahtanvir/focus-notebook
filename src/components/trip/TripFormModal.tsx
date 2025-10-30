'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Trip, TripStatus, useTrips } from '@/store/useTrips';
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

interface TripFormData {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  status: TripStatus;
  notes?: string;
}

interface TripFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: Trip;
}

export function TripFormModal({ isOpen, onClose, trip }: TripFormModalProps) {
  const { addTrip, updateTrip } = useTrips();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TripFormData>({
    defaultValues: trip
      ? {
          name: trip.name,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          budget: trip.budget,
          currency: trip.currency,
          status: trip.status,
          notes: trip.notes || '',
        }
      : {
          status: 'planning',
          currency: 'USD',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        },
  });

  const status = watch('status');

  const onSubmit = async (data: TripFormData) => {
    setIsSubmitting(true);
    try {
      if (trip) {
        await updateTrip(trip.id, {
          name: data.name,
          destination: data.destination,
          startDate: data.startDate,
          endDate: data.endDate,
          budget: Number(data.budget),
          currency: data.currency,
          status: data.status,
          notes: data.notes,
        });
        toast({ title: 'Success', description: 'Trip updated successfully!' });
      } else {
        await addTrip({
          name: data.name,
          destination: data.destination,
          startDate: data.startDate,
          endDate: data.endDate,
          budget: Number(data.budget),
          currency: data.currency,
          status: data.status,
          notes: data.notes,
        });
        toast({ title: 'Success', description: 'Trip created successfully!' });
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving trip:', error);
      toast({ title: 'Error', description: 'Failed to save trip', variant: 'destructive' });
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
            {trip ? 'Edit Trip' : 'Plan New Trip'}
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
            <Label htmlFor="name">Trip Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g., Summer Vacation to Japan"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="destination">Destination *</Label>
            <Input
              id="destination"
              {...register('destination', { required: 'Destination is required' })}
              placeholder="e.g., Tokyo, Japan"
            />
            {errors.destination && (
              <p className="text-sm text-red-500 mt-1">{errors.destination.message}</p>
            )}
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
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate', { required: 'End date is required' })}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500 mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Budget *</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                {...register('budget', {
                  required: 'Budget is required',
                  min: { value: 0, message: 'Must be positive' },
                })}
                placeholder="e.g., 5000"
              />
              {errors.budget && (
                <p className="text-sm text-red-500 mt-1">{errors.budget.message}</p>
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
            <Label htmlFor="status">Status *</Label>
            <Select
              value={status}
              onChange={(e) => setValue('status', e.target.value as TripStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any notes about this trip"
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
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : trip ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
