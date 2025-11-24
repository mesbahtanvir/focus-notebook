"use client";

import { TokenUsageDashboard } from '@/components/TokenUsageDashboard';
import { SettingsLayout } from '@/components/settings/SettingsLayout';

export default function SettingsPage() {

  return (
    <SettingsLayout
      title="General"
      description="Manage your app preferences and subscription"
    >
      <div className="space-y-8">
        {/* Token Usage Section */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Token Usage
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor your AI token consumption and limits
            </p>
          </div>
          <TokenUsageDashboard />
        </section>
      </div>
    </SettingsLayout>
  );
}
