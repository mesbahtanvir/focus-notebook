import { act } from '@testing-library/react';
import type { Portfolio } from '@/store/useInvestments';

jest.mock('@/lib/data/gateway', () => ({
  createAt: jest.fn(),
  updateAt: jest.fn().mockResolvedValue(undefined),
  deleteAt: jest.fn(),
}));

jest.mock('@/lib/data/subscribe', () => ({
  subscribeCol: jest.fn(),
}));

jest.mock('@/lib/firebaseClient', () => ({
  auth: { currentUser: null },
  db: {},
}));

jest.mock('@/lib/services/currency', () => {
  const actual = jest.requireActual('@/lib/services/currency');
  return {
    ...actual,
    convertCurrency: jest.fn(
      async (amount: number, from: string, to: string) =>
        actual.convertCurrencySync(amount, from, to)
    ),
    convertAmountsToCurrency: jest.fn(
      async (
        amounts: Array<{ amount: number; currency: string }>,
        target: string
      ) =>
        amounts.map(item => actual.convertCurrencySync(item.amount, item.currency, target))
    ),
  };
});

import { updateAt } from '@/lib/data/gateway';
import { convertCurrency, convertAmountsToCurrency } from '@/lib/services/currency';
import { BASE_CURRENCY } from '@/lib/utils/currency';
import { useInvestments } from '@/store/useInvestments';

const updateAtMock = jest.mocked(updateAt);
const convertCurrencyMock = jest.mocked(convertCurrency);
const convertAmountsToCurrencyMock = jest.mocked(convertAmountsToCurrency);
const randomUUIDMock = jest.fn(() => 'test-uuid');

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: randomUUIDMock },
    configurable: true,
  });
} else {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: randomUUIDMock,
    configurable: true,
    writable: true,
  });
}

describe('useInvestments store', () => {
  const resetStore = () => {
    useInvestments.setState({
      portfolios: [],
      isLoading: false,
      fromCache: false,
      hasPendingWrites: false,
      unsubscribe: null,
      currentUserId: null,
    });
  };

  const createPortfolio = (overrides: Partial<Portfolio> = {}): Portfolio => ({
    id: 'portfolio-1',
    name: 'Test Portfolio',
    status: 'active',
    investments: [],
    createdAt: new Date().toISOString(),
    baseCurrency: BASE_CURRENCY,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    randomUUIDMock.mockClear();
    resetStore();
  });

  it('returns zero metrics for unknown portfolios', () => {
    const state = useInvestments.getState();
    expect(state.getTotalPortfolioValue('missing')).toBe(0);
    expect(state.getTotalInvested('missing')).toBe(0);
    expect(state.getPortfolioROI('missing')).toBe(0);
  });

  it('aggregates portfolio value across mixed currencies', () => {
    const portfolio = createPortfolio({
      investments: [
        {
          id: 'inv-usd',
          portfolioId: 'portfolio-1',
          name: 'US Holding',
          type: 'stocks',
          assetType: 'stock',
          initialAmount: 80,
          currentValue: 100,
          contributions: [],
          createdAt: new Date().toISOString(),
          currency: 'USD',
        },
        {
          id: 'inv-cad',
          portfolioId: 'portfolio-1',
          name: 'CA Holding',
          type: 'stocks',
          assetType: 'manual',
          initialAmount: 100,
          currentValue: 100,
          contributions: [],
          createdAt: new Date().toISOString(),
          currency: 'CAD',
        },
      ],
    });

    useInvestments.setState({ portfolios: [portfolio] });
    const state = useInvestments.getState();

    expect(state.getTotalPortfolioValue('portfolio-1', 'USD')).toBeCloseTo(174);
    expect(state.getTotalPortfolioValue('portfolio-1', 'CAD')).toBeCloseTo(235.135, 3);
  });

  it('computes invested totals using contribution history', () => {
    const now = new Date().toISOString();
    const portfolio = createPortfolio({
      investments: [
        {
          id: 'inv-usd',
          portfolioId: 'portfolio-1',
          name: 'US Holding',
          type: 'stocks',
          assetType: 'stock',
          initialAmount: 50,
          currentValue: 75,
          contributions: [
            {
              id: 'deposit-usd',
              date: now,
              amount: 25,
              type: 'deposit',
              createdAt: now,
              currency: 'USD',
              amountInInvestmentCurrency: 25,
            },
            {
              id: 'withdraw-usd',
              date: now,
              amount: 10,
              type: 'withdrawal',
              createdAt: now,
              currency: 'USD',
            },
          ],
          createdAt: now,
          currency: 'USD',
        },
        {
          id: 'inv-cad',
          portfolioId: 'portfolio-1',
          name: 'CA Holding',
          type: 'stocks',
          assetType: 'manual',
          initialAmount: 100,
          currentValue: 100,
          contributions: [
            {
              id: 'deposit-cad',
              date: now,
              amount: 50,
              type: 'deposit',
              createdAt: now,
              currency: 'CAD',
            },
          ],
          createdAt: now,
          currency: 'CAD',
        },
      ],
    });

    useInvestments.setState({ portfolios: [portfolio] });
    const state = useInvestments.getState();

    expect(state.getTotalInvested('portfolio-1', 'USD')).toBeCloseTo(176, 0);
  });

  it('creates normalized contribution entries with converted amounts', async () => {
    const portfolio = createPortfolio({
      id: 'portfolio-2',
      investments: [
        {
          id: 'inv-1',
          portfolioId: 'portfolio-2',
          name: 'Sample',
          type: 'stocks',
          assetType: 'stock',
          initialAmount: 100,
          currentValue: 100,
          contributions: [],
          createdAt: new Date().toISOString(),
          currency: 'USD',
        },
      ],
    });

    useInvestments.setState({ portfolios: [portfolio], currentUserId: 'user-123' });

    await act(async () => {
      await useInvestments.getState().addContribution('portfolio-2', 'inv-1', {
        date: '2024-01-01',
        amount: 25,
        type: 'deposit',
        currency: 'cad',
      });
    });

    expect(convertCurrencyMock).toHaveBeenCalledWith(25, 'CAD', 'USD');
    expect(updateAtMock).toHaveBeenCalledWith(
      'users/user-123/portfolios/portfolio-2',
      expect.objectContaining({ investments: expect.any(Array) })
    );

    const [, payload] = updateAtMock.mock.calls[0];
    const updatedInvestment = (payload.investments as Array<{ id: string; currentValue: number; contributions: any[] }>)
      .find(inv => inv.id === 'inv-1');

    expect(updatedInvestment?.currentValue).toBeCloseTo(118.5, 1);
    const contribution = updatedInvestment?.contributions.find(entry => entry.type === 'deposit');
    expect(contribution).toMatchObject({
      currency: 'CAD',
      amountInInvestmentCurrency: expect.any(Number),
    });
    expect(contribution?.amountInInvestmentCurrency).toBeCloseTo(18.5, 3);
  });

  it('delegates async portfolio conversions to the currency service', async () => {
    convertAmountsToCurrencyMock.mockResolvedValueOnce([200, 150]);

    const portfolio = createPortfolio({
      id: 'portfolio-3',
      investments: [
        {
          id: 'inv-a',
          portfolioId: 'portfolio-3',
          name: 'Alpha',
          type: 'stocks',
          assetType: 'manual',
          initialAmount: 100,
          currentValue: 120,
          contributions: [],
          createdAt: new Date().toISOString(),
          currency: 'USD',
        },
        {
          id: 'inv-b',
          portfolioId: 'portfolio-3',
          name: 'Beta',
          type: 'stocks',
          assetType: 'manual',
          initialAmount: 90,
          currentValue: 110,
          contributions: [],
          createdAt: new Date().toISOString(),
          currency: 'CAD',
        },
      ],
    });

    useInvestments.setState({ portfolios: [portfolio] });
    const state = useInvestments.getState();

    const total = await state.getTotalPortfolioValueInCurrency('portfolio-3', 'USD');
    expect(convertAmountsToCurrencyMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ amount: 120, currency: 'USD' }),
        expect.objectContaining({ amount: 110, currency: 'CAD' }),
      ]),
      'USD'
    );
    expect(total).toBe(350);
  });
});
