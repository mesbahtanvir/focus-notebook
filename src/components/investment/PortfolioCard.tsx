'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { Portfolio, useInvestments } from '@/store/useInvestments';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency as formatCurrencyValue } from '@/lib/services/currency';

interface PortfolioCardProps {
  portfolio: Portfolio;
  index: number;
}

export function PortfolioCard({ portfolio, index }: PortfolioCardProps) {
  const router = useRouter();
  const { getTotalPortfolioValueInCurrency, getTotalInvestedInCurrency } = useInvestments();
  const displayCurrency = 'CAD';
  const [totals, setTotals] = useState({ totalValue: 0, totalInvested: 0, roi: 0 });

  useEffect(() => {
    let isMounted = true;

    const computeTotals = async () => {
      try {
        const [value, invested] = await Promise.all([
          getTotalPortfolioValueInCurrency(portfolio.id, displayCurrency),
          getTotalInvestedInCurrency(portfolio.id, displayCurrency),
        ]);

        const roiValue = invested === 0 ? 0 : ((value - invested) / invested) * 100;

        if (isMounted) {
          setTotals({ totalValue: value, totalInvested: invested, roi: roiValue });
        }
      } catch (error) {
        console.error('Failed to compute portfolio card totals', error);
      }
    };

    computeTotals();

    return () => {
      isMounted = false;
    };
  }, [portfolio.id, portfolio.investments, displayCurrency, getTotalPortfolioValueInCurrency, getTotalInvestedInCurrency]);

  const { totalValue, totalInvested, roi } = totals;
  const gain = totalValue - totalInvested;
  const isPositive = gain >= 0;

  const getStatusColor = (status: Portfolio['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'closed': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      case 'archived': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const formatCurrency = (amount: number, currencyCode: string = displayCurrency) => {
    return formatCurrencyValue(amount, currencyCode);
  };

  const progressPercent = portfolio.targetAmount
    ? Math.min((totalValue / portfolio.targetAmount) * 100, 100)
    : 0;

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
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{portfolio.name}</h3>
            {portfolio.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {portfolio.description}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(portfolio.status)}>
            {portfolio.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Invested</p>
            <p className="text-xl font-semibold">
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
                {formatCurrency(gain)}
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
                <span>{formatCurrency(portfolio.targetAmount)}</span>
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
