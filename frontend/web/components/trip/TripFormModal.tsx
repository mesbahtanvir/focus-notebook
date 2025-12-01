'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Trip, useTrips } from '@/store/useTrips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toastError, toastSuccess } from '@/lib/toast-presets';

interface TripFormData {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TripFormData>({
    defaultValues: trip
      ? {
          name: trip.name,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          budget: trip.budget,
          currency: trip.currency,
          notes: trip.notes || '',
        }
      : {
          currency: 'USD',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        },
  });

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
          notes: data.notes,
        });
        toastSuccess({ title: 'Success', description: 'Trip updated successfully!' });
      } else {
        await addTrip({
          name: data.name,
          destination: data.destination,
          startDate: data.startDate,
          endDate: data.endDate,
          budget: Number(data.budget),
          currency: data.currency,
          notes: data.notes,
        });
        toastSuccess({ title: 'Success', description: 'Trip created successfully!' });
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving trip:', error);
      toastError({ title: 'Error', description: 'Failed to save trip' });
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

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
            <p>
              Trip status updates automatically based on your dates: before the start it stays in
              planning, during the trip it switches to in-progress, and after the end date it moves
              to completed.
            </p>
            {trip && (
              <p className="mt-2">
                Current status: <span className="font-semibold capitalize">{trip.status}</span>
              </p>
            )}
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
