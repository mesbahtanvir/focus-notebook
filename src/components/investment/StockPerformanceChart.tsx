'use client';

import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Investment, PricePoint } from '@/store/useInvestments';
import { getChangeColorClass } from '@/lib/services/stockApi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { convertCurrency, formatCurrency as formatCurrencyBase, normalizeCurrencyCode, SupportedCurrency } from '@/lib/utils/currency';
import { formatCurrency as formatCurrencyWithLocale } from '@/lib/currency';
import { CurrencyBadge } from '@/components/investment/CurrencyBadge';

interface StockPerformanceChartProps {
  investment: Investment;
  currency: SupportedCurrency;
}

export function StockPerformanceChart({ investment, currency }: StockPerformanceChartProps) {
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

  if (priceHistory.length < 2) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="font-semibold">{investment.ticker}</h4>
            <p className="text-sm text-gray-500">{investment.name}</p>
          </div>
          {investment.currentPricePerShare && (
            <div className="text-right">
              <p className="font-semibold">{formatCurrencyBase(currentPricePerShare ?? 0, currency)}</p>
              <p className="text-xs text-gray-500">per share</p>
            </div>
          )}
        </div>
        <div className="h-[150px] flex items-center justify-center text-gray-500 text-sm">
          Not enough price history to display chart
        </div>
      </Card>
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
  const quantity = investment.quantity ?? 0;
  const totalValue = quantity ? currentPrice * quantity : null;
  const totalGain = quantity ? priceChange * quantity : null;
  const nativeCurrency = investment.nativeCurrency;
  const nativeCurrentValue = investment.nativeCurrentValue;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold">{payload[0].payload.date}</p>
          <p className="text-sm text-gray-600">
            Price: {formatCurrencyBase(payload[0].value, currency)}
          </p>
          {investment.quantity && (
            <p className="text-xs text-gray-500 mt-1">
              Value: {formatCurrencyBase(investment.quantity * payload[0].value, currency)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Determine trend icon
  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendColor = isNeutral ? 'text-gray-600' : isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-lg">{investment.ticker}</h4>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {investment.quantity} {investment.quantity === 1 ? 'share' : 'shares'}
            </span>
          </div>
          <p className="text-sm text-gray-500">{investment.name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatCurrencyBase(currentPrice, currency)}</p>
          <div className={`flex items-center justify-end gap-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {isPositive ? '+' : ''}{percentChange}%
            </span>
          </div>
        </div>
      </div>

      {totalValue !== null && (
        <div className="flex justify-between items-center py-2 mb-3 border-t border-gray-100">
          <span className="text-sm text-gray-600">Total Value:</span>
          <span className="font-semibold">{formatCurrencyBase(totalValue, currency)}</span>
        </div>
      )}

      {totalGain !== null && (
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <span className="text-sm text-gray-600">Total Gain/Loss:</span>
          <span className={`font-semibold ${getChangeColorClass(totalGain)}`}>
            {isPositive ? '+' : ''}{formatCurrencyBase(totalGain, currency)}
          </span>
        </div>
      )}

      {nativeCurrency && typeof nativeCurrentValue === 'number' && (
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-sm dark:border-sky-800 dark:bg-sky-900/20">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyBadge code={nativeCurrency} tone="native" label="Native" />
            <span className="font-medium text-sky-900 dark:text-sky-100">Native valuation</span>
          </div>
          <div className="flex justify-between text-sky-900 dark:text-sky-100">
            <span>Current:</span>
            <span className="font-semibold">
              {formatCurrencyWithLocale(nativeCurrentValue, nativeCurrency, investment.locale || 'en-US')}
            </span>
          </div>
          {typeof investment.nativeInitialAmount === 'number' && (
            <div className="flex justify-between text-sky-900 dark:text-sky-100 mt-1">
              <span>Initial:</span>
              <span className="font-semibold">
                {formatCurrencyWithLocale(investment.nativeInitialAmount, nativeCurrency, investment.locale || 'en-US')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              stroke="#999"
              interval="preserveStartEnd"
            />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#999"
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={(value) => formatCurrencyBase(value, currency)}
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
        <p className="text-xs text-gray-400 mt-2 text-right">
          Last updated: {new Date(investment.lastPriceUpdate).toLocaleString()}
        </p>
      )}
    </Card>
  );
}
