'use client';

import { useEffect, useMemo, useState } from 'react';
import { ToolHeader } from '@/components/tools/ToolHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCurrency } from '@/store/useCurrency';
import { RecurringFrequency, useInvestments } from '@/store/useInvestments';
import {
  formatCurrency,
  convertCurrency,
  normalizeCurrencyCode,
  type SupportedCurrency,
} from '@/lib/utils/currency';
import {
  generateProjectionSeries,
  getProjectionPointAtYear,
  ProjectionContribution,
} from '@/lib/utils/projections';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Rocket, Sparkles, Star } from 'lucide-react';

interface AssetHorizonPanelProps {
  focusPortfolioId?: string | null;
  showHeader?: boolean;
}

interface BasePlanContext {
  portfolioId: string;
  portfolioName: string;
  amount: number;
  frequency: RecurringFrequency;
  expectedAnnualReturn?: number;
  currency: SupportedCurrency;
}

interface Scenario {
  id: string;
  label: string;
  amount: number;
  frequency: RecurringFrequency;
  isEnabled: boolean;
  color: string;
}

const colorPalette = ['#6366f1', '#f97316', '#ec4899', '#22c55e', '#8b5cf6', '#14b8a6'];
const horizons = [5, 10, 15] as const;

const createScenarioId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `scenario-${Math.random().toString(36).slice(2, 11)}`;

const formatLargeCurrency = (value: number, currency: SupportedCurrency) => {
  if (!Number.isFinite(value)) {
    return '--';
  }
  if (value >= 1_000_000) {
    return `${formatCurrency(value / 1_000_000, currency)}`
      .replace(/\.00/, '') + 'M';
  }
  return formatCurrency(value, currency);
};

export function AssetHorizonPanel({ focusPortfolioId, showHeader = true }: AssetHorizonPanelProps) {
  const { currency } = useCurrency();
  const { portfolios, getAllPortfoliosValue } = useInvestments();

  const planPortfolios = useMemo(
    () => portfolios.filter(portfolio => portfolio.recurringPlan),
    [portfolios]
  );

  const [selectedPlanPortfolioId, setSelectedPlanPortfolioId] = useState<string | null>(null);
  const [returnRate, setReturnRate] = useState(6);
  const [baseAmount, setBaseAmount] = useState(1000);
  const [baseFrequency, setBaseFrequency] = useState<RecurringFrequency>('monthly');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    if (focusPortfolioId) {
      setSelectedPlanPortfolioId(focusPortfolioId);
    } else if (!selectedPlanPortfolioId && planPortfolios.length > 0) {
      setSelectedPlanPortfolioId(planPortfolios[0].id);
    }
  }, [focusPortfolioId, planPortfolios, selectedPlanPortfolioId]);

  const basePlanContext = useMemo<BasePlanContext | null>(() => {
    if (planPortfolios.length === 0) {
      return null;
    }

    const targetPortfolio =
      (selectedPlanPortfolioId &&
        planPortfolios.find(portfolio => portfolio.id === selectedPlanPortfolioId && portfolio.recurringPlan)) ||
      planPortfolios[0];

    if (!targetPortfolio?.recurringPlan) {
      return null;
    }

    const plan = targetPortfolio.recurringPlan;
    const planCurrency = normalizeCurrencyCode(
      plan.currency ?? targetPortfolio.baseCurrency ?? currency
    );
    const amountInDisplay = convertCurrency(plan.amount, planCurrency, currency);

    return {
      portfolioId: targetPortfolio.id,
      portfolioName: targetPortfolio.name,
      amount: amountInDisplay,
      frequency: plan.frequency,
      expectedAnnualReturn: plan.expectedAnnualReturn,
      currency: planCurrency,
    };
  }, [planPortfolios, selectedPlanPortfolioId, currency]);

  useEffect(() => {
    if (!basePlanContext) {
      return;
    }

    setBaseAmount(Number(basePlanContext.amount.toFixed(2)));
    setBaseFrequency(basePlanContext.frequency);

    if (
      basePlanContext.expectedAnnualReturn !== undefined &&
      Number.isFinite(basePlanContext.expectedAnnualReturn)
    ) {
      setReturnRate(basePlanContext.expectedAnnualReturn);
    }
  }, [basePlanContext]);

  const currentValue = useMemo(() => {
    return getAllPortfoliosValue(currency);
  }, [getAllPortfoliosValue, currency]);

  const annualReturnRate = Math.max(0, returnRate) / 100;
  const months = horizons[horizons.length - 1] * 12;

  const baseContributions = useMemo<ProjectionContribution[]>(() => {
    if (baseAmount > 0) {
      return [{ amount: baseAmount, frequency: baseFrequency }];
    }
    return [];
  }, [baseAmount, baseFrequency]);

  const baseSeries = useMemo(
    () =>
      generateProjectionSeries({
        currentValue,
        annualReturnRate,
        months,
        contributions: baseContributions,
      }),
    [currentValue, annualReturnRate, months, baseContributions]
  );

  const scenarioSeries = useMemo(() => {
    return scenarios
      .filter(scenario => scenario.isEnabled && scenario.amount > 0)
      .map(scenario => ({
        scenario,
        series: generateProjectionSeries({
          currentValue,
          annualReturnRate,
          months,
          contributions: [
            ...baseContributions,
            { amount: scenario.amount, frequency: scenario.frequency },
          ],
        }),
      }));
  }, [scenarios, currentValue, annualReturnRate, months, baseContributions]);

  const chartData = useMemo(() => {
    const years = Array.from({ length: horizons[horizons.length - 1] + 1 }, (_, index) => index);

    return years.map(year => {
      const monthIndex = Math.min(year * 12, baseSeries.length - 1);
      const dataPoint: Record<string, number | string> = {
        yearLabel: year === 0 ? 'Now' : `${year} yr`,
        base: baseSeries[monthIndex]?.totalValue ?? 0,
      };

      scenarioSeries.forEach(({ scenario, series }) => {
        const scenarioPoint = series[Math.min(monthIndex, series.length - 1)];
        dataPoint[scenario.id] = scenarioPoint?.totalValue ?? 0;
      });

      return dataPoint;
    });
  }, [baseSeries, scenarioSeries]);

  const heroStats = useMemo(() => {
    return horizons.map(years => {
      const projection = getProjectionPointAtYear(baseSeries, years);
      const value = projection ? projection.totalValue : currentValue;
      const delta = value - currentValue;

      return {
        label: `${years} Yr Horizon`,
        value: formatCurrency(value, currency),
        change: formatCurrency(delta, currency),
        delta,
      };
    });
  }, [baseSeries, currentValue, currency]);

  const addScenario = () => {
    const nextIndex = scenarios.length % colorPalette.length;
    setScenarios([
      ...scenarios,
      {
        id: createScenarioId(),
        label: `Boost ${scenarios.length + 1}`,
        amount: 250,
        frequency: 'monthly',
        isEnabled: true,
        color: colorPalette[nextIndex],
      },
    ]);
  };

  const updateScenario = (id: string, updates: Partial<Scenario>) => {
    setScenarios(prev =>
      prev.map(scenario =>
        scenario.id === id ? { ...scenario, ...updates } : scenario
      )
    );
  };

  const removeScenario = (id: string) => {
    setScenarios(prev => prev.filter(scenario => scenario.id !== id));
  };

  return (
    <div className="space-y-6 pb-16">
      {showHeader && (
        <ToolHeader
          title="Asset Horizon"
          emoji="🌅"
          subtitle="Dial in your future value with playful projections and adventurous scenarios."
          gradientFrom="from-orange-50 via-amber-50 to-rose-50"
          borderColor="border-orange-200"
          textGradient="from-orange-600 via-pink-600 to-fuchsia-600"
          stats={heroStats.map(stat => ({
            label: stat.label,
            value: stat.value,
            variant: 'info',
          }))}
        />
      )}

      {!showHeader && (
        <div className="rounded-xl bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 border-4 border-orange-200 p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-orange-700 flex items-center gap-2">
                <span role="img" aria-label="sunrise">🌅</span> Asset Horizon
              </h2>
              <p className="text-sm text-orange-700/80">
                Explore projected growth with recurring contributions and playful scenarios.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
              {heroStats.map(stat => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-orange-100 bg-white/80 px-3 py-2 text-sm text-orange-700"
                >
                  <p className="font-semibold">{stat.value}</p>
                  <p className="text-xs uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 px-4 md:px-0 lg:grid-cols-[2fr,1fr]">
        <Card className="p-6 bg-gradient-to-br from-white via-purple-50/40 to-blue-50/40 border-4 border-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/80">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-200">
                  <Sparkles className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-indigo-600">Adventure Dial</p>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Expected Annual Return
                  </h2>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.25}
                  value={returnRate}
                  onChange={(event) => setReturnRate(Number(event.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Cautious</span>
                  <span className="font-semibold text-indigo-600">{returnRate.toFixed(2)}%</span>
                  <span>Bold</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-md">
                  <p className="text-xs uppercase tracking-wide text-indigo-600">Current Portfolio</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(currentValue, currency)}
                  </p>
                  <p className="text-sm text-gray-500">Today&#39;s balance across all tracked assets</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-md">
                  <p className="text-xs uppercase tracking-wide text-rose-600">Recurring Plan</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(baseAmount, currency)} <span className="text-sm text-gray-500">/{baseFrequency}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {basePlanContext ? `Linked to ${basePlanContext.portfolioName}` : 'Set a plan to personalize projections'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-3xl bg-white/75 dark:bg-slate-900/80 border-2 border-indigo-100 p-5 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-indigo-500" />
                Base Plan Controls
              </h3>

              {planPortfolios.length > 0 && (
                <div className="mt-4">
                  <label className="text-xs uppercase tracking-wide text-gray-500">
                    Source Portfolio
                  </label>
                  <Select
                    value={selectedPlanPortfolioId ?? ''}
                    onChange={(event) => setSelectedPlanPortfolioId(event.target.value || null)}
                    className="mt-2"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planPortfolios.map(portfolio => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="">
                        Custom plan (manual)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500">Recurring Amount</label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={baseAmount}
                    onChange={(event) => setBaseAmount(Math.max(0, Number(event.target.value)))}
                    className="mt-2 bg-white/90 dark:bg-slate-950/40 border-indigo-200"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500">Frequency</label>
                  <Select
                    value={baseFrequency}
                    onChange={(event) => setBaseFrequency(event.target.value as RecurringFrequency)}
                    className="mt-2"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="yearLabel" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  tickFormatter={(value) => formatLargeCurrency(value as number, currency)}
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, currency)}
                  labelClassName="text-sm font-semibold text-indigo-600"
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="base"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  name="Base Plan"
                />
                {scenarioSeries.map(({ scenario }) => (
                  <Line
                    key={scenario.id}
                    type="monotone"
                    dataKey={scenario.id}
                    stroke={scenario.color}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="6 6"
                    name={scenario.label}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 border-4 border-rose-100 bg-gradient-to-br from-white via-rose-50/40 to-orange-50/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-200">
                <Star className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-rose-600">Highlights</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Milestone Snapshots
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {heroStats.map(stat => (
                <div key={stat.label} className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-100 p-4">
                  <p className="text-xs uppercase tracking-wide text-rose-600">{stat.label}</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">{stat.value}</p>
                  <p className="text-xs text-gray-500">
                    {stat.delta >= 0 ? '+' : ''}
                    {stat.change} growth from today
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border-4 border-indigo-100 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-600">What-if Labs</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hypothetical Boosts</h3>
                <p className="text-sm text-gray-600">
                  Layer extra plans to see how your horizon transforms.
                </p>
              </div>
              <Button onClick={addScenario} className="bg-indigo-500 hover:bg-indigo-600 text-white">
                Add Scenario
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {scenarios.length === 0 ? (
                <div className="rounded-2xl border border-indigo-100 bg-white/70 dark:bg-slate-900/60 p-5 text-sm text-gray-600">
                  No scenarios yet. Tap &ldquo;Add Scenario&rdquo; to design a boost plan.
                </div>
              ) : (
                scenarios.map((scenario, index) => {
                  const scenarioData = scenarioSeries.find(entry => entry.scenario.id === scenario.id);
                  const base15 = getProjectionPointAtYear(baseSeries, 15)?.totalValue ?? currentValue;
                  const scenario15 = scenarioData
                    ? getProjectionPointAtYear(scenarioData.series, 15)?.totalValue ?? base15
                    : base15;
                  const delta = scenario15 - base15;

                  return (
                    <div
                      key={scenario.id}
                      className="rounded-3xl border-2 border-indigo-100 bg-white/80 dark:bg-slate-900/70 p-5 shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">Scenario #{index + 1}</p>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: scenario.color }} />
                            {scenario.label}
                          </h4>
                        </div>
                        <Switch
                          checked={scenario.isEnabled}
                          onCheckedChange={(checked) => updateScenario(scenario.id, { isEnabled: checked })}
                        />
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs uppercase tracking-wide text-gray-500">Label</label>
                          <Input
                            value={scenario.label}
                            onChange={(event) => updateScenario(scenario.id, { label: event.target.value })}
                            className="mt-1 bg-white/90 dark:bg-slate-950/40"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wide text-gray-500">Amount</label>
                          <Input
                            type="number"
                            min={0}
                            step={50}
                            value={scenario.amount}
                            onChange={(event) =>
                              updateScenario(scenario.id, { amount: Math.max(0, Number(event.target.value)) })
                            }
                            className="mt-1 bg-white/90 dark:bg-slate-950/40"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wide text-gray-500">Frequency</label>
                          <Select
                            value={scenario.frequency}
                            onChange={(event) =>
                              updateScenario(scenario.id, { frequency: event.target.value as RecurringFrequency })
                            }
                            className="mt-1"
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="self-end flex justify-end gap-2">
                          <div className="rounded-2xl bg-indigo-50 text-indigo-600 px-3 py-2 text-sm font-medium">
                            {delta >= 0 ? '+' : ''}{formatCurrency(delta, currency)} at 15Y
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => removeScenario(scenario.id)}
                            className="border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
