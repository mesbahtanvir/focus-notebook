"use client";

import { LucideIcon } from "lucide-react";

interface Stat {
  label: string;
  value: number | string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

interface Action {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

interface ToolHeaderProps {
  title: string;
  stats?: Stat[];
  action?: Action;
  subtitle?: string;
}

export function ToolHeader({ title, stats, action, subtitle }: ToolHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-sm">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
        
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
            {stats.map((stat, index) => (
              <span key={index} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-gray-300 dark:text-gray-600">•</span>}
                <span className={getStatColor(stat.variant)}>
                  {stat.value} {stat.label}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}

function getStatColor(variant?: 'default' | 'success' | 'warning' | 'info'): string {
  switch (variant) {
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'warning':
      return 'text-red-600 dark:text-red-400';
    case 'info':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
}
