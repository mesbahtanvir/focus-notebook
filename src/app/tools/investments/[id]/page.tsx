'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestments, Investment } from '@/store/useInvestments';
import { InvestmentFormModal } from '@/components/investment/InvestmentFormModal';
import { ContributionFormModal } from '@/components/investment/ContributionFormModal';
import { PortfolioValueChart } from '@/components/investment/PortfolioValueChart';
import { StockPerformanceChart } from '@/components/investment/StockPerformanceChart';
import { CurrencyBadge } from '@/components/investment/CurrencyBadge';
import { ToolHeader } from '@/components/tools/ToolHeader';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toolThemes } from '@/components/tools/themes';
import { Trash2, Plus, RefreshCw, Sparkles, Camera, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/store/useSettings';
import { fetchStockHistory } from '@/lib/services/stockApi';
import { useCurrency } from '@/store/useCurrency';
import { BASE_CURRENCY, convertCurrency, normalizeCurrencyCode } from '@/lib/utils/currency';

export default function PortfolioDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    subscribe,
    getPortfolio,
    getTotalPortfolioValue,
    getTotalInvested,
    getPortfolioROI,
    getTotalPortfolioValueInCurrency,
    getTotalInvestedInCurrency,
    deleteInvestment,
    deleteContribution,
    refreshAllPrices,
    createSnapshot,
  } = useInvestments();

  const { settings } = useSettings();
  const openAIModel = settings.aiModel;
  const { currency } = useCurrency();

  const [isInvestmentFormOpen, setIsInvestmentFormOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [investmentToEdit, setInvestmentToEdit] = useState<Investment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [predictions, setPredictions] = useState<any>(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const [portfolioTotals, setPortfolioTotals] = useState({ totalValue: 0, totalInvested: 0, roi: 0 });

  useEffect(() => {
    if (user?.uid) {
      subscribe(user.uid);
    }
  }, [user?.uid, subscribe]);

  const portfolio = getPortfolio(params.id);

  useEffect(() => {
    if (!portfolio) {
      setPortfolioTotals({ totalValue: 0, totalInvested: 0, roi: 0 });
      return;
    }

    let isMounted = true;

    const computeTotals = async () => {
      try {
        const [value, invested] = await Promise.all([
          getTotalPortfolioValueInCurrency(portfolio.id, currency),
          getTotalInvestedInCurrency(portfolio.id, currency),
        ]);

        const roiValue = invested === 0 ? 0 : ((value - invested) / invested) * 100;

        if (isMounted) {
          setPortfolioTotals({ totalValue: value, totalInvested: invested, roi: roiValue });
        }
      } catch (error) {
        console.error('Failed to compute portfolio totals', error);
      }
    };

    computeTotals();

    return () => {
      isMounted = false;
    };
  }, [portfolio, currency, getTotalPortfolioValueInCurrency, getTotalInvestedInCurrency]);

  if (!portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Portfolio not found</h2>
          <Button onClick={() => router.push('/tools/investments')}>
            Back to Portfolios
          </Button>
        </div>
      </div>
    );
  }

  const totalValue = getTotalPortfolioValue(portfolio.id, currency);
  const totalInvested = getTotalInvested(portfolio.id, currency);
  const roi = getPortfolioROI(portfolio.id, currency);
  const gain = totalValue - totalInvested;
  const isPositive = gain >= 0;
  const baseCurrency = portfolio.baseCurrency || 'USD';
  const locale = portfolio.locale || 'en-US';

  const convertFromBase = (amount: number | undefined | null) => {
    if (!Number.isFinite(amount ?? NaN)) {
      return 0;
    }
    return convertCurrency(amount ?? 0, BASE_CURRENCY, currency);
  };

  const convertFromCurrency = (amount: number | undefined | null, sourceCurrency?: string) => {
    if (!Number.isFinite(amount ?? NaN)) {
      return 0;
    }
    const normalizedSource = normalizeCurrencyCode(sourceCurrency || currency);
    return convertCurrency(amount ?? 0, normalizedSource, currency);
  };

  const formatAmount = (amount: number, code?: string) => {
    const normalized = normalizeCurrencyCode(code ?? currency);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalized,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
    return `${normalized} ${formatted}`;
  };

  const formatConvertedAmount = (amount: number | undefined | null, sourceCurrency?: string) =>
    formatAmount(convertFromCurrency(amount, sourceCurrency));

  const formatExchangeRate = (value: number, code?: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizeCurrencyCode(code ?? currency),
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    if (confirm('Are you sure you want to delete this investment?')) {
      try {
        await deleteInvestment(portfolio.id, investmentId);
        toast({ title: 'Success', description: 'Investment deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete investment', variant: 'destructive' });
      }
    }
  };

  const handleDeleteContribution = async (investmentId: string, contributionId: string) => {
    if (confirm('Are you sure you want to delete this contribution?')) {
      try {
        await deleteContribution(portfolio.id, investmentId, contributionId);
        toast({ title: 'Success', description: 'Contribution deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete contribution', variant: 'destructive' });
      }
    }
  };

  const handleRefreshPrices = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllPrices(portfolio.id);
      toast({ title: 'Success', description: 'Stock prices updated successfully!' });
    } catch (error: any) {
      console.error('Error refreshing prices:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to refresh prices',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGeneratePrediction = async () => {
    // Get a stock investment with history
    const stockInvestment = portfolio.investments.find(
      inv => inv.assetType === 'stock' && inv.priceHistory && inv.priceHistory.length >= 30
    );

    if (!stockInvestment) {
      toast({
        title: 'Insufficient Data',
        description: 'Need at least 30 days of stock price history to generate predictions. Try refreshing prices first.',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingPrediction(true);
    try {
      // Fetch more historical data if needed
      let historicalData = stockInvestment.priceHistory || [];

      if (historicalData.length < 90 && stockInvestment.ticker) {
        const history = await fetchStockHistory(stockInvestment.ticker, 90);
        historicalData = history.data;
      }

      const response = await fetch('/api/predict-investment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicalData,
          symbol: stockInvestment.ticker,
          model: openAIModel || 'gpt-4o-mini'
        })
      });

      const data = await response.json();

      if (data.success) {
        setPredictions(data.prediction);
        setShowPredictions(true);
        toast({ title: 'Success', description: 'AI prediction generated!' });
      } else {
        throw new Error(data.error || 'Failed to generate prediction');
      }
    } catch (error: any) {
      console.error('Error generating prediction:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate prediction',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingPrediction(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      await createSnapshot(portfolio.id);
      toast({ title: 'Success', description: 'Daily snapshot created!' });
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast({
        title: 'Error',
        description: 'Failed to create snapshot',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const theme = toolThemes.gold;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <ToolHeader
          title={portfolio.name}
          emoji="💰"
          showBackButton
          stats={[
            {
              label: 'Current Value',
              value: formatAmount(totalValue),
              variant: 'default',
            },
            {
              label: 'ROI',
              value: `${roi.toFixed(2)}%`,
              variant: isPositive ? 'success' : 'warning',
            },
          ]}
          theme={theme}
        />

        {portfolio.description && (
          <Card className="p-4">
            <p className="text-gray-700 dark:text-gray-300">{portfolio.description}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Invested</h3>
            <p className="text-2xl font-bold">{formatAmount(totalInvested)}</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Value</h3>
            <p className="text-2xl font-bold text-amber-600">{formatAmount(totalValue)}</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Gain/Loss</h3>
            <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(gain)}
            </p>
            <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {roi.toFixed(2)}%
            </p>
          </Card>
        </div>

        {/* Action Buttons for Stock Features */}
        {portfolio.investments.some(inv => inv.assetType === 'stock') && (
          <Card className="p-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleRefreshPrices}
                disabled={isRefreshing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Stock Prices'}
              </Button>

              <Button
                onClick={handleGeneratePrediction}
                disabled={isGeneratingPrediction}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className={`w-4 h-4 mr-2 ${isGeneratingPrediction ? 'animate-pulse' : ''}`} />
                {isGeneratingPrediction ? 'Generating...' : 'AI Prediction'}
              </Button>

              <Button
                onClick={handleCreateSnapshot}
                disabled={isCreatingSnapshot}
                variant="outline"
              >
                <Camera className={`w-4 h-4 mr-2 ${isCreatingSnapshot ? 'animate-pulse' : ''}`} />
                {isCreatingSnapshot ? 'Creating...' : 'Create Snapshot'}
              </Button>

              {showPredictions && (
                <Button
                  onClick={() => setShowPredictions(false)}
                  variant="outline"
                >
                  Hide Predictions
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Portfolio Value Chart */}
        <PortfolioValueChart
          portfolio={portfolio}
          predictions={showPredictions && predictions ? predictions.predictions : []}
          showPredictions={showPredictions}
          currency={currency}
        />

        {/* AI Prediction Summary */}
        {showPredictions && predictions && (
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  AI Investment Analysis
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Trend: </span>
                    <Badge className={
                      predictions.trend === 'bullish' ? 'bg-green-500' :
                      predictions.trend === 'bearish' ? 'bg-red-500' : 'bg-gray-500'
                    }>
                      {predictions.trend}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Summary: </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{predictions.summary}</p>
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Analysis: </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{predictions.reasoning}</p>
                  </div>

                  {predictions.targetPrice30Days && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400">30-Day Target</p>
                        <p className="text-lg font-bold text-purple-600">
                          {formatAmount(convertFromBase(predictions.targetPrice30Days))}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Support Level</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatAmount(convertFromBase(predictions.supportLevel))}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Resistance Level</p>
                        <p className="text-lg font-bold text-red-600">
                          {formatAmount(convertFromBase(predictions.resistanceLevel))}
                        </p>
                      </div>
                    </div>
                  )}

                  {predictions.riskFactors && predictions.riskFactors.length > 0 && (
                    <div>
                      <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Risk Factors: </span>
                      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mt-1 space-y-1">
                        {predictions.riskFactors.map((risk: string, idx: number) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-4">Investments</h2>
          {portfolio.investments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No investments in this portfolio yet
              </p>
              <Button
                onClick={() => {
                  setInvestmentToEdit(null);
                  setIsInvestmentFormOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Add First Investment
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {portfolio.investments.map((investment) => {
                const initialAmount = convertFromCurrency(investment.initialAmount, investment.currency);
                const currentAmount = convertFromCurrency(investment.currentValue, investment.currency);
                const investmentGain = currentAmount - initialAmount;
                const investmentROI =
                  initialAmount > 0
                    ? ((investmentGain / initialAmount) * 100)
                    : 0;
                const isInvestmentPositive = investmentGain >= 0;

                return (
                  <Card
                    key={investment.id}
                    className="overflow-hidden border border-gray-100 bg-white/95 dark:border-gray-800/70 dark:bg-gray-900/70"
                  >
                    {investment.assetType === 'stock' && investment.ticker && (
                      <StockPerformanceChart investment={investment} currency={currency} variant="embedded" />
                    )}

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{investment.name}</h3>
                          <div className="flex gap-2 mt-2">
                            <Badge className="mt-2">{investment.type}</Badge>
                            <Badge variant="outline" className="mt-2">
                              {investment.assetType === 'stock' ? 'Auto-Tracked' : 'Manual'}
                            </Badge>
                            {investment.ticker && (
                              <Badge variant="outline" className="mt-2 font-mono bg-blue-50 text-blue-700">
                                {investment.ticker}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setInvestmentToEdit(investment);
                              setIsInvestmentFormOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvestment(investment);
                              setIsContributionFormOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvestment(investment.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Initial</p>
                          <p className="font-semibold font-mono tabular-nums">
                            {formatAmount(initialAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Current</p>
                          <p className="font-semibold text-amber-600 font-mono tabular-nums">
                            {formatAmount(currentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Gain/Loss</p>
                          <p className={`font-semibold font-mono tabular-nums ${isInvestmentPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {formatAmount(investmentGain)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">ROI</p>
                          <p className={`font-semibold font-mono tabular-nums ${isInvestmentPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {investmentROI.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {investment.nativeCurrency && (
                        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-800 dark:bg-sky-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <CurrencyBadge code={investment.nativeCurrency} tone="native" label="Native" />
                            <span className="text-sm font-semibold text-sky-900 dark:text-sky-100">Native totals</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-sky-900 dark:text-sky-100">
                            {typeof investment.nativeInitialAmount === 'number' && (
                              <div>
                                <p className="uppercase tracking-wide text-[0.65rem] opacity-70">Initial</p>
                                <p className="font-semibold font-mono tabular-nums">
                                  {formatAmount(
                                    investment.nativeInitialAmount,
                                    investment.nativeCurrency
                                  )}
                                </p>
                              </div>
                            )}
                            {typeof investment.nativeCurrentValue === 'number' && (
                              <div>
                                <p className="uppercase tracking-wide text-[0.65rem] opacity-70">Current</p>
                                <p className="font-semibold font-mono tabular-nums">
                                  {formatAmount(
                                    investment.nativeCurrentValue,
                                    investment.nativeCurrency
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                          {investment.conversionRate && (
                            <p className="mt-2 text-xs text-sky-800/80 dark:text-sky-200">
                              Conversion rate: 1 {investment.nativeCurrency} ≈ {formatExchangeRate(
                                investment.conversionRate,
                                investment.baseCurrency || baseCurrency
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {investment.contributions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold mb-3">Contribution History</h4>
                          <div className="space-y-2">
                            {investment.contributions
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .slice(0, 5)
                              .map((contribution) => (
                                <div
                                  key={contribution.id}
                                  className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge
                                      className={
                                        contribution.type === 'deposit'
                                          ? 'bg-green-500/10 text-green-700'
                                          : contribution.type === 'withdrawal'
                                          ? 'bg-red-500/10 text-red-700'
                                          : 'bg-blue-500/10 text-blue-700'
                                      }
                                    >
                                      {contribution.type}
                                    </Badge>
                                    <span>{formatDate(contribution.date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium font-mono tabular-nums">
                                      {formatConvertedAmount(contribution.amount, contribution.currency)}
                                    </span>
                                    <CurrencyBadge code={investment.baseCurrency || baseCurrency} tone="base" />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteContribution(investment.id, contribution.id)}
                                    >
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {investment.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{investment.notes}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <FloatingActionButton
          onClick={() => {
            setInvestmentToEdit(null);
            setIsInvestmentFormOpen(true);
          }}
          title="Add"
        />

        <InvestmentFormModal
          isOpen={isInvestmentFormOpen}
          onClose={() => {
            setIsInvestmentFormOpen(false);
            setInvestmentToEdit(null);
          }}
          portfolioId={portfolio.id}
          baseCurrency={baseCurrency}
          investment={investmentToEdit ?? undefined}
        />

        {selectedInvestment && (
          <ContributionFormModal
            isOpen={isContributionFormOpen}
            onClose={() => {
              setIsContributionFormOpen(false);
              setSelectedInvestment(null);
            }}
            portfolioId={portfolio.id}
            investmentId={selectedInvestment.id}
            investment={selectedInvestment}
          />
        )}
      </div>
    </div>
  );
}
