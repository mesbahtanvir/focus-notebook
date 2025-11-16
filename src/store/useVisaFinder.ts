import { create } from 'zustand';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import type {
  AdditionalVisa,
  VisaRequirement,
  DestinationAccess,
  VisaFinderQuery,
  VisaType,
} from '@/types/visa';
import { COUNTRIES, getCountryByCode } from '@/data/countries';

export type FilterType = 'all' | 'visa-free' | 'e-visa' | 'visa-on-arrival';
export type SortType = 'alphabetical' | 'region' | 'visa-type';

interface VisaFinderState {
  // User input
  nationality: string | null;
  additionalVisas: AdditionalVisa[];

  // Results
  destinations: DestinationAccess[];
  isLoading: boolean;
  error: string | null;

  // UI state
  filterType: FilterType;
  sortType: SortType;
  searchQuery: string;
  selectedRegion: string | null;

  // Actions - Input
  setNationality: (nationality: string) => void;
  addAdditionalVisa: (visa: Omit<AdditionalVisa, 'id'>) => void;
  removeAdditionalVisa: (id: string) => void;
  clearAdditionalVisas: () => void;

  // Actions - Search
  searchDestinations: () => Promise<void>;
  clearResults: () => void;

  // Actions - Filters
  setFilterType: (filter: FilterType) => void;
  setSortType: (sort: SortType) => void;
  setSearchQuery: (query: string) => void;
  setSelectedRegion: (region: string | null) => void;

  // Getters
  getFilteredDestinations: () => DestinationAccess[];
  getDestinationsByVisaType: (type: VisaType) => DestinationAccess[];
  getDestinationsByRegion: (region: string) => DestinationAccess[];
  getStatistics: () => {
    total: number;
    visaFree: number;
    eVisa: number;
    visaOnArrival: number;
    visaRequired: number;
  };
}

export const useVisaFinder = create<VisaFinderState>((set, get) => ({
  // Initial state
  nationality: null,
  additionalVisas: [],
  destinations: [],
  isLoading: false,
  error: null,
  filterType: 'all',
  sortType: 'alphabetical',
  searchQuery: '',
  selectedRegion: null,

  // Input actions
  setNationality: (nationality: string) => {
    set({ nationality, destinations: [], error: null });
  },

  addAdditionalVisa: (visa: Omit<AdditionalVisa, 'id'>) => {
    const id = `${visa.country}_${Date.now()}`;
    const newVisa: AdditionalVisa = { ...visa, id };
    set((state) => ({
      additionalVisas: [...state.additionalVisas, newVisa],
    }));
  },

  removeAdditionalVisa: (id: string) => {
    set((state) => ({
      additionalVisas: state.additionalVisas.filter((v) => v.id !== id),
    }));
  },

  clearAdditionalVisas: () => {
    set({ additionalVisas: [] });
  },

  // Search action
  searchDestinations: async () => {
    const { nationality, additionalVisas } = get();

    if (!nationality) {
      set({ error: 'Please select a nationality', destinations: [] });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Query Firestore for visa requirements
      const requirementsRef = collection(db, 'visa_requirements');
      const q = query(
        requirementsRef,
        where('sourceCountry.code', '==', nationality)
      );

      const snapshot = await getDocs(q);
      const baseDestinations: DestinationAccess[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as VisaRequirement;
        baseDestinations.push({
          ...data,
          accessSource: 'nationality',
        });
      });

      // TODO: In the future, also check additional visas for enhanced access
      // For now, we'll just use the nationality-based access

      // If no data found, this might be a new passport or data not yet generated
      if (baseDestinations.length === 0) {
        // Optionally trigger cloud function to generate data
        set({
          destinations: [],
          isLoading: false,
          error: 'No visa data found for this nationality. Data may still be processing.',
        });
        return;
      }

      set({
        destinations: baseDestinations,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching visa requirements:', error);
      set({
        error: 'Failed to fetch visa requirements. Please try again.',
        isLoading: false,
        destinations: [],
      });
    }
  },

  clearResults: () => {
    set({
      destinations: [],
      error: null,
      filterType: 'all',
      sortType: 'alphabetical',
      searchQuery: '',
      selectedRegion: null,
    });
  },

  // Filter actions
  setFilterType: (filter: FilterType) => {
    set({ filterType: filter });
  },

  setSortType: (sort: SortType) => {
    set({ sortType: sort });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedRegion: (region: string | null) => {
    set({ selectedRegion: region });
  },

  // Getters
  getFilteredDestinations: () => {
    const { destinations, filterType, sortType, searchQuery, selectedRegion } = get();

    let filtered = [...destinations];

    // Apply visa type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((d) => d.visaType === filterType);
    }

    // Apply region filter
    if (selectedRegion) {
      filtered = filtered.filter((d) => d.region === selectedRegion);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.destinationCountry.name.toLowerCase().includes(query) ||
          d.destinationCountry.code.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortType) {
        case 'alphabetical':
          return a.destinationCountry.name.localeCompare(b.destinationCountry.name);
        case 'region':
          if (a.region === b.region) {
            return a.destinationCountry.name.localeCompare(b.destinationCountry.name);
          }
          return a.region.localeCompare(b.region);
        case 'visa-type':
          const visaOrder = { 'visa-free': 0, 'e-visa': 1, 'visa-on-arrival': 2, 'visa-required': 3 };
          const aOrder = visaOrder[a.visaType] || 999;
          const bOrder = visaOrder[b.visaType] || 999;
          if (aOrder === bOrder) {
            return a.destinationCountry.name.localeCompare(b.destinationCountry.name);
          }
          return aOrder - bOrder;
        default:
          return 0;
      }
    });

    return filtered;
  },

  getDestinationsByVisaType: (type: VisaType) => {
    const { destinations } = get();
    return destinations.filter((d) => d.visaType === type);
  },

  getDestinationsByRegion: (region: string) => {
    const { destinations } = get();
    return destinations.filter((d) => d.region === region);
  },

  getStatistics: () => {
    const { destinations } = get();

    return {
      total: destinations.length,
      visaFree: destinations.filter((d) => d.visaType === 'visa-free').length,
      eVisa: destinations.filter((d) => d.visaType === 'e-visa').length,
      visaOnArrival: destinations.filter((d) => d.visaType === 'visa-on-arrival').length,
      visaRequired: destinations.filter((d) => d.visaType === 'visa-required').length,
    };
  },
}));
