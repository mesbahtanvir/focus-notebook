'use client';

import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { Portfolio, useInvestments } from '@/store/useInvestments';
import { Badge } from '@/components/ui/badge';
import { BASE_CURRENCY, convertCurrencySync, SupportedCurrency } from '@/lib/utils/currency';
import { useConfirm } from '@/hooks/useConfirm';

interface PortfolioTableProps {
  portfolios: Portfolio[];
  currency: SupportedCurrency;
}

export function PortfolioTable({ portfolios, currency }: PortfolioTableProps) {
  const router = useRouter();
  const {
    getTotalPortfolioValue,
    getTotalInvested,
    getPortfolioROI,
    deletePortfolio,
  } = useInvestments();
  const { confirm, ConfirmDialog } = useConfirm();

  const formatValue = (amount: number, compact = false) => {
    if (compact && Math.abs(amount) >= 1000) {
      const absAmount = Math.abs(amount);
      if (absAmount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}M`;
      }
      if (absAmount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K`;
      }
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: Portfolio['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'closed': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800';
      case 'archived': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>, portfolio: Portfolio) => {
    event.stopPropagation();
    const shouldDelete = await confirm({
      title: `Delete "${portfolio.name}"?`,
      message: "This action cannot be undone and will remove all related data for this portfolio.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (shouldDelete) {
      await deletePortfolio(portfolio.id);
    }
  };

  const handleRowClick = (portfolioId: string) => {
    router.push(`/tools/investments/${portfolioId}`);
  };

  if (portfolios.length === 0) {
    return null;
  }

  return (
    <>
      {ConfirmDialog}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Portfolio
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Assets
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Invested
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Return
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider w-8">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {portfolios.map((portfolio) => {
                const totalValue = getTotalPortfolioValue(portfolio.id, currency);
                const totalInvested = getTotalInvested(portfolio.id, currency);
                const roi = getPortfolioROI(portfolio.id, currency);
                const gain = totalValue - totalInvested;
                const isPositive = gain >= 0;
                const targetAmount = portfolio.targetAmount
                  ? convertCurrencySync(portfolio.targetAmount, BASE_CURRENCY, currency)
                  : undefined;
                const progressPercent = targetAmount
                  ? Math.min((totalValue / targetAmount) * 100, 100)
                  : 0;

                return (
                  <tr
                    key={portfolio.id}
                    onClick={() => handleRowClick(portfolio.id)}
                    className="hover:bg-amber-50/50 dark:hover:bg-amber-900/5 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {portfolio.name}
                        </span>
                        <Badge className={`capitalize text-xs px-1.5 py-0 ${getStatusColor(portfolio.status)}`}>
                          {portfolio.status[0].toUpperCase()}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300 font-medium">
                      {portfolio.investments.length}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400 font-semibold whitespace-nowrap">
                      {formatValue(totalValue)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatValue(totalInvested)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 font-semibold">
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {formatValue(gain, true)}
                        </div>
                        <span className="text-xs">
                          {roi.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {targetAmount !== undefined ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-mono tabular-nums text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {formatValue(targetAmount)}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono tabular-nums text-gray-500 dark:text-gray-500 w-8">
                              {progressPercent.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, portfolio)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label={`Delete ${portfolio.name}`}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
