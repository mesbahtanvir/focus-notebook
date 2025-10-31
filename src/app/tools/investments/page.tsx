'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestments } from '@/store/useInvestments';
import { PortfolioCard } from '@/components/investment/PortfolioCard';
import { PortfolioFormModal } from '@/components/investment/PortfolioFormModal';
import { ToolHeader } from '@/components/tools/ToolHeader';
import { SearchAndFilters } from '@/components/tools/SearchAndFilters';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { toolThemes } from '@/components/tools/themes';
import { useCurrency } from '@/store/useCurrency';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { convertCurrency, formatCurrency, normalizeCurrencyCode, SupportedCurrency } from '@/lib/utils/currency';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InvestmentsPage() {
  const { user } = useAuth();
  const {
    portfolios,
    isLoading,
    subscribe,
    getAllPortfoliosValue,
    getTotalPortfolioValue,
    getTotalInvested,
    getPortfoliosForExport,
    importPortfolios,
  } = useInvestments();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'archived'>('all');
  const { currency, setCurrency } = useCurrency();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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

  const filteredPortfolioIds = useMemo(() => filteredPortfolios.map((portfolio) => portfolio.id), [filteredPortfolios]);

  const handleExportPortfolios = async () => {
    try {
      setIsExporting(true);
      const exportData = getPortfoliosForExport(filteredPortfolioIds);
      const payload = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        currency,
        portfolioCount: exportData.length,
        portfolios: exportData,
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `focus-portfolios-${new Date().toISOString().split('T')[0]}.json`;

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({
        title: 'Portfolios exported',
        description: `Exported ${exportData.length} portfolio${exportData.length === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      console.error('Portfolio export failed', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unable to export portfolios.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      let parsed: any;

      try {
        parsed = JSON.parse(text);
      } catch (error) {
        throw new Error('Selected file is not valid JSON.');
      }

      const portfolioPayload = Array.isArray(parsed?.portfolios)
        ? parsed.portfolios
        : Array.isArray(parsed)
        ? parsed
        : null;

      if (!portfolioPayload || portfolioPayload.length === 0) {
        throw new Error('No portfolios found in import file.');
      }

      const result = await importPortfolios(portfolioPayload, { preserveIds: true, overwriteExisting: false });
      const importedCount = result.created + result.updated;

      if (importedCount > 0) {
        toast({
          title: 'Portfolios imported',
          description: `Imported ${importedCount} portfolio${importedCount === 1 ? '' : 's'}.`,
        });
      } else {
        toast({
          title: 'No portfolios imported',
          description: result.errors[0] ?? 'No new portfolios were imported.',
          variant: 'destructive',
        });
      }

      if (result.errors.length > 0) {
        console.warn('Portfolio import warnings:', result.errors);
      }
    } catch (error) {
      console.error('Portfolio import failed', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unable to import portfolios.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const combinedSummary = useMemo(() => {
    if (filteredPortfolios.length === 0) {
      return {
        totalCurrent: 0,
        totalInvested: 0,
        totalGain: 0,
        roi: 0,
        totalInvestments: 0,
        totalContributions: 0,
        currencyBreakdown: [] as Array<{ code: SupportedCurrency; value: number; percent: number }>,
      };
    }

    let totalCurrent = 0;
    let totalInvested = 0;
    let totalInvestments = 0;
    let totalContributions = 0;
    const currencyTotals = new Map<SupportedCurrency, number>();

    filteredPortfolios.forEach((portfolio) => {
      const portfolioValue = getTotalPortfolioValue(portfolio.id, currency);
      const portfolioInvested = getTotalInvested(portfolio.id, currency);
      totalCurrent += portfolioValue;
      totalInvested += portfolioInvested;
      totalInvestments += portfolio.investments.length;
      totalContributions += portfolio.investments.reduce(
        (sum, investment) => sum + investment.contributions.length,
        0
      );

      portfolio.investments.forEach((investment) => {
        if (!Number.isFinite(investment.currentValue)) {
          return;
        }
        const investmentCurrency = normalizeCurrencyCode(investment.currency);
        const convertedValue = convertCurrency(investment.currentValue, investmentCurrency, currency);
        currencyTotals.set(
          investmentCurrency,
          (currencyTotals.get(investmentCurrency) || 0) + convertedValue
        );
      });
    });

    const totalGain = totalCurrent - totalInvested;
    const roi = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    const currencyBreakdown = Array.from(currencyTotals.entries())
      .map(([code, value]) => ({
        code,
        value,
        percent: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalCurrent,
      totalInvested,
      totalGain,
      roi,
      totalInvestments,
      totalContributions,
      currencyBreakdown,
    };
  }, [filteredPortfolios, currency, getTotalInvested, getTotalPortfolioValue]);

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

        <div className="flex flex-wrap justify-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="application/json"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? 'Importing...' : 'Import Portfolios'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPortfolios}
            disabled={isExporting || filteredPortfolioIds.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Portfolios'}
          </Button>
        </div>

        {!isLoading && filteredPortfolios.length > 0 && (
          <Card className="p-6">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Combined Portfolio Overview
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Aggregated totals for the selected currency and filters.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-xs uppercase tracking-wide text-amber-800/80 dark:text-amber-200">Current Value</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-200">
                    {formatCurrency(combinedSummary.totalCurrent, currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="text-xs uppercase tracking-wide text-blue-800/80 dark:text-blue-200">Total Invested</p>
                  <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-200">
                    {formatCurrency(combinedSummary.totalInvested, currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50/70 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-xs uppercase tracking-wide text-green-800/80 dark:text-green-200">Net Gain/Loss</p>
                  <p className={`mt-2 text-2xl font-bold ${combinedSummary.totalGain >= 0 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                    {formatCurrency(combinedSummary.totalGain, currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                  <p className="text-xs uppercase tracking-wide text-purple-800/80 dark:text-purple-200">Overall ROI</p>
                  <p className={`mt-2 text-2xl font-bold ${combinedSummary.totalGain >= 0 ? 'text-purple-700 dark:text-purple-200' : 'text-red-600 dark:text-red-300'}`}>
                    {combinedSummary.roi.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Portfolios Included</p>
                  <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                    {filteredPortfolios.length}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Investments Tracked</p>
                  <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                    {combinedSummary.totalInvestments}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Contributions Logged</p>
                  <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                    {combinedSummary.totalContributions}
                  </p>
                </div>
              </div>

              {combinedSummary.currencyBreakdown.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Value by Investment Currency
                  </p>
                  <div className="space-y-3">
                    {combinedSummary.currencyBreakdown.map((entry) => (
                      <div
                        key={entry.code}
                        className="grid grid-cols-2 gap-3 items-center text-sm text-gray-700 dark:text-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{entry.code}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {entry.percent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-amber-500 dark:bg-amber-400"
                              style={{ width: `${Math.min(entry.percent, 100)}%` }}
                            />
                          </div>
                          <span className="whitespace-nowrap font-medium">
                            {formatCurrency(entry.value, currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
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
