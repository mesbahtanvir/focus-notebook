'use client';

import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Trash2, Eye } from 'lucide-react';
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

  const formatValue = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

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
          <table className="w-full">
            <thead className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Portfolio
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Current Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Total Invested
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Gain/Loss
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  ROI %
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Investments
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Actions
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
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {portfolio.name}
                        </span>
                        {portfolio.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {portfolio.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`capitalize ${getStatusColor(portfolio.status)}`}>
                        {portfolio.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400 font-semibold">
                      {formatValue(totalValue)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-700 dark:text-gray-300">
                      {formatValue(totalInvested)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {formatValue(gain)}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {roi.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                      {portfolio.investments.length}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-600 dark:text-gray-400 text-sm">
                      {targetAmount !== undefined ? formatValue(targetAmount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {targetAmount !== undefined ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono tabular-nums text-gray-600 dark:text-gray-400 w-10 text-right">
                            {progressPercent.toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(portfolio.id);
                          }}
                          className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          aria-label={`View ${portfolio.name}`}
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, portfolio)}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          aria-label={`Delete ${portfolio.name}`}
                          title="Delete portfolio"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
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
