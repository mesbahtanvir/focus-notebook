"use client";

import { ReactNode } from "react";
import { ToolTheme } from "./themes";
import { Info } from "lucide-react";

interface ToolInfoSectionProps {
  title: string;
  content: string | ReactNode;
  icon?: ReactNode;
  theme?: ToolTheme;
  className?: string;
}

export function ToolInfoSection({
  title,
  content,
  icon,
  theme,
  className = "",
}: ToolInfoSectionProps) {
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
    <div className={`px-4 py-6 my-6 ${className}`}>
      <div
        className={`rounded-xl bg-gradient-to-br ${selectedTheme.infoBg} dark:from-gray-900/50 dark:to-gray-800/50 border-2 ${selectedTheme.infoBorder} dark:border-gray-700 shadow-md p-6`}
      >
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
              {icon}
            </div>
          )}
          {!icon && (
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0">
              <Info className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {typeof content === 'string' ? (
                <p className="leading-relaxed">{content}</p>
              ) : (
                content
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

