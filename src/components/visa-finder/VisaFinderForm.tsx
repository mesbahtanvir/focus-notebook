'use client';

import { useState } from 'react';
import { Search, Plus, X, ShieldCheck } from 'lucide-react';
import { useVisaFinder } from '@/store/useVisaFinder';
import { COUNTRIES, searchCountries, getAllRegions } from '@/data/countries';
import type { AdditionalVisaType } from '@/types/visa';

export default function VisaFinderForm() {
  const {
    nationality,
    additionalVisas,
    setNationality,
    addAdditionalVisa,
    removeAdditionalVisa,
    searchDestinations,
    isLoading,
  } = useVisaFinder();

  const [nationalitySearch, setNationalitySearch] = useState('');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [showAddVisaForm, setShowAddVisaForm] = useState(false);

  // Additional visa form state
  const [visaCountry, setVisaCountry] = useState('');
  const [visaType, setVisaType] = useState<AdditionalVisaType>('residence');
  const [visaCountrySearch, setVisaCountrySearch] = useState('');
  const [showVisaCountryDropdown, setShowVisaCountryDropdown] = useState(false);

  const allowedNationalityCodes = ['BD'];
  const allowedVisaCountryCodes = ['CA', 'US'];

  const filteredCountries = nationalitySearch
    ? searchCountries(nationalitySearch).filter((country) =>
        allowedNationalityCodes.includes(country.code)
      )
    : COUNTRIES.filter((country) => allowedNationalityCodes.includes(country.code));

  const filteredVisaCountries = visaCountrySearch
    ? searchCountries(visaCountrySearch).filter((country) =>
        allowedVisaCountryCodes.includes(country.code)
      )
    : COUNTRIES.filter((country) => allowedVisaCountryCodes.includes(country.code));

  const selectedNationalityCountry = COUNTRIES.find(c => c.code === nationality);

  const handleNationalitySelect = (code: string) => {
    setNationality(code);
    setNationalitySearch('');
    setShowNationalityDropdown(false);
  };

  const handleAddVisa = () => {
    if (!visaCountry) return;

    const country = COUNTRIES.find(c => c.code === visaCountry);
    if (!country) return;

    addAdditionalVisa({
      country: visaCountry,
      countryName: country.name,
      type: visaType,
    });

    // Reset form
    setVisaCountry('');
    setVisaType('residence');
    setVisaCountrySearch('');
    setShowAddVisaForm(false);
  };

  const handleSearch = async () => {
    await searchDestinations();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Find Your Visa-Free Destinations
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Discover where you can travel with your passport
          </p>
        </div>
      </div>

      {/* Nationality Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your Nationality *
        </label>
        <div className="relative">
          <div
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-pointer hover:border-teal-500 dark:hover:border-teal-400 transition-colors"
            onClick={() => setShowNationalityDropdown(!showNationalityDropdown)}
          >
            {selectedNationalityCountry ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedNationalityCountry.flag}</span>
                <span className="text-gray-900 dark:text-white">
                  {selectedNationalityCountry.name}
                </span>
              </div>
            ) : (
              <span className="text-gray-500">Select your country...</span>
            )}
          </div>

          {showNationalityDropdown && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={nationalitySearch}
                    onChange={(e) => setNationalitySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <div
                    key={country.code}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-2"
                    onClick={() => handleNationalitySelect(country.code)}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <span className="text-gray-900 dark:text-white">{country.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Visas */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Additional Visas or Residencies (Optional)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Add valid visas or residence permits to unlock more destinations
        </p>

        {/* List of added visas */}
        {additionalVisas.length > 0 && (
          <div className="space-y-2 mb-3">
            {additionalVisas.map((visa) => (
              <div
                key={visa.id}
                className="flex items-center justify-between px-3 py-2 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {COUNTRIES.find(c => c.code === visa.country)?.flag}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {visa.countryName}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {visa.type} visa
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeAdditionalVisa(visa.id)}
                  className="p-1 hover:bg-teal-100 dark:hover:bg-teal-800 rounded"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add visa button/form */}
        {!showAddVisaForm ? (
          <button
            onClick={() => setShowAddVisaForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add visa or residency</span>
          </button>
        ) : (
          <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-3">
            {/* Visa country selection */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issuing Country
              </label>
              <div
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-pointer text-sm"
                onClick={() => setShowVisaCountryDropdown(!showVisaCountryDropdown)}
              >
                {visaCountry ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {COUNTRIES.find(c => c.code === visaCountry)?.flag}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {COUNTRIES.find(c => c.code === visaCountry)?.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500">Select country...</span>
                )}
              </div>

              {showVisaCountryDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={visaCountrySearch}
                      onChange={(e) => setVisaCountrySearch(e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  {filteredVisaCountries.slice(0, 50).map((country) => (
                    <div
                      key={country.code}
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-2 text-sm"
                      onClick={() => {
                        setVisaCountry(country.code);
                        setShowVisaCountryDropdown(false);
                        setVisaCountrySearch('');
                      }}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="text-gray-900 dark:text-white">{country.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visa type selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visa Type
              </label>
              <select
                value={visaType}
                onChange={(e) => setVisaType(e.target.value as AdditionalVisaType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="business">Business</option>
                <option value="residence">Residence</option>
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleAddVisa}
                disabled={!visaCountry}
                className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddVisaForm(false);
                  setVisaCountry('');
                  setVisaCountrySearch('');
                }}
                className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={!nationality || isLoading}
        className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-medium hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
      >
        <Search className="w-5 h-5" />
        {isLoading ? 'Searching...' : 'Find Destinations'}
      </button>
    </div>
  );
}
