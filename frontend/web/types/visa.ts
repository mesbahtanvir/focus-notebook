// Visa-related type definitions

export interface Country {
  code: string; // ISO 3166-1 alpha-2 code
  name: string;
  flag: string; // Flag emoji
  region: string;
}

export type VisaType = 'visa-free' | 'e-visa' | 'visa-on-arrival' | 'visa-required';

export type AdditionalVisaType = 'tourist' | 'business' | 'work' | 'residence' | 'student' | 'other';

export interface AdditionalVisa {
  id: string;
  country: string; // Issuing country code
  countryName: string;
  type: AdditionalVisaType;
  validUntil?: string;
}

export interface VisaRequirement {
  id: string; // Format: sourceCountry_destinationCountry (e.g., "US_JP")
  sourceCountry: {
    code: string;
    name: string;
    flag: string;
  };
  destinationCountry: {
    code: string;
    name: string;
    flag: string;
  };
  visaType: VisaType;
  duration: string; // e.g., "90 days", "30 days", "N/A"
  description: string; // Brief country highlights
  region: string; // e.g., "Asia", "Europe", "Africa"
  requirements: string[]; // List of entry requirements
  notes?: string; // Additional context
  lastUpdated: string; // ISO date string
  confidence: 'high' | 'medium' | 'low';
  source: 'openai' | 'manual' | 'official';
}

export interface DestinationAccess extends VisaRequirement {
  accessSource: 'nationality' | string; // Which visa/nationality enabled this access
}

export interface VisaFinderQuery {
  nationality: string; // Country code
  additionalVisas: AdditionalVisa[];
}

export interface VisaDataMetadata {
  lastFullUpdate: string; // ISO date string
  version: string;
  totalCountries: number;
  updateStatus: 'completed' | 'in-progress' | 'failed';
  lastUpdateStarted?: string;
  errorMessage?: string;
}

export interface VisaFinderPreferences {
  userId: string;
  nationality?: string;
  savedVisas: AdditionalVisa[];
  recentSearches: VisaFinderQuery[];
  createdAt: string;
  updatedAt: string;
}

// For cloud function processing
export interface BatchProcessingResult {
  sourceCountry: string;
  processedDestinations: number;
  failedDestinations: number;
  errors: string[];
  timestamp: string;
}

// OpenAI response format
export interface OpenAIVisaResponse {
  destinations: Array<{
    countryCode: string;
    countryName: string;
    visaType: VisaType;
    duration: string;
    description: string;
    region: string;
    requirements: string[];
    notes?: string;
  }>;
}
