'use client';

import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Investment } from '@/store/useInvestments';
import { getChangeColorClass } from '@/lib/services/stockApi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { convertCurrency, normalizeCurrencyCode, SupportedCurrency } from '@/lib/utils/currency';
import { formatCurrency as formatCurrencyWithLocale } from '@/lib/currency';
import { CurrencyBadge } from '@/components/investment/CurrencyBadge';

interface StockPerformanceChartProps {
  investment: Investment;
  currency: SupportedCurrency;
  variant?: 'standalone' | 'embedded';
}

export function StockPerformanceChart({ investment, currency, variant = 'standalone' }: StockPerformanceChartProps) {
  if (investment.assetType !== 'stock' || !investment.ticker) {
    return null;
  }

  const investmentCurrency = normalizeCurrencyCode(investment.currency);
  const priceHistory = investment.priceHistory || [];

  const convertToDisplay = (value: number, sourceCurrency?: string) => {
    const fromCurrency = normalizeCurrencyCode(sourceCurrency || investmentCurrency);
    return convertCurrency(value, fromCurrency, currency);
  };

  const formatPointDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const chartData = priceHistory.map(point => {
    const pointCurrency = normalizeCurrencyCode(point.currency || investmentCurrency);
    return {
      date: formatPointDate(point.date),
      price: convertToDisplay(point.price, pointCurrency),
      fullDate: point.date,
    };
  });

  const currentPricePerShare = typeof investment.currentPricePerShare === 'number'
    ? convertToDisplay(investment.currentPricePerShare, investment.currency)
    : null;

  const formatDisplayCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  if (priceHistory.length < 2) {
    const fallbackContent = (
      <>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h4 className="font-semibold text-lg">{investment.ticker}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{investment.name}</p>
          </div>
          {currentPricePerShare !== null && (
            <div className="text-right">
              <p className="font-semibold font-mono tabular-nums">{formatDisplayCurrency(currentPricePerShare)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">per share</p>
            </div>
          )}
        </div>
        {nativePanel}
        <div className="h-[160px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg dark:border-gray-700">
          Not enough price history to display chart
        </div>
      </>
    );

    if (variant === 'standalone') {
      return <Card className="p-4">{fallbackContent}</Card>;
    }

    return (
      <div className="px-6 py-6 bg-white dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
        {fallbackContent}
      </div>
    );
  }

  // Calculate statistics
  const firstPoint = priceHistory[0];
  const lastPoint = priceHistory[priceHistory.length - 1];
  const firstPrice = firstPoint ? convertToDisplay(firstPoint.price, firstPoint.currency) : 0;
  const currentPrice = lastPoint ? convertToDisplay(lastPoint.price, lastPoint.currency) : 0;
  const priceChange = currentPrice - firstPrice;
  const percentChange = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(2) : '0.00';
  const isPositive = priceChange >= 0;
  const isNeutral = priceChange === 0;

  // Calculate total value if quantity is available
  const quantity = typeof investment.quantity === 'number' ? investment.quantity : 0;
  const totalValue = quantity > 0 ? currentPrice * quantity : null;
  const totalGain = quantity > 0 ? priceChange * quantity : null;
  const nativeCurrency = investment.nativeCurrency;
  const nativeCurrentValue = investment.nativeCurrentValue;
  const nativePanel =
    nativeCurrency && typeof nativeCurrentValue === 'number' ? (
      <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-sm dark:border-sky-800 dark:bg-sky-900/20">
        <div className="flex items-center gap-2 mb-2">
          <CurrencyBadge code={nativeCurrency} tone="native" label="Native" />
          <span className="font-medium text-sky-900 dark:text-sky-100">Native valuation</span>
        </div>
        <div className="flex justify-between text-sky-900 dark:text-sky-100">
          <span>Current:</span>
          <span className="font-semibold font-mono tabular-nums">
            {formatCurrencyWithLocale(nativeCurrentValue, nativeCurrency, investment.locale || 'en-US')}
          </span>
        </div>
        {typeof investment.nativeInitialAmount === 'number' && (
          <div className="flex justify-between text-sky-900 dark:text-sky-100 mt-1">
            <span>Initial:</span>
            <span className="font-semibold font-mono tabular-nums">
              {formatCurrencyWithLocale(
                investment.nativeInitialAmount,
                nativeCurrency,
                investment.locale || 'en-US'
              )}
            </span>
          </div>
        )}
      </div>
    ) : null;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold">{payload[0].payload.date}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Price: {formatDisplayCurrency(payload[0].value)}
          </p>
          {quantity > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Value: {formatDisplayCurrency(quantity * payload[0].value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Determine trend icon
  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendColor = isNeutral
    ? 'text-gray-600 dark:text-gray-300'
    : isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  const chartContent = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-lg">{investment.ticker}</h4>
          {quantity > 0 && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono tabular-nums dark:bg-gray-800 dark:text-gray-200">
              {quantity} {quantity === 1 ? 'share' : 'shares'}
            </span>
          )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{investment.name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono tabular-nums">{formatDisplayCurrency(currentPrice)}</p>
          <div className={`flex items-center justify-end gap-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-semibold font-mono tabular-nums">
              {isPositive ? '+' : ''}{percentChange}%
            </span>
          </div>
        </div>
      </div>

      {totalValue !== null && (
        <div className="flex justify-between items-center py-2 mb-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-300">Total Value:</span>
          <span className="font-semibold font-mono tabular-nums">{formatDisplayCurrency(totalValue)}</span>
        </div>
      )}

      {totalGain !== null && (
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-600 dark:text-gray-300">Total Gain/Loss:</span>
          <span className={`font-semibold font-mono tabular-nums ${getChangeColorClass(totalGain)}`}>
            {formatDisplayCurrency(totalGain)}
          </span>
        </div>
      )}

      {nativePanel}

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#e2e8f0"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#e2e8f0"
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(value) => formatDisplayCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {investment.lastPriceUpdate && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
          Last updated: {new Date(investment.lastPriceUpdate).toLocaleString()}
        </p>
      )}
    </>
  );

  if (variant === 'standalone') {
    return <Card className="p-4">{chartContent}</Card>;
  }

  return (
    <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-white via-white to-amber-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/60 border-b border-gray-100 dark:border-gray-800">
      {chartContent}
    </div>
  );
}
