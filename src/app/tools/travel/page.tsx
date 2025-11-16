"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/store/useTrips";
import { ToolHeader, ToolPageLayout, ToolGroupNav } from "@/components/tools";
import { toolThemes } from "@/components/tools/themes";
import { Plane, MapPin, Calendar, ArrowRight, Zap, PackageCheck, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function TravelHubPage() {
  const { user } = useAuth();
  const trips = useTrips((s) => s.trips);
  const { subscribe } = useTrips();

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = trips.filter((t) => {
      const startDate = new Date(t.startDate);
      return t.status === 'planning' || (t.status === 'in-progress' && startDate > now);
    });

    const active = trips.filter((t) => t.status === 'in-progress');
    const completed = trips.filter((t) => t.status === 'completed');
    const totalBudget = trips.reduce((sum, trip) => sum + trip.budget, 0);

    // Find next upcoming trip
    const nextTrip = trips
      .filter((t) => new Date(t.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    return {
      upcoming: upcoming.length,
      active: active.length,
      completed: completed.length,
      totalBudget,
      nextTrip,
      totalTrips: trips.length
    };
  }, [trips]);

  const recentTrips = useMemo(() => {
    return trips
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [trips]);

  const theme = toolThemes.teal;

  return (
    <ToolPageLayout>
      <ToolHeader
        title="Travel"
        emoji="✈️"
        showBackButton
        stats={[
          { label: "upcoming", value: stats.upcoming, variant: "info" },
          { label: "active", value: stats.active, variant: "success" },
          { label: "total trips", value: stats.totalTrips, variant: "default" },
        ]}
        theme={theme}
      />

      <ToolGroupNav currentToolId="travel" />

      {/* Quick Actions */}
      <div className="card p-3 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          <Link
            href="/tools/trips?filter=upcoming"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-600 transition-all"
          >
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-teal-500" />
            <div>
              <div className="font-semibold text-sm sm:text-base">Upcoming Trip</div>
              <div className="text-xs text-gray-500">View upcoming travels</div>
            </div>
          </Link>

          <Link
            href="/tools/trips?filter=in-progress"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-all"
          >
            <Plane className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            <div>
              <div className="font-semibold text-sm sm:text-base">Active Trips</div>
              <div className="text-xs text-gray-500">Currently traveling</div>
            </div>
          </Link>

          <Link
            href="/tools/trips?filter=completed"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all"
          >
            <PackageCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <div>
              <div className="font-semibold text-sm sm:text-base">Completed Trip</div>
              <div className="text-xs text-gray-500">Past adventures</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Next Trip */}
      {stats.nextTrip && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-500" />
            Next Trip
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.nextTrip.name}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4" />
                {stats.nextTrip.destination}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                {new Date(stats.nextTrip.startDate).toLocaleDateString()}
              </div>
            </div>
            <Link
              href={`/tools/trips/${stats.nextTrip.id}`}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold hover:shadow-lg transition-all"
            >
              View Details
            </Link>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* All Trips */}
        <Link href="/tools/trips" className="card p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Plane className="h-5 w-5 text-teal-500" />
              All Trips
            </h3>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTrips}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your travel plans and itineraries
            </p>
          </div>
        </Link>

        {/* Visa Finder */}
        <Link href="/tools/travel/visa-finder" className="card p-6 hover:shadow-lg transition-all bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-2 border-teal-200 dark:border-teal-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Visa Finder
            </h3>
            <ArrowRight className="h-5 w-5 text-teal-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Discover visa-free destinations based on your passport
          </p>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            New Feature
          </div>
        </Link>

        {/* Packing Lists */}
        <Link href="/tools/packing-list" className="card p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-cyan-500" />
              Packing Lists
            </h3>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Smart packing lists based on destination and duration
          </p>
        </Link>
      </div>

      {/* Travel Statistics */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Travel Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{stats.upcoming}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Upcoming</div>
          </div>
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">In Progress</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completed}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completed</div>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${stats.totalBudget.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Budget</div>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      {recentTrips.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">✈️ Recent & Upcoming Trips</h3>
            <Link href="/tools/trips" className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentTrips.map((trip) => (
              <Link
                key={trip.id}
                href={`/tools/trips/${trip.id}`}
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">{trip.name}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {trip.destination}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    trip.status === 'planning' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                    trip.status === 'in-progress' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  }`}>
                    {trip.status.replace('-', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}
