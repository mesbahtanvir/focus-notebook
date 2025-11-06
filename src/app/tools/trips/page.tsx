'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrips } from '@/store/useTrips';
import { TripCard } from '@/components/trip/TripCard';
import { TripFormModal } from '@/components/trip/TripFormModal';
import { ToolHeader, SearchAndFilters, ToolGroupNav } from '@/components/tools';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { toolThemes } from '@/components/tools/themes';
import { useToast } from '@/hooks/use-toast';

export default function TripsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { trips, isLoading, subscribe, deleteTrip } = useTrips();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'planning' | 'in-progress' | 'completed'>('all');

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTrips = trips.filter((t) => t.status === 'in-progress');
  const totalBudget = trips.reduce((sum, trip) => sum + trip.budget, 0);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this trip?')) {
      try {
        await deleteTrip(id);
        toast({ title: 'Success', description: 'Trip deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete trip', variant: 'destructive' });
      }
    }
  };

  const theme = toolThemes.teal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <ToolHeader
          title="Trip & Expense Tracker"
          emoji="✈️"
          showBackButton
          stats={[
            {
              label: 'Active Trips',
              value: activeTrips.length.toString(),
              variant: 'default',
            },
            {
              label: 'Total Trips',
              value: trips.length.toString(),
              variant: 'info',
            },
          ]}
          theme={theme}
        />

        <SearchAndFilters
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search trips..."
          totalCount={trips.length}
          filteredCount={filteredTrips.length}
          showFilterToggle={true}
          filterContent={
            <div className="flex gap-2 flex-wrap">
              {['all', 'planning', 'in-progress', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          }
          theme={theme}
        />

        {/* Tool Group Navigation */}
        <ToolGroupNav currentToolId="trips" />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start planning your next adventure
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip, index) => (
              <TripCard key={trip.id} trip={trip} index={index} />
            ))}
          </div>
        )}

        <FloatingActionButton onClick={() => setIsFormOpen(true)} title="Add" />

        <TripFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
      </div>
    </div>
  );
}
