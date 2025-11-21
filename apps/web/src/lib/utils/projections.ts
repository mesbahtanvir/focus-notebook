import type { RecurringFrequency } from '@/store/useInvestments';

export interface ProjectionContribution {
  amount: number;
  frequency: RecurringFrequency;
  startMonth?: number;
  endMonth?: number;
}

export interface ProjectionInput {
  currentValue: number;
  annualReturnRate: number;
  months: number;
  contributions: ProjectionContribution[];
}

export interface ProjectionPoint {
  month: number;
  totalValue: number;
  principalValue: number;
  contributionsValue: number;
  totalContributions: number;
  growthValue: number;
}

const MONTHS_PER_YEAR = 12;

export const frequencyToMonthlyMultiplier = (frequency: RecurringFrequency): number => {
  switch (frequency) {
    case 'weekly':
      return 52 / MONTHS_PER_YEAR;
    case 'biweekly':
      return 26 / MONTHS_PER_YEAR;
    case 'quarterly':
      return 4 / MONTHS_PER_YEAR;
    case 'annually':
      return 1 / MONTHS_PER_YEAR;
    case 'monthly':
    default:
      return 1;
  }
};

export const generateProjectionSeries = ({
  currentValue,
  annualReturnRate,
  months,
  contributions,
}: ProjectionInput): ProjectionPoint[] => {
  const validMonths = Math.max(0, Math.trunc(months));
  const principalAmount = Math.max(0, currentValue);

  const monthlyRate = Number.isFinite(annualReturnRate) ? annualReturnRate / MONTHS_PER_YEAR : 0;
  const growthFactor = 1 + monthlyRate;

  let principalValue = principalAmount;
  let contributionsValue = 0;
  let totalContributions = 0;

  const points: ProjectionPoint[] = [
    {
      month: 0,
      totalValue: principalValue + contributionsValue,
      principalValue,
      contributionsValue,
      totalContributions,
      growthValue: 0,
    },
  ];

  for (let monthIndex = 1; monthIndex <= validMonths; monthIndex += 1) {
    if (monthlyRate !== 0) {
      principalValue *= growthFactor;
      contributionsValue *= growthFactor;
    }

    const monthlyContribution = contributions.reduce((sum, contribution) => {
      if (!contribution || !Number.isFinite(contribution.amount)) {
        return sum;
      }

      const start = Math.max(1, contribution.startMonth ?? 1);
      const end = contribution.endMonth ?? Number.POSITIVE_INFINITY;

      if (monthIndex < start || monthIndex > end) {
        return sum;
      }

      const multiplier = frequencyToMonthlyMultiplier(contribution.frequency);
      const contributionAmount = contribution.amount * multiplier;
      return sum + Math.max(0, contributionAmount);
    }, 0);

    if (monthlyContribution > 0) {
      contributionsValue += monthlyContribution;
      totalContributions += monthlyContribution;
    }

    const totalValue = principalValue + contributionsValue;
    const growthValue = totalValue - principalAmount - totalContributions;

    points.push({
      month: monthIndex,
      totalValue,
      principalValue,
      contributionsValue,
      totalContributions,
      growthValue,
    });
  }

  return points;
};

export const getProjectionPointAtYear = (
  series: ProjectionPoint[],
  years: number
): ProjectionPoint | undefined => {
  if (!Array.isArray(series) || series.length === 0) {
    return undefined;
  }

  const monthIndex = Math.max(0, Math.round(years * MONTHS_PER_YEAR));
  return (
    series.find(point => point.month === monthIndex) ??
    series.at(-1)
  );
};
