"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ToolTheme } from "./themes";

// Simple List Entry - Basic horizontal layout
interface SimpleListEntryProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function SimpleListEntry({
  icon,
  title,
  subtitle,
  badge,
  onClick,
  className = "",
}: SimpleListEntryProps) {
  const Component = onClick ? motion.div : 'div';
  const props = onClick
    ? {
        onClick,
        initial: { opacity: 0, x: -10 },
        animate: { opacity: 1, x: 0 },
        className: `${className} cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors`,
      }
    : { className };

  return (
    <Component {...props}>
      <div className="flex items-center gap-3 p-3 rounded-lg">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>
    </Component>
  );
}

// Detailed Card Entry - Full featured card layout
interface DetailedCardEntryProps {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  description?: string;
  metadata?: Array<{ label?: string; value: string; variant?: 'default' | 'info' | 'success' | 'warning' }>;
  actions?: Array<{ label?: string; icon: LucideIcon; onClick: () => void; className?: string }>;
  onClick?: () => void;
  theme?: ToolTheme;
  className?: string;
}

export function DetailedCardEntry({
  icon,
  iconBg,
  title,
  description,
  metadata,
  actions,
  onClick,
  theme,
  className = "",
}: DetailedCardEntryProps) {
  const defaultTheme: ToolTheme = {
    name: 'default',
    headerBg: 'from-gray-50 to-gray-100',
    headerBorder: 'border-gray-200',
    headerText: 'from-gray-900 to-gray-700',
    backButtonColor: 'gray',
    searchBg: 'from-blue-50 to-cyan-50',
    searchBorder: 'border-blue-200',
    searchFocus: 'ring-gray-500',
    statPrimary: 'bg-blue-100 text-blue-700',
    statSecondary: 'bg-gray-100 text-gray-700',
    statSuccess: 'bg-green-100 text-green-700',
    statWarning: 'bg-orange-100 text-orange-700',
    fabGradient: 'from-gray-500 to-gray-600',
    infoBg: 'from-gray-50 to-gray-100',
    infoBorder: 'border-gray-200',
  };

  const selectedTheme = theme || defaultTheme;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${iconBg || 'bg-gradient-to-br from-purple-500 to-pink-500'}`}
            >
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {description}
              </p>
            )}
            {metadata && metadata.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {metadata.map((meta, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      meta.variant === 'info'
                        ? selectedTheme.statPrimary
                        : meta.variant === 'success'
                        ? selectedTheme.statSuccess
                        : meta.variant === 'warning'
                        ? selectedTheme.statWarning
                        : selectedTheme.statSecondary
                    }`}
                  >
                    {meta.label && <span className="font-semibold">{meta.label}: </span>}
                    {meta.value}
                  </span>
                ))}
              </div>
            )}
          </div>
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${action.className || ''}`}
                  title={action.label}
                >
                  <action.icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Compact Grid Entry - For grid layouts
interface CompactGridEntryProps {
  icon?: ReactNode;
  title: string;
  stats?: Array<{ label: string; value: string | number }>;
  onClick?: () => void;
  theme?: ToolTheme;
  className?: string;
}

export function CompactGridEntry({
  icon,
  title,
  stats,
  onClick,
  theme,
  className = "",
}: CompactGridEntryProps) {
  const defaultTheme: ToolTheme = {
    name: 'default',
    headerBg: 'from-gray-50 to-gray-100',
    headerBorder: 'border-gray-200',
    headerText: 'from-gray-900 to-gray-700',
    backButtonColor: 'gray',
    searchBg: 'from-blue-50 to-cyan-50',
    searchBorder: 'border-blue-200',
    searchFocus: 'ring-gray-500',
    statPrimary: 'bg-blue-100 text-blue-700',
    statSecondary: 'bg-gray-100 text-gray-700',
    statSuccess: 'bg-green-100 text-green-700',
    statWarning: 'bg-orange-100 text-orange-700',
    fabGradient: 'from-gray-500 to-gray-600',
    infoBg: 'from-gray-50 to-gray-100',
    infoBorder: 'border-gray-200',
  };

  const selectedTheme = theme || defaultTheme;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all p-4 ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex-1 min-w-0 truncate">
          {title}
        </h3>
      </div>
      {stats && stats.length > 0 && (
        <div className="space-y-1">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">{stat.label}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

