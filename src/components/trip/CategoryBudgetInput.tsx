'use client';

import { ExpenseCategory } from '@/store/useTrips';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plane,
  Home,
  Utensils,
  Car,
  ShoppingBag,
  PartyPopper,
  Gift,
  MoreHorizontal
} from 'lucide-react';

interface CategoryBudgetInputProps {
  category: ExpenseCategory;
  value: number;
  onChange: (category: ExpenseCategory, value: number) => void;
  currency?: string;
}

const categoryIcons: Record<ExpenseCategory, React.ReactNode> = {
  'air-ticket': <Plane className="w-5 h-5" />,
  accommodation: <Home className="w-5 h-5" />,
  food: <Utensils className="w-5 h-5" />,
  transport: <Car className="w-5 h-5" />,
  shopping: <ShoppingBag className="w-5 h-5" />,
  entertainment: <PartyPopper className="w-5 h-5" />,
  gift: <Gift className="w-5 h-5" />,
  other: <MoreHorizontal className="w-5 h-5" />,
};

const categoryLabels: Record<ExpenseCategory, string> = {
  'air-ticket': 'Air Ticket',
  accommodation: 'Accommodation',
  food: 'Food',
  transport: 'Transport',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  gift: 'Gift',
  other: 'Other',
};

const categoryColors: Record<ExpenseCategory, string> = {
  'air-ticket': 'text-blue-600 dark:text-blue-400',
  accommodation: 'text-purple-600 dark:text-purple-400',
  food: 'text-orange-600 dark:text-orange-400',
  transport: 'text-green-600 dark:text-green-400',
  shopping: 'text-pink-600 dark:text-pink-400',
  entertainment: 'text-yellow-600 dark:text-yellow-400',
  gift: 'text-red-600 dark:text-red-400',
  other: 'text-gray-600 dark:text-gray-400',
};

export function CategoryBudgetInput({
  category,
  value,
  onChange,
  currency = 'USD',
}: CategoryBudgetInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`budget-${category}`} className="flex items-center gap-2">
        <span className={categoryColors[category]}>{categoryIcons[category]}</span>
        <span>{categoryLabels[category]}</span>
      </Label>
      <div className="relative">
        <Input
          id={`budget-${category}`}
          type="number"
          step="0.01"
          min="0"
          value={value || ''}
          onChange={(e) => onChange(category, parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          className="pl-12"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
          {currency}
        </span>
      </div>
    </div>
  );
}
