'use client';

import { useEffect } from 'react';
import { ArrowLeft, Plane } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import VisaFinderForm from '@/components/visa-finder/VisaFinderForm';
import VisaAccessMap from '@/components/visa-finder/VisaAccessMap';
import DestinationList from '@/components/visa-finder/DestinationList';
import { useVisaFinder } from '@/store/useVisaFinder';

export default function VisaFinderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { destinations, error, isLoading } = useVisaFinder();

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button
            onClick={() => router.push('/tools/travel')}
            className="flex items-center gap-2 text-teal-100 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Travel</span>
          </button>

          {/* Title */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Plane className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Visa Destination Finder
              </h1>
              <p className="text-teal-100 text-lg">
                Discover where you can travel visa-free or with easy visa access
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <p className="text-sm text-teal-50">
              Select your nationality and any additional visas you hold to see a comprehensive list
              of destinations you can visit. Our tool shows visa requirements, duration of stay,
              and key highlights for each country.
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search Form */}
          <VisaFinderForm />

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mt-0.5">
                  <span className="text-red-600 dark:text-red-400 text-sm">!</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    Unable to load visa data
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Searching destinations...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  We&apos;re finding all the places you can visit
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {!isLoading && destinations.length > 0 && (
            <>
              {/* Map */}
              <VisaAccessMap />

              {/* Destination List */}
              <DestinationList />
            </>
          )}

          {/* Empty State - Initial */}
          {!isLoading && destinations.length === 0 && !error && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-4">
                  <Plane className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Ready to explore the world?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
                  Select your nationality above to discover all the amazing destinations you can visit.
                  We&apos;ll show you visa requirements, travel tips, and more for each country.
                </p>
                <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Visa-free access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>E-visa available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>Visa on arrival</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
