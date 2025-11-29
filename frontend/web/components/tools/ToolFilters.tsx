"use client";

import { ReactNode } from "react";

interface ToolFiltersProps {
  children: ReactNode;
  className?: string;
}

export function ToolFilters({ children, className = "" }: ToolFiltersProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

// Filter control components
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FilterSelect({ value, onChange, options, placeholder }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input py-2 text-sm min-w-[140px]"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function FilterButton({ active, onClick, children }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

interface FilterToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterToggle({ label, active, onClick }: FilterToggleProps) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
    >
      {label}
    </button>
  );
}
