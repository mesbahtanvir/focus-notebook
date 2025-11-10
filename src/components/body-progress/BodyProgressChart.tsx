/**
 * Body Progress Chart Component
 * Visualizations for body composition progress over time
 */

'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { useBodyProgress } from '@/store/useBodyProgress';

const COLORS = [
  '#3b82f6', // blue - lean mass
  '#ef4444', // red - fat mass
  '#10b981', // green - other
];

export default function BodyProgressChart() {
  const { scans } = useBodyProgress();

  // Get progress data in chronological order (oldest to newest)
  const progressData = useMemo(() => {
    return scans
      .map(scan => ({
        date: new Date(scan.scanDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        fullDate: scan.scanDate,
        weight: scan.weight,
        bodyFat: scan.bodyFatPercentage,
        leanMass: scan.leanMass,
        fatMass: scan.fatMass,
      }))
      .reverse(); // Oldest to newest for charts
  }, [scans]);

  // Latest scan composition breakdown
  const latestScan = scans.length > 0 ? scans[0] : null;
  const compositionData = useMemo(() => {
    if (!latestScan || !latestScan.leanMass || !latestScan.fatMass) return [];

    return [
      { name: 'Lean Mass', value: Math.round(latestScan.leanMass), color: COLORS[0] },
      { name: 'Fat Mass', value: Math.round(latestScan.fatMass), color: COLORS[1] },
    ];
  }, [latestScan]);

  // Regional breakdown (if available)
  const regionalData = useMemo(() => {
    if (!latestScan || !latestScan.regions) return [];

    const regions = latestScan.regions;
    const data: Array<{ region: string; lean: number; fat: number }> = [];

    if (regions.trunk) {
      data.push({ region: 'Trunk', lean: regions.trunk.lean, fat: regions.trunk.fat });
    }
    if (regions.arms) {
      data.push({ region: 'Arms', lean: regions.arms.lean, fat: regions.arms.fat });
    }
    if (regions.legs) {
      data.push({ region: 'Legs', lean: regions.legs.lean, fat: regions.legs.fat });
    }

    return data;
  }, [latestScan]);

  if (scans.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 dark:text-gray-400">
        No scan data available. Upload your first Dexa scan to see progress charts.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Weight & Body Fat % Over Time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Weight & Body Fat Progress
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              label={{ value: 'Body Fat %', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="weight"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Weight"
              dot={{ fill: '#3b82f6' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bodyFat"
              stroke="#ef4444"
              strokeWidth={2}
              name="Body Fat %"
              dot={{ fill: '#ef4444' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Lean Mass vs Fat Mass Over Time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Body Composition Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              label={{ value: 'Mass (lbs)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="leanMass"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Lean Mass"
              dot={{ fill: '#3b82f6' }}
            />
            <Line
              type="monotone"
              dataKey="fatMass"
              stroke="#ef4444"
              strokeWidth={2}
              name="Fat Mass"
              dot={{ fill: '#ef4444' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Composition Breakdown */}
        {compositionData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Latest Body Composition
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} lbs (${(percent * 100).toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Regional Breakdown */}
        {regionalData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Regional Body Composition
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={regionalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="region"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Mass (lbs)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="lean" fill="#3b82f6" name="Lean Mass" />
                <Bar dataKey="fat" fill="#ef4444" name="Fat Mass" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {latestScan && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {latestScan.weight && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Weight</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {latestScan.weight.toFixed(1)} lbs
              </div>
            </div>
          )}
          {latestScan.bodyFatPercentage && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Body Fat</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {latestScan.bodyFatPercentage.toFixed(1)}%
              </div>
            </div>
          )}
          {latestScan.leanMass && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Lean Mass</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {latestScan.leanMass.toFixed(1)} lbs
              </div>
            </div>
          )}
          {latestScan.fatMass && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Fat Mass</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {latestScan.fatMass.toFixed(1)} lbs
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
