'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestments } from '@/store/useInvestments';
import { PortfolioCard } from '@/components/investment/PortfolioCard';
import { PortfolioFormModal } from '@/components/investment/PortfolioFormModal';
import { ToolHeader } from '@/components/tools/ToolHeader';
import { SearchAndFilters } from '@/components/tools/SearchAndFilters';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { toolThemes } from '@/components/tools/themes';
import { useCurrency } from '@/store/useCurrency';
import { formatCurrency } from '@/lib/utils/currency';

export default function InvestmentsPage() {
  const { user } = useAuth();
  const { portfolios, isLoading, subscribe, getAllPortfoliosValue } = useInvestments();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'archived'>('all');
  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const filteredPortfolios = portfolios.filter((portfolio) => {
    const matchesSearch =
      portfolio.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      portfolio.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || portfolio.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activePortfolios = portfolios.filter((p) => p.status === 'active');
  const totalValue = getAllPortfoliosValue(currency);

  const theme = toolThemes.gold;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <ToolHeader
          title="Investment Tracker"
          emoji="💰"
          showBackButton
          stats={[
            {
              label: 'Total Value',
              value: formatCurrency(totalValue, currency),
              variant: 'default',
            },
            {
              label: 'Portfolios',
              value: activePortfolios.length.toString(),
              variant: 'info',
            },
          ]}
          theme={theme}
        />

        <SearchAndFilters
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search portfolios..."
          totalCount={portfolios.length}
          filteredCount={filteredPortfolios.length}
          showFilterToggle={true}
          showCurrencySelector
          currencyValue={currency}
          onCurrencyChange={setCurrency}
          filterContent={
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('closed')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'closed'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Closed
              </button>
              <button
                onClick={() => setStatusFilter('archived')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'archived'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Archived
              </button>
            </div>
          }
          theme={theme}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : filteredPortfolios.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">No portfolios yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first investment portfolio to start tracking
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolios.map((portfolio, index) => (
              <PortfolioCard key={portfolio.id} portfolio={portfolio} index={index} currency={currency} />
            ))}
          </div>
        )}

        <FloatingActionButton onClick={() => setIsFormOpen(true)} title="Add" />

        <PortfolioFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
      </div>
    </div>
  );
}
