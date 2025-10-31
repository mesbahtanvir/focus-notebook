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
import { Rocket, Sparkles } from 'lucide-react';

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

      <div className="grid gap-6 px-4 md:px-0 lg:grid-cols-[1.75fr,1fr]">
        <Card className="p-6 border border-slate-200/80 bg-white/95 dark:bg-slate-900/80 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 dark:bg-slate-900/70 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10">
                      <Sparkles className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600/80">
                        Expected Annual Return
                      </p>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Adventure Dial
                      </h2>
                    </div>
                  </div>
                  <div className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {returnRate.toFixed(2)}%
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={15}
                    step={0.25}
                    value={returnRate}
                    onChange={(event) => setReturnRate(Number(event.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                    <span>Cautious</span>
                    <span>Balanced</span>
                    <span>Bold</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:bg-slate-900/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Portfolio</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(currentValue, currency)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Today&#39;s balance across tracked assets</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:bg-slate-900/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recurring Plan</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(baseAmount, currency)}{' '}
                    <span className="text-sm font-normal text-slate-500">/{baseFrequency}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {basePlanContext ? `Linked to ${basePlanContext.portfolioName}` : 'Set a plan to personalize projections'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:bg-slate-900/70">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                <Rocket className="w-5 h-5 text-indigo-500" />
                Base Plan Controls
              </h3>

              {planPortfolios.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Source Portfolio
                  </label>
                  <Select
                    value={selectedPlanPortfolioId ?? ''}
                    onChange={(event) => setSelectedPlanPortfolioId(event.target.value || null)}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white/90 text-left text-sm dark:border-slate-700 dark:bg-slate-950/60">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {planPortfolios.map(portfolio => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="">Custom plan (manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Recurring Amount</label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={baseAmount}
                    onChange={(event) => setBaseAmount(Math.max(0, Number(event.target.value)))}
                    className="h-11 rounded-xl border-slate-200 bg-white/90 text-base dark:border-slate-700 dark:bg-slate-950/60"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Frequency</label>
                  <Select
                    value={baseFrequency}
                    onChange={(event) => setBaseFrequency(event.target.value as RecurringFrequency)}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white/90 text-left text-sm dark:border-slate-700 dark:bg-slate-950/60">
                      <SelectValue placeholder="Select frequency" />
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

          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:bg-slate-900/70">
              <ResponsiveContainer width="100%" height={320}>
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
                      name={scenario.label}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {heroStats.map(stat => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-left shadow-sm dark:bg-slate-900/70"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{stat.value}</p>
                  <p className="text-xs text-slate-500">
                    {stat.delta >= 0 ? '+' : ''}
                    {stat.change} growth from today
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="flex h-full flex-col gap-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600/90">What-if Labs</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Hypothetical Boosts</h3>
            <p className="text-sm text-slate-500">
              Layer extra plans to understand how additional contributions reshape your horizon.
            </p>
          </div>
          <Button
            onClick={addScenario}
            className="h-11 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-600"
          >
            Add Scenario
          </Button>

          <div className="space-y-4">
            {scenarios.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white/80 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                No scenarios yet. Tap &quot;Add Scenario&quot; to design a boost plan.
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
                    className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:border-indigo-200 dark:bg-slate-900/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scenario #{index + 1}</p>
                        <h4 className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: scenario.color }} />
                          {scenario.label}
                        </h4>
                      </div>
                      <Switch
                        checked={scenario.isEnabled}
                        onCheckedChange={(checked) => updateScenario(scenario.id, { isEnabled: checked })}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Label</label>
                        <Input
                          value={scenario.label}
                          onChange={(event) => updateScenario(scenario.id, { label: event.target.value })}
                          className="h-11 rounded-xl border-slate-200 bg-white/90 text-sm dark:border-slate-700 dark:bg-slate-950/60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount</label>
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          value={scenario.amount}
                          onChange={(event) =>
                            updateScenario(scenario.id, { amount: Math.max(0, Number(event.target.value)) })
                          }
                          className="h-11 rounded-xl border-slate-200 bg-white/90 text-sm dark:border-slate-700 dark:bg-slate-950/60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Frequency</label>
                        <Select
                          value={scenario.frequency}
                          onChange={(event) =>
                            updateScenario(scenario.id, { frequency: event.target.value as RecurringFrequency })
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white/90 text-left text-sm dark:border-slate-700 dark:bg-slate-950/60">
                            <SelectValue placeholder="Select frequency" />
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
                      <div className="flex items-end justify-between gap-2">
                        <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {delta >= 0 ? '+' : ''}{formatCurrency(delta, currency)} at 15Y
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => removeScenario(scenario.id)}
                          className="h-10 rounded-xl border-slate-200 text-sm font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-300 dark:hover:bg-red-500/10"
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
  );
}
