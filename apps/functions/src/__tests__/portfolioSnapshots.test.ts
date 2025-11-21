const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

let capturedOnRun: (() => Promise<void>) | null = null;

const timeZoneMock = jest.fn(() => ({
  onRun: jest.fn((handler: () => Promise<void>) => {
    capturedOnRun = handler;
    return handler;
  }),
}));

const scheduleMock = jest.fn(() => ({
  timeZone: timeZoneMock,
}));

const collectionGetMap: Record<string, jest.Mock> = {};
const ensureCollectionGet = (path: string) => {
  if (!collectionGetMap[path]) {
    collectionGetMap[path] = jest.fn().mockResolvedValue({ docs: [], size: 0 });
  }
  return collectionGetMap[path];
};

const docSetMock = jest.fn();
const docMock = jest.fn(() => ({ set: docSetMock }));
const collectionMock = jest.fn((path: string) => ({
  get: ensureCollectionGet(path),
}));

jest.mock('firebase-functions/v1', () => ({
  logger,
  pubsub: {
    schedule: scheduleMock,
  },
}));

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: collectionMock,
    doc: docMock,
  })),
}));

const requestMock = jest.fn();
jest.mock('https', () => ({
  request: requestMock,
}));

const { __private__ } = require('../portfolioSnapshots');

const {
  normalizeCurrency,
  convertToBaseCurrency,
  fetchFxRates,
  createSnapshotForPortfolio,
  FALLBACK_RATES,
} = __private__;

describe('portfolioSnapshots helpers', () => {
  beforeEach(() => {
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    timeZoneMock.mockClear();
    scheduleMock.mockClear();
    collectionMock.mockClear();
    docMock.mockClear();
    docSetMock.mockReset();
    requestMock.mockReset();
    for (const key of Object.keys(collectionGetMap)) {
      collectionGetMap[key].mockReset();
      delete collectionGetMap[key];
    }
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes currency codes and falls back to base currency when unsupported', () => {
    expect(normalizeCurrency('cad')).toBe('CAD');
    expect(normalizeCurrency('  cop ')).toBe('COP');
    expect(normalizeCurrency('unknown')).toBe('USD');
    expect(normalizeCurrency(42 as unknown as string)).toBe('USD');
  });

  it('converts amounts to the base currency using provided FX rates', () => {
    const rates = { USD: 1, CAD: 2, BDT: 100, COP: 4000 } as Record<string, number>;

    expect(convertToBaseCurrency(200, 'cad', rates as any)).toBeCloseTo(100);
    expect(convertToBaseCurrency('500', 'bdt', rates as any)).toBeCloseTo(5);
    expect(convertToBaseCurrency('not-number', 'cad', rates as any)).toBe(0);
    expect(convertToBaseCurrency(300, 'usd', rates as any)).toBe(300);
  });

const mockSuccessfulFxRequest = (payload: unknown) => {
  requestMock.mockImplementationOnce((_url, callback: (response: any) => void) => {
    const responseHandlers: Record<string, (chunk?: any) => void> = {};
    const response = {
      statusCode: 200,
      on: jest.fn((event: string, handler: (chunk?: any) => void) => {
        responseHandlers[event] = handler;
      }),
    };

    const request = {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn(() => {
        responseHandlers['data']?.(Buffer.from(JSON.stringify(payload)));
        responseHandlers['end']?.();
      }),
      destroy: jest.fn(),
    };

    callback(response);
    return request;
  });
};

  it('fetches FX rates and applies sanitized values', async () => {
    mockSuccessfulFxRequest({
      rates: {
        USD: 0.5, // should be overridden to 1
        CAD: 1.42,
        BDT: '110.25',
        COP: null,
      },
    });

    const rates = await fetchFxRates();

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(rates.USD).toBe(1);
    expect(rates.CAD).toBeCloseTo(1.42);
    expect(rates.BDT).toBeCloseTo(110.25);
    expect(rates.COP).toBe(FALLBACK_RATES.COP);
  });

  it('falls back to default FX rates when the request fails', async () => {
    requestMock.mockImplementationOnce((_url, callback: (response: any) => void) => {
      const response = {
        statusCode: 500,
        resume: jest.fn(),
        on: jest.fn(),
      };

      const request = {
        on: jest.fn((event: string, handler: () => void) => {
          if (event === 'error') {
            handler();
          }
        }),
        setTimeout: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
      };

      callback(response);
      return request;
    });

    const rates = await fetchFxRates();
    expect(rates).toEqual(FALLBACK_RATES);
  });

  it('creates a snapshot document with converted investment values', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-15T12:00:00Z'));

    const rates = { USD: 1, CAD: 2, BDT: 100, COP: 4000 } as Record<string, number>;
    docSetMock.mockResolvedValue(undefined);

    const portfolio = {
      investments: [
        { id: 'inv-1', currentValue: 200, currency: 'cad', ticker: 'AAPL' },
        { currentValue: '1000', currency: 'BDT' },
        { currentValue: null, currency: 'cad' },
      ],
    };

    await createSnapshotForPortfolio('user-1', 'portfolio-1', portfolio as any, rates as any);

    expect(docMock).toHaveBeenCalledWith(
      'users/user-1/portfolios/portfolio-1/snapshots/daily-2024-05-15'
    );

    const [snapshot, options] = docSetMock.mock.calls[0];
    expect(options).toEqual({ merge: true });
    expect(snapshot.totalValue).toBeCloseTo(110);
    expect(snapshot.investments).toHaveLength(3);
    expect(snapshot.investments[0]).toMatchObject({
      id: 'inv-1',
      value: 100,
      currency: 'USD',
      sourceCurrency: 'CAD',
      ticker: 'AAPL',
    });
    expect(snapshot.investments[2]).toMatchObject({
      id: 'investment-2',
      value: 0,
      sourceCurrency: 'CAD',
    });
  });

  it('runs the scheduled job and processes portfolios', async () => {
    mockSuccessfulFxRequest({
      rates: { USD: 1, CAD: 2, BDT: 100, COP: 4000 },
    });

    ensureCollectionGet('users').mockResolvedValue({
      size: 1,
      docs: [{ id: 'user-123' }],
    });

    ensureCollectionGet('users/user-123/portfolios').mockResolvedValue({
      docs: [
        {
          id: 'portfolio-1',
          data: () => ({
            investments: [{ id: 'inv-1', currentValue: 200, currency: 'CAD' }],
          }),
        },
      ],
    });

    docSetMock.mockResolvedValue(undefined);

    await capturedOnRun?.();

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(docSetMock).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Daily portfolio snapshots complete',
      expect.objectContaining({
        processedPortfolios: 1,
        skippedPortfolios: 0,
        usersProcessed: 1,
      })
    );
  });

  it('records errors when snapshot generation fails', async () => {
    mockSuccessfulFxRequest({
      rates: { USD: 1, CAD: 2, BDT: 100, COP: 4000 },
    });

    ensureCollectionGet('users').mockResolvedValue({
      size: 1,
      docs: [{ id: 'user-999' }],
    });

    ensureCollectionGet('users/user-999/portfolios').mockResolvedValue({
      docs: [
        {
          id: 'portfolio-error',
          data: () => ({ investments: [] }),
        },
      ],
    });

    docSetMock.mockRejectedValueOnce(new Error('firestore unavailable'));

    await capturedOnRun?.();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to generate snapshot',
      expect.objectContaining({
        userId: 'user-999',
        portfolioId: 'portfolio-error',
        error: 'firestore unavailable',
      })
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Daily portfolio snapshots complete',
      expect.objectContaining({
        processedPortfolios: 0,
        skippedPortfolios: 1,
        usersProcessed: 1,
      })
    );
  });
});
