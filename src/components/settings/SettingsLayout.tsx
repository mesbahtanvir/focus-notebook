"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Settings,
  Database,
  Sparkles,
  Shield,
  Bell,
  Palette,
  Crown,
  ChevronRight,
} from 'lucide-react';

interface SettingsSection {
  id: string;
  label: string;
  icon: typeof Settings;
  href: string;
  badge?: string;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    href: '/settings',
  },
  {
    id: 'data',
    label: 'Data Management',
    icon: Database,
    href: '/settings/data-management',
  },
];

interface SettingsLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function SettingsLayout({ children, title, description }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <nav className="sticky top-6 space-y-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-2">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = pathname === section.href;

                return (
                  <Link
                    key={section.id}
                    href={section.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all',
                      isActive
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className={cn(
                      'h-5 w-5',
                      isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
                    )} />
                    <span className="flex-1">{section.label}</span>
                    {section.badge && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">
                        {section.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              {/* Content Header */}
              <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
                {description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                  </p>
                )}
              </div>

              {/* Content Body */}
              <div className="p-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
