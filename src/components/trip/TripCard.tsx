'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Trip, useTrips } from '@/store/useTrips';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TripCardProps {
  trip: Trip;
  index: number;
}

export function TripCard({ trip, index }: TripCardProps) {
  const router = useRouter();
  const { getTotalSpent, getBudgetRemaining } = useTrips();

  const totalSpent = getTotalSpent(trip.id);
  const remaining = getBudgetRemaining(trip.id);
  const budgetPercent = trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0;
  const isOverBudget = budgetPercent > 100;

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'upcoming':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'in-progress':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'completed':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-teal-500"
        onClick={() => router.push(`/tools/trips/${trip.id}`)}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{trip.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <MapPin className="w-4 h-4" />
              <span>{trip.destination}</span>
            </div>
          </div>
          <Badge className={getStatusColor(trip.status)}>{trip.status}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Calendar className="w-4 h-4" />
          <span>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget</p>
            <p className="text-xl font-semibold">{formatCurrency(trip.budget, trip.currency)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Spent</p>
            <p className={`text-xl font-bold ${isOverBudget ? 'text-red-600' : 'text-teal-600'}`}>
              {formatCurrency(totalSpent, trip.currency)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Budget usage</span>
              <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>
                {budgetPercent.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isOverBudget ? 'bg-red-500' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium">Remaining</span>
            </div>
            <p className={`font-bold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(remaining, trip.currency)}
            </p>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>{trip.expenses.length} Expense{trip.expenses.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
