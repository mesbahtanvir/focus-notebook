"use client";

import { ReactNode, useEffect, useState } from "react";
import { Search, Filter, ChevronDown, X } from "lucide-react";
import { motion } from "framer-motion";
import { ToolTheme } from "./themes";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { DEFAULT_DISPLAY_CURRENCY, SUPPORTED_CURRENCIES, SupportedCurrency } from "@/lib/utils/currency";
import { useCurrency } from "@/store/useCurrency";

interface SearchAndFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  totalCount?: number;
  filteredCount?: number;
  showFilterToggle?: boolean;
  filterContent?: ReactNode;
  additionalControls?: ReactNode;
  className?: string;
  theme?: ToolTheme;
  showCurrencySelector?: boolean;
  currencyValue?: SupportedCurrency;
  onCurrencyChange?: (value: SupportedCurrency) => void;
}

export function SearchAndFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  totalCount,
  filteredCount,
  showFilterToggle = false,
  filterContent,
  additionalControls,
  className = "",
  theme,
  showCurrencySelector = false,
  currencyValue,
  onCurrencyChange,
}: SearchAndFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const { currency: storedCurrency, setCurrency } = useCurrency();
  const [internalCurrency, setInternalCurrency] = useState<SupportedCurrency>(currencyValue || storedCurrency || DEFAULT_DISPLAY_CURRENCY);

  const selectedCurrency = currencyValue || internalCurrency;

  const handleCurrencyChange = (value: SupportedCurrency) => {
    setInternalCurrency(value);
    onCurrencyChange?.(value);
    if (!onCurrencyChange) {
      setCurrency(value);
    }
  };

  useEffect(() => {
    if (!currencyValue && storedCurrency) {
      setInternalCurrency(storedCurrency);
    }
  }, [currencyValue, storedCurrency]);

  const searchFocus = theme?.searchFocus || 'ring-blue-500';
  const borderAccent = theme?.searchBorder || 'border-blue-200 dark:border-blue-800';
  const subtleBg = theme?.searchBg ? `bg-gradient-to-br ${theme.searchBg}` : 'bg-white dark:bg-gray-900';

  return (
    <div
      className={`
        rounded-2xl border ${borderAccent} ${subtleBg}
        shadow-sm p-4 sm:p-5 space-y-3 ${className}
      `}
    >
      {/* Primary Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/70 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:${searchFocus} focus:border-transparent transition-all`}
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showCurrencySelector && (
            <div className="flex items-center gap-2">
              <Label
                htmlFor="currency-selector"
                className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Currency
              </Label>
              <Select
                id="currency-selector"
                value={selectedCurrency}
                onChange={(event) => handleCurrencyChange(event.target.value as SupportedCurrency)}
                className="h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                {SUPPORTED_CURRENCIES.map(code => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}

          {totalCount !== undefined && (
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
              {filteredCount !== undefined
                ? `Showing ${filteredCount}/${totalCount}`
                : `${totalCount} total`}
            </div>
          )}

          {showFilterToggle && filterContent && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-purple-400 dark:hover:border-purple-500 transition"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      {showFilters && filterContent && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pt-3 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filterContent}
          </div>
        </motion.div>
      )}

      {/* Additional Controls (Sort, View Toggle, etc.) */}
      {additionalControls && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          {additionalControls}
        </div>
      )}
    </div>
  );
}
