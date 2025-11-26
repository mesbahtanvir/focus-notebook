'use client';

import { ArrowRight, Clock, Shield } from 'lucide-react';
import type { DestinationAccess, VisaType } from '@/types/visa';
import { useRouter } from 'next/navigation';

interface DestinationCardProps {
  destination: DestinationAccess;
}

const visaTypeBadgeConfig: Record<VisaType, { bg: string; text: string; icon: string }> = {
  'visa-free': {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    icon: '✓',
  },
  'e-visa': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    icon: '📧',
  },
  'visa-on-arrival': {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    icon: '✈️',
  },
  'visa-required': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    icon: '📋',
  },
};

export default function DestinationCard({ destination }: DestinationCardProps) {
  const router = useRouter();
  const badgeConfig = visaTypeBadgeConfig[destination.visaType];

  const handlePlanTrip = () => {
    // Navigate to trips page with pre-filled destination
    router.push(`/tools/trips?destination=${encodeURIComponent(destination.destinationCountry.name)}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600 transition-all hover:shadow-md group">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{destination.destinationCountry.flag}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {destination.destinationCountry.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{destination.region}</p>
            </div>
          </div>
        </div>

        {/* Visa Info */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badgeConfig.bg} ${badgeConfig.text}`}>
            <span>{badgeConfig.icon}</span>
            <span className="capitalize">{destination.visaType.replace('-', ' ')}</span>
          </span>
          {destination.duration && destination.duration !== 'N/A' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Clock className="w-3 h-3" />
              <span>{destination.duration}</span>
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          {destination.description}
        </p>

        {/* Requirements (if any) */}
        {destination.requirements && destination.requirements.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-2">
              <Shield className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Requirements:</p>
            </div>
            <ul className="space-y-1">
              {destination.requirements.slice(0, 3).map((req, index) => (
                <li key={index} className="text-xs text-gray-600 dark:text-gray-400 pl-4 relative before:content-['•'] before:absolute before:left-0">
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handlePlanTrip}
          className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-medium hover:from-teal-700 hover:to-teal-800 flex items-center justify-center gap-2 transition-all group-hover:shadow-md"
        >
          <span>Plan Trip</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
