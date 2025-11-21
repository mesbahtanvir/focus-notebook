import {
  frequencyToMonthlyMultiplier,
  generateProjectionSeries,
  getProjectionPointAtYear,
  ProjectionInput,
  ProjectionContribution,
} from '@/lib/utils/projections';

describe('projections utilities', () => {
  describe('frequencyToMonthlyMultiplier', () => {
    it('should return 1 for monthly frequency', () => {
      expect(frequencyToMonthlyMultiplier('monthly')).toBe(1);
    });

    it('should return ~4.33 for weekly frequency', () => {
      const result = frequencyToMonthlyMultiplier('weekly');
      expect(result).toBeCloseTo(52 / 12, 2);
    });

    it('should return ~2.17 for biweekly frequency', () => {
      const result = frequencyToMonthlyMultiplier('biweekly');
      expect(result).toBeCloseTo(26 / 12, 2);
    });

    it('should return ~0.33 for quarterly frequency', () => {
      const result = frequencyToMonthlyMultiplier('quarterly');
      expect(result).toBeCloseTo(4 / 12, 2);
    });

    it('should return ~0.083 for annually frequency', () => {
      const result = frequencyToMonthlyMultiplier('annually');
      expect(result).toBeCloseTo(1 / 12, 3);
    });
  });

  describe('generateProjectionSeries', () => {
    it('should generate projection with no contributions', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 12,
        contributions: [],
      };

      const result = generateProjectionSeries(input);

      expect(result).toHaveLength(13); // Month 0 + 12 months
      expect(result[0].month).toBe(0);
      expect(result[0].totalValue).toBe(10000);
      expect(result[12].month).toBe(12);
      expect(result[12].totalValue).toBeGreaterThan(10000);
    });

    it('should generate projection with monthly contributions', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 12,
        contributions: [
          {
            amount: 100,
            frequency: 'monthly',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      expect(result[1].totalContributions).toBe(100);
      expect(result[12].totalContributions).toBe(1200); // 12 months * 100
    });

    it('should handle zero annual return rate', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: 100,
            frequency: 'monthly',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      // With 0% return, total = principal + contributions
      expect(result[12].totalValue).toBe(10000 + 1200);
      expect(result[12].growthValue).toBe(0);
    });

    it('should handle negative values gracefully', () => {
      const input: ProjectionInput = {
        currentValue: -5000,
        annualReturnRate: 0.08,
        months: 12,
        contributions: [],
      };

      const result = generateProjectionSeries(input);

      // Negative currentValue should be treated as 0
      expect(result[0].principalValue).toBe(0);
    });

    it('should handle invalid months', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: -5,
        contributions: [],
      };

      const result = generateProjectionSeries(input);

      // Should only have month 0
      expect(result).toHaveLength(1);
      expect(result[0].month).toBe(0);
    });

    it('should calculate growth value correctly', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0.12, // 12% annual = 1% monthly
        months: 12,
        contributions: [],
      };

      const result = generateProjectionSeries(input);

      const finalPoint = result[12];
      expect(finalPoint.growthValue).toBeGreaterThan(0);
      expect(finalPoint.growthValue).toBe(
        finalPoint.totalValue - 10000 - finalPoint.totalContributions
      );
    });

    it('should track principal value separately from contributions', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 12,
        contributions: [
          {
            amount: 500,
            frequency: 'monthly',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      const finalPoint = result[12];
      expect(finalPoint.principalValue).toBeGreaterThan(10000); // Grown from interest
      expect(finalPoint.contributionsValue).toBeGreaterThan(6000); // 12*500 + interest
      expect(finalPoint.totalValue).toBe(
        finalPoint.principalValue + finalPoint.contributionsValue
      );
    });

    it('should respect contribution start month', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: 100,
            frequency: 'monthly',
            startMonth: 6,
          },
        ],
      };

      const result = generateProjectionSeries(input);

      // No contributions in month 5
      expect(result[5].totalContributions).toBe(0);

      // Contributions start at month 6
      expect(result[6].totalContributions).toBe(100);

      // By month 12, should have 7 contributions (months 6-12)
      expect(result[12].totalContributions).toBe(700);
    });

    it('should respect contribution end month', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: 100,
            frequency: 'monthly',
            endMonth: 6,
          },
        ],
      };

      const result = generateProjectionSeries(input);

      // Should have 6 contributions (months 1-6)
      expect(result[6].totalContributions).toBe(600);

      // No additional contributions after month 6
      expect(result[12].totalContributions).toBe(600);
    });

    it('should handle weekly contributions', () => {
      const input: ProjectionInput = {
        currentValue: 0,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: 100,
            frequency: 'weekly',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      const weeklyMultiplier = 52 / 12;
      expect(result[1].totalContributions).toBeCloseTo(100 * weeklyMultiplier, 1);
      expect(result[12].totalContributions).toBeCloseTo(100 * weeklyMultiplier * 12, 1);
    });

    it('should handle quarterly contributions', () => {
      const input: ProjectionInput = {
        currentValue: 0,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: 1200,
            frequency: 'quarterly',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      const quarterlyMultiplier = 4 / 12;
      expect(result[12].totalContributions).toBeCloseTo(1200 * quarterlyMultiplier * 12, 1);
    });

    it('should handle annually contributions', () => {
      const input: ProjectionInput = {
        currentValue: 0,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: 12000,
            frequency: 'annually',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      const annualMultiplier = 1 / 12;
      expect(result[12].totalContributions).toBeCloseTo(12000 * annualMultiplier * 12, 1);
    });

    it('should handle multiple contributions', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: 100,
            frequency: 'monthly',
          },
          {
            amount: 200,
            frequency: 'monthly',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      expect(result[12].totalContributions).toBe(3600); // (100 + 200) * 12
    });

    it('should handle infinite rate gracefully', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: Infinity,
        months: 12,
        contributions: [],
      };

      const result = generateProjectionSeries(input);

      // With infinite rate, should fall back to 0 rate
      expect(result[12].totalValue).toBe(10000);
    });

    it('should handle NaN contribution amounts', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: NaN,
            frequency: 'monthly',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      // NaN contributions should be ignored
      expect(result[12].totalContributions).toBe(0);
    });

    it('should handle negative contribution amounts', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0,
        months: 12,
        contributions: [
          {
            amount: -100,
            frequency: 'monthly',
          },
        ],
      };

      const result = generateProjectionSeries(input);

      // Negative contributions should be treated as 0
      expect(result[12].totalContributions).toBe(0);
    });

    it('should handle fractional months', () => {
      const input: ProjectionInput = {
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 12.7,
        contributions: [],
      };

      const result = generateProjectionSeries(input);

      // Should truncate to 12 months
      expect(result).toHaveLength(13);
      expect(result[result.length - 1].month).toBe(12);
    });
  });

  describe('getProjectionPointAtYear', () => {
    it('should return point at exact year', () => {
      const series = generateProjectionSeries({
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 24,
        contributions: [],
      });

      const pointAt1Year = getProjectionPointAtYear(series, 1);

      expect(pointAt1Year?.month).toBe(12);
    });

    it('should return point at year 0', () => {
      const series = generateProjectionSeries({
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 24,
        contributions: [],
      });

      const pointAtStart = getProjectionPointAtYear(series, 0);

      expect(pointAtStart?.month).toBe(0);
      expect(pointAtStart?.totalValue).toBe(10000);
    });

    it('should return last point if year exceeds series', () => {
      const series = generateProjectionSeries({
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 12,
        contributions: [],
      });

      const pointBeyond = getProjectionPointAtYear(series, 5);

      expect(pointBeyond?.month).toBe(12);
    });

    it('should return undefined for empty series', () => {
      const result = getProjectionPointAtYear([], 1);

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-array input', () => {
      const result = getProjectionPointAtYear(null as any, 1);

      expect(result).toBeUndefined();
    });

    it('should handle negative years', () => {
      const series = generateProjectionSeries({
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 24,
        contributions: [],
      });

      const point = getProjectionPointAtYear(series, -1);

      // Negative year should be treated as 0
      expect(point?.month).toBe(0);
    });

    it('should round fractional years to nearest month', () => {
      const series = generateProjectionSeries({
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 24,
        contributions: [],
      });

      const point = getProjectionPointAtYear(series, 1.5);

      // 1.5 years = 18 months
      expect(point?.month).toBe(18);
    });

    it('should find closest available point if exact month not found', () => {
      const series = generateProjectionSeries({
        currentValue: 10000,
        annualReturnRate: 0.08,
        months: 10,
        contributions: [],
      });

      const point = getProjectionPointAtYear(series, 2);

      // 2 years = 24 months, but series only goes to 10
      expect(point?.month).toBe(10);
    });
  });
});
