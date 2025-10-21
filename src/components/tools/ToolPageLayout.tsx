"use client";

import { ReactNode } from "react";

interface ToolPageLayoutProps {
  children: ReactNode;
  maxWidth?: 'default' | 'wide' | 'full';
}

export function ToolPageLayout({ children, maxWidth = 'default' }: ToolPageLayoutProps) {
  const widthClass = {
    default: 'max-w-7xl',
    wide: 'max-w-[1400px]',
    full: 'max-w-full'
  }[maxWidth];

  return (
    <div className={`space-y-4 ${widthClass} mx-auto p-4 md:p-6`}>
      {children}
    </div>
  );
}

interface ToolContentProps {
  children: ReactNode;
  className?: string;
}

export function ToolContent({ children, className = "" }: ToolContentProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
}

interface ToolCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ToolCard({ children, onClick, className = "" }: ToolCardProps) {
  const baseClass = "p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-200";
  const interactiveClass = onClick
    ? "hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
    : "";

  return (
    <div
      onClick={onClick}
      className={`${baseClass} ${interactiveClass} ${className}`}
    >
      {children}
    </div>
  );
}

interface ToolGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function ToolGrid({ children, columns = 3, className = "" }: ToolGridProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-2 ${className}`}>
      {children}
    </div>
  );
}

interface ToolListProps {
  children: ReactNode;
  className?: string;
}

export function ToolList({ children, className = "" }: ToolListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-inner">
      {icon && <div className="flex justify-center mb-4 text-gray-400 dark:text-gray-600">{icon}</div>}
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
