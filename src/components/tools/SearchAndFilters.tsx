"use client";

import { ReactNode, useState } from "react";
import { Search, Filter, ChevronDown, X } from "lucide-react";
import { motion } from "framer-motion";
import { ToolTheme } from "./themes";

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
  theme
}: SearchAndFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Use theme if provided, otherwise use default blue theme
  const searchBg = theme?.searchBg || 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20';
  const searchBorder = theme?.searchBorder || 'border-blue-200 dark:border-blue-800';
  const searchFocus = theme?.searchFocus || 'ring-blue-500';

  return (
    <div className={`rounded-xl bg-gradient-to-br ${searchBg} border-4 ${searchBorder} shadow-xl p-6 space-y-4 mx-4 md:mx-0 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:${searchFocus} focus:border-transparent transition-all`}
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      {(showFilterToggle || totalCount !== undefined) && (
        <div className="flex items-center justify-between">
          {showFilterToggle && filterContent && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          )}
          {totalCount !== undefined && (
            <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {filteredCount !== undefined
                ? `Showing ${filteredCount} of ${totalCount}`
                : `${totalCount} total`}
            </div>
          )}
        </div>
      )}

      {/* Filter Options */}
      {showFilters && filterContent && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`pt-4 border-t ${searchBorder}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {filterContent}
          </div>
        </motion.div>
      )}

      {/* Additional Controls (Sort, View Toggle, etc.) */}
      {additionalControls && (
        <div className={`pt-4 border-t ${searchBorder}`}>
          {additionalControls}
        </div>
      )}
    </div>
  );
}
