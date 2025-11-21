'use client';

import { useState } from 'react';
import { Search, Filter, SortAsc, X, Globe2 } from 'lucide-react';
import { useVisaFinder, type FilterType, type SortType } from '@/store/useVisaFinder';
import DestinationCard from './DestinationCard';
import { getAllRegions } from '@/data/countries';

export default function DestinationList() {
  const {
    destinations,
    filterType,
    sortType,
    searchQuery,
    selectedRegion,
    setFilterType,
    setSortType,
    setSearchQuery,
    setSelectedRegion,
    getFilteredDestinations,
    getStatistics,
  } = useVisaFinder();

  const [showFilters, setShowFilters] = useState(false);

  const filteredDestinations = getFilteredDestinations();
  const stats = getStatistics();
  const regions = getAllRegions();

  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {filteredDestinations.length} Destinations Available
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {stats.visaFree} visa-free • {stats.eVisa} e-visa • {stats.visaOnArrival} visa on arrival
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Destinations
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by country name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Visa Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Visa Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Types</option>
                <option value="visa-free">Visa-Free Only</option>
                <option value="e-visa">E-Visa Only</option>
                <option value="visa-on-arrival">Visa on Arrival Only</option>
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <select
                value={selectedRegion || ''}
                onChange={(e) => setSelectedRegion(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Regions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="alphabetical">Alphabetical</option>
                <option value="region">Region</option>
                <option value="visa-type">Visa Type</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filterType !== 'all' || selectedRegion || searchQuery) && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Active filters:</span>
              {filterType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded text-xs">
                  {filterType.replace('-', ' ')}
                  <button onClick={() => setFilterType('all')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedRegion && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded text-xs">
                  {selectedRegion}
                  <button onClick={() => setSelectedRegion(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded text-xs">
                  &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Destination Grid */}
      {filteredDestinations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDestinations.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No destinations found
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your filters or search query
          </p>
          <button
            onClick={() => {
              setFilterType('all');
              setSelectedRegion(null);
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
