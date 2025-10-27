"use client";

import { LucideIcon, ArrowLeft, ReactNode } from "lucide-react";
import { useRouter } from "next/navigation";

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
  emoji?: string;
  icon?: LucideIcon;
  stats?: Stat[];
  action?: Action;
  actionElement?: ReactNode;
  subtitle?: string;
  showBackButton?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  borderColor?: string;
  textGradient?: string;
  backButtonColor?: string;
}

export function ToolHeader({
  title,
  emoji,
  icon: Icon,
  stats,
  action,
  actionElement,
  subtitle,
  showBackButton = false,
  gradientFrom = "from-white to-gray-50",
  gradientTo = "to-gray-50",
  borderColor = "border-gray-200",
  textGradient = "from-gray-900 to-gray-700",
  backButtonColor = "gray"
}: ToolHeaderProps) {
  const router = useRouter();

  const getBackButtonColorClasses = () => {
    const colors = {
      gray: "border-gray-300 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300",
      purple: "border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300",
      blue: "border-blue-300 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-500 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300",
      green: "border-green-300 dark:border-green-700 hover:border-green-500 dark:hover:border-green-500 text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300",
      pink: "border-pink-300 dark:border-pink-700 hover:border-pink-500 dark:hover:border-pink-500 text-pink-600 dark:text-pink-400 group-hover:text-pink-700 dark:group-hover:text-pink-300",
      orange: "border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300",
      yellow: "border-yellow-300 dark:border-yellow-700 hover:border-yellow-500 dark:hover:border-yellow-500 text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-700 dark:group-hover:text-yellow-300",
      indigo: "border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 dark:hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300",
    };
    return colors[backButtonColor as keyof typeof colors] || colors.gray;
  };

  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} dark:from-gray-900 dark:to-gray-800 border-4 ${borderColor} dark:border-gray-800 shadow-xl p-6`}>
      <div className="flex items-start gap-3">
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={() => router.back()}
            className={`group flex items-center justify-center p-2 rounded-xl bg-white dark:bg-gray-800 border-2 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg shrink-0 ${getBackButtonColorClasses()}`}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 transition-colors" />
          </button>
        )}

        {/* Title and Content */}
        <div className="flex-1 min-w-0">
          <h1 className={`text-2xl font-bold bg-gradient-to-r ${textGradient} dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent flex items-center gap-2`}>
            {Icon && <Icon className="h-6 w-6" style={{ color: 'inherit' }} />}
            {emoji} {title}
          </h1>

          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          )}

          {stats && stats.length > 0 && (
            <div className="flex items-center gap-3 mt-2 text-sm font-medium flex-wrap">
              {stats.map((stat, index) => (
                <span key={index} className={`px-3 py-1 rounded-full ${getStatBadgeColor(stat.variant)}`}>
                  {stat.value} {stat.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Button or Element */}
        {actionElement ? (
          actionElement
        ) : action ? (
          <button
            onClick={action.onClick}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 shrink-0"
          >
            {action.icon && <action.icon className="h-5 w-5" />}
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getStatBadgeColor(variant?: 'default' | 'success' | 'warning' | 'info'): string {
  switch (variant) {
    case 'success':
      return 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300';
    case 'warning':
      return 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300';
    case 'info':
      return 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';
    default:
      return 'bg-gray-100 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300';
  }
}
