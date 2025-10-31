'use client';

import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, DollarSign, Target, Trash2 } from 'lucide-react';
import { Portfolio, useInvestments } from '@/store/useInvestments';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BASE_CURRENCY, convertCurrency, formatCurrency, SupportedCurrency } from '@/lib/utils/currency';

interface PortfolioCardProps {
  portfolio: Portfolio;
  index: number;
  currency: SupportedCurrency;
  onExploreHorizon?: (portfolioId: string) => void;
}

export function PortfolioCard({ portfolio, index, currency, onExploreHorizon }: PortfolioCardProps) {
  const router = useRouter();
  const {
    getTotalPortfolioValue,
    getTotalInvested,
    getPortfolioROI,
    deletePortfolio,
  } = useInvestments();

  const totalValue = getTotalPortfolioValue(portfolio.id, currency);
  const totalInvested = getTotalInvested(portfolio.id, currency);
  const roi = getPortfolioROI(portfolio.id, currency);
  const gain = totalValue - totalInvested;
  const isPositive = gain >= 0;


  const targetAmount = portfolio.targetAmount
    ? convertCurrency(portfolio.targetAmount, BASE_CURRENCY, currency)
    : undefined;

  const formatValue = (amount: number) => formatCurrency(amount, currency);

  const getStatusColor = (status: Portfolio['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'closed': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      case 'archived': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const progressPercent = targetAmount
    ? Math.min((totalValue / targetAmount) * 100, 100)
    : 0;

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (confirm(`Delete portfolio "${portfolio.name}"? This cannot be undone.`)) {
      await deletePortfolio(portfolio.id);
    }
  };

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className="p-5 sm:p-6 hover:shadow-xl transition-all cursor-pointer border border-gray-100 bg-white/95 dark:bg-gray-900/80 h-full flex flex-col"
        onClick={() => router.push(`/tools/investments/${portfolio.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {portfolio.name}
            </h3>
            {portfolio.description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {portfolio.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`capitalize ${getStatusColor(portfolio.status)}`}>
              {portfolio.status}
            </Badge>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label={`Delete ${portfolio.name}`}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex-1 flex flex-col">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Current Value</p>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {currency} {formatValue(totalValue)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Invested</p>
                <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">
                  {currency} {formatValue(totalInvested)}
                </p>
              </div>
              <div className={`rounded-lg border px-3 py-2 ${isPositive ? 'border-green-100 bg-green-50/60 dark:border-green-900/60 dark:bg-green-900/10' : 'border-red-100 bg-red-50/60 dark:border-red-900/60 dark:bg-red-900/10'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Gain / Loss
                  </span>
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <p className={`mt-1 font-semibold ${isPositive ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                  {currency} {formatValue(gain)}
                </p>
                <p className={`text-xs ${isPositive ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                  {roi.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span>{portfolio.investments.length} investment{portfolio.investments.length !== 1 ? 's' : ''}</span>
              </div>
              {portfolio.targetAmount && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span>{progressPercent.toFixed(0)}% to goal</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-3 pt-4">
            {portfolio.targetAmount ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span>{targetAmount !== undefined ? `${currency} ${formatValue(targetAmount)}` : ''}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                Set a target amount to track progress toward your goal.
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
              {portfolio.investments
                .filter(inv => inv.ticker)
                .slice(0, 4)
                .map(inv => (
                  <Badge
                    key={inv.id}
                    variant="secondary"
                    className="text-xs font-mono bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/40"
                  >
                    {inv.ticker}
                  </Badge>
                ))}
              {portfolio.investments.filter(inv => inv.ticker).length > 4 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  +{portfolio.investments.filter(inv => inv.ticker).length - 4} more
                </Badge>
              )}
              {!portfolio.investments.some(inv => inv.ticker) && (
                <span className="text-xs text-gray-400">Add tickers to see quick badges here.</span>
              )}
            </div>

            {onExploreHorizon && (
              <div className="pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
                  onClick={(event) => {
                    event.stopPropagation();
                    onExploreHorizon(portfolio.id);
                  }}
                >
                  Explore Horizon
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
