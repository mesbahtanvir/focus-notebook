'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { X, Briefcase, Palmtree, Mountain, Users, Laptop, Check } from 'lucide-react';
import { Trip, useTrips, TripPurpose, TripActivity, AccommodationType } from '@/store/useTrips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toastError, toastSuccess } from '@/lib/toast-presets';
import { cn } from '@/lib/utils';

interface TripFormData {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  notes?: string;
  purpose?: TripPurpose;
  activities?: TripActivity[];
  accommodation?: AccommodationType;
}

const PURPOSE_OPTIONS: { value: TripPurpose; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'leisure', label: 'Leisure', icon: <Palmtree className="w-4 h-4" />, description: 'Vacation & relaxation' },
  { value: 'business', label: 'Business', icon: <Briefcase className="w-4 h-4" />, description: 'Work travel' },
  { value: 'adventure', label: 'Adventure', icon: <Mountain className="w-4 h-4" />, description: 'Outdoor activities' },
  { value: 'family', label: 'Family', icon: <Users className="w-4 h-4" />, description: 'Traveling with family' },
  { value: 'digital-nomad', label: 'Digital Nomad', icon: <Laptop className="w-4 h-4" />, description: 'Work + travel' },
];

const ACTIVITY_OPTIONS: { value: TripActivity; label: string; emoji: string }[] = [
  { value: 'beach', label: 'Beach', emoji: '\u{1F3D6}' },
  { value: 'hiking', label: 'Hiking', emoji: '\u{1F6B6}' },
  { value: 'city', label: 'City', emoji: '\u{1F3D9}' },
  { value: 'formal', label: 'Formal Events', emoji: '\u{1F454}' },
  { value: 'snow-sports', label: 'Snow Sports', emoji: '\u{26F7}' },
  { value: 'diving', label: 'Diving', emoji: '\u{1F93F}' },
  { value: 'photography', label: 'Photography', emoji: '\u{1F4F7}' },
  { value: 'camping', label: 'Camping', emoji: '\u{1F3D5}' },
];

const ACCOMMODATION_OPTIONS: { value: AccommodationType; label: string; emoji: string }[] = [
  { value: 'hotel', label: 'Hotel', emoji: '\u{1F3E8}' },
  { value: 'airbnb', label: 'Airbnb/Rental', emoji: '\u{1F3E0}' },
  { value: 'hostel', label: 'Hostel', emoji: '\u{1F6CF}' },
  { value: 'camping', label: 'Camping', emoji: '\u{26FA}' },
  { value: 'mixed', label: 'Mixed', emoji: '\u{1F500}' },
];

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
    control,
    watch,
    setValue,
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
          purpose: trip.purpose || 'leisure',
          activities: trip.activities || [],
          accommodation: trip.accommodation,
        }
      : {
          currency: 'USD',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          purpose: 'leisure',
          activities: [],
        },
  });

  const selectedActivities = watch('activities') || [];
  const selectedPurpose = watch('purpose');
  const selectedAccommodation = watch('accommodation');

  const toggleActivity = (activity: TripActivity) => {
    const current = selectedActivities;
    if (current.includes(activity)) {
      setValue('activities', current.filter((a) => a !== activity));
    } else {
      setValue('activities', [...current, activity]);
    }
  };

  const onSubmit = async (data: TripFormData) => {
    setIsSubmitting(true);
    try {
      const tripData = {
        name: data.name,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: Number(data.budget),
        currency: data.currency,
        notes: data.notes,
        purpose: data.purpose,
        activities: data.activities?.length ? data.activities : undefined,
        accommodation: data.accommodation,
      };

      if (trip) {
        await updateTrip(trip.id, tripData);
        toastSuccess({ title: 'Success', description: 'Trip updated successfully!' });
      } else {
        await addTrip(tripData);
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
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
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

          {/* Packing List Context - helps generate smart packing lists */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Packing List Context
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (helps generate smart packing lists)
              </span>
            </div>

            {/* Trip Purpose */}
            <div className="mb-4">
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                Trip Purpose
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PURPOSE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('purpose', option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all',
                      selectedPurpose === option.value
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {option.icon}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div className="mb-4">
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                Planned Activities
              </Label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleActivity(option.value)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-all',
                      selectedActivities.includes(option.value)
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <span>{option.emoji}</span>
                    <span>{option.label}</span>
                    {selectedActivities.includes(option.value) && (
                      <Check className="w-3 h-3 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Accommodation */}
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                Accommodation Type
              </Label>
              <div className="flex flex-wrap gap-2">
                {ACCOMMODATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('accommodation', selectedAccommodation === option.value ? undefined : option.value)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-all',
                      selectedAccommodation === option.value
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <span>{option.emoji}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
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
