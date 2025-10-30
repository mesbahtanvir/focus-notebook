'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Portfolio, PortfolioSnapshot } from '@/store/useInvestments';
import { BASE_CURRENCY, convertCurrency, formatCurrency, normalizeCurrencyCode, SupportedCurrency } from '@/lib/utils/currency';

interface PortfolioValueChartProps {
  portfolio: Portfolio;
  snapshots?: PortfolioSnapshot[];
  predictions?: Array<{ date: string; predictedPrice: number }>;
  showPredictions?: boolean;
  currency: SupportedCurrency;
}

export function PortfolioValueChart({
  portfolio,
  snapshots = [],
  predictions = [],
  showPredictions = false,
  currency
}: PortfolioValueChartProps) {
  const toDisplay = (value: number) => convertCurrency(value, BASE_CURRENCY, currency);

  // Define chart data type
  type ChartDataPoint = {
    date: string;
    value?: number;
    predicted?: number;
    type: 'historical' | 'current' | 'transition' | 'predicted';
  };

  // Combine historical snapshots with current value
  const historicalData: ChartDataPoint[] = snapshots.map(snapshot => {
    const snapshotCurrency = normalizeCurrencyCode(snapshot.currency || BASE_CURRENCY);
    return {
      date: new Date(snapshot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: convertCurrency(snapshot.totalValue, snapshotCurrency, currency),
      type: 'historical' as const,
    };
  });

  // Add current value
  const currentValueBase = portfolio.investments.reduce((sum, inv) => {
    if (!Number.isFinite(inv.currentValue)) {
      return sum;
    }
    const investmentCurrency = normalizeCurrencyCode(inv.currency);
    return sum + convertCurrency(inv.currentValue, investmentCurrency, BASE_CURRENCY);
  }, 0);
  const currentValue = toDisplay(currentValueBase);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const currentData: ChartDataPoint = {
    date: today,
    value: currentValue,
    type: 'current' as const
  };

  // Format predictions data
  const predictedData: ChartDataPoint[] = showPredictions ? predictions.map(pred => ({
    date: new Date(pred.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    predicted: toDisplay(pred.predictedPrice),
    type: 'predicted' as const
  })) : [];

  // Merge all data
  const chartData: ChartDataPoint[] = [...historicalData, currentData];

  // If we have predictions, add them to the chart
  if (showPredictions && predictedData.length > 0) {
    // Connect current value to first prediction
    const firstPrediction = predictedData[0];
    chartData.push({
      date: firstPrediction.date,
      value: currentValue,
      predicted: firstPrediction.predicted,
      type: 'transition' as const
    });

    // Add remaining predictions
    predictedData.slice(1).forEach(pred => {
      chartData.push({
        date: pred.date,
        predicted: pred.predicted,
        type: 'predicted' as const
      });
    });
  }

  // Calculate statistics
  const firstValue = historicalData[0]?.value || currentValue;
  const valueChange = currentValue - firstValue;
  const percentChange = firstValue > 0 ? ((valueChange / firstValue) * 100).toFixed(2) : '0.00';
  const isPositive = valueChange >= 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold">{payload[0].payload.date}</p>
          {payload[0].payload.value !== undefined && (
            <p className="text-sm text-green-600">
              Value: {formatCurrency(payload[0].payload.value, currency)}
            </p>
          )}
          {payload[0].payload.predicted !== undefined && (
            <p className="text-sm text-blue-600">
              Predicted: {formatCurrency(payload[0].payload.predicted, currency)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length < 2 && !showPredictions) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Value Over Time</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="mb-2">Not enough data to display chart</p>
            <p className="text-sm">Create daily snapshots to track portfolio value over time</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Value Over Time</h3>
          <p className="text-sm text-gray-500 mt-1">
            Current: {formatCurrency(currentValue, currency)}
          </p>
        </div>
        {historicalData.length > 0 && (
          <div className="text-right">
            <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{percentChange}%
            </p>
            <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{formatCurrency(valueChange, currency)}
            </p>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#888"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#888"
            tickFormatter={(value) => formatCurrency(value, currency)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            name="Actual Value"
            connectNulls
          />
          {showPredictions && (
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#6366f1', r: 4 }}
              name="Predicted Value"
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {showPredictions && predictions.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            <strong>Disclaimer:</strong> Predictions are for informational purposes only and should not be considered financial advice.
            Past performance does not guarantee future results.
          </p>
        </div>
      )}
    </Card>
  );
}
