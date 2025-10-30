'use client';

import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, DollarSign, Target, Trash2 } from 'lucide-react';
import { Portfolio, useInvestments } from '@/store/useInvestments';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BASE_CURRENCY, convertCurrency, formatCurrency, SupportedCurrency } from '@/lib/utils/currency';

interface PortfolioCardProps {
  portfolio: Portfolio;
  index: number;
  currency: SupportedCurrency;
}

export function PortfolioCard({ portfolio, index, currency }: PortfolioCardProps) {
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
  const baseCurrency = portfolio.baseCurrency || 'USD';
  const locale = portfolio.locale || 'en-US';

  const formatAmount = (amount: number) => formatCurrency(amount, baseCurrency, locale);

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-amber-500"
        onClick={() => router.push(`/tools/investments/${portfolio.id}`)}
      >
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="flex-1">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
              {portfolio.name}
            </h3>
            {portfolio.description && (
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-2">
                {portfolio.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(portfolio.status)}>
              {portfolio.status}
            </Badge>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label={`Delete ${portfolio.name}`}
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value</p>
            <p className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Invested</p>
            <p className="text-lg md:text-xl font-semibold">
              {formatCurrency(totalInvested)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm font-medium">Gain/Loss</span>
            </div>
            <div className="text-right">
              <p className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {formatValue(gain)}
              </p>
              <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {roi.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {portfolio.investments.length} Investment{portfolio.investments.length !== 1 ? 's' : ''}
              </span>
            </div>
            {portfolio.targetAmount && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {progressPercent.toFixed(0)}% to goal
                </span>
              </div>
            )}
          </div>

          {/* Show stock tickers if any */}
          {portfolio.investments.some(inv => inv.ticker) && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
              {portfolio.investments
                .filter(inv => inv.ticker)
                .slice(0, 5)
                .map(inv => (
                  <Badge
                    key={inv.id}
                    variant="outline"
                    className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                  >
                    {inv.ticker}
                  </Badge>
                ))}
              {portfolio.investments.filter(inv => inv.ticker).length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{portfolio.investments.filter(inv => inv.ticker).length - 5} more
                </Badge>
              )}
            </div>
          )}

          {portfolio.targetAmount && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Progress to target</span>
                <span>{targetAmount !== undefined ? formatValue(targetAmount) : ''}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
