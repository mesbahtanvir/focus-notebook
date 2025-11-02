import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as https from 'https';

const db = admin.firestore();

type SupportedSnapshotCurrency = 'USD' | 'CAD' | 'BDT' | 'COP';

const SUPPORTED_CURRENCIES: SupportedSnapshotCurrency[] = ['USD', 'CAD', 'BDT', 'COP'];
const BASE_CURRENCY: SupportedSnapshotCurrency = 'USD';
const FX_ENDPOINT = 'https://api.exchangerate.host/latest';

const FALLBACK_RATES: Record<SupportedSnapshotCurrency, number> = {
  USD: 1,
  CAD: 1.4085,
  BDT: 122.5352,
  COP: 3884.507,
};

const normalizeCurrency = (value: unknown): SupportedSnapshotCurrency => {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if ((SUPPORTED_CURRENCIES as readonly string[]).includes(upper)) {
      return upper as SupportedSnapshotCurrency;
    }
  }
  return BASE_CURRENCY;
};

const convertToBaseCurrency = (
  amount: unknown,
  currency: unknown,
  rates: Record<SupportedSnapshotCurrency, number>
): number => {
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const normalized = normalizeCurrency(currency);
  if (normalized === BASE_CURRENCY) {
    return numeric;
  }

  const rate = rates[normalized];
  if (!rate || rate <= 0) {
    return numeric;
  }

  return numeric / rate;
};

const fetchFxRates = async (): Promise<Record<SupportedSnapshotCurrency, number>> => {
  return new Promise((resolve) => {
    const url = new URL(FX_ENDPOINT);
    url.searchParams.set('base', BASE_CURRENCY);
    url.searchParams.set('symbols', SUPPORTED_CURRENCIES.join(','));

    const request = https.request(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        functions.logger.warn('FX rate request failed', { statusCode: response.statusCode });
        response.resume(); // Drain response to avoid socket hang up
        resolve({ ...FALLBACK_RATES });
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      response.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          const parsed = JSON.parse(raw);
          const incoming = parsed?.rates;
          const rates: Record<SupportedSnapshotCurrency, number> = { ...FALLBACK_RATES };

          if (incoming && typeof incoming === 'object') {
            for (const currency of SUPPORTED_CURRENCIES) {
              if (currency === BASE_CURRENCY) {
                rates[currency] = 1;
                continue;
              }

              const rawRate = Number(incoming[currency]);
              if (Number.isFinite(rawRate) && rawRate > 0) {
                rates[currency] = rawRate;
              }
            }
          }

          resolve(rates);
        } catch (error) {
          functions.logger.warn('Failed to parse FX rate response, using fallback', error as Error);
          resolve({ ...FALLBACK_RATES });
        }
      });
    });

    request.on('error', (error) => {
      functions.logger.warn('Failed to fetch FX rates, using fallback', error);
      resolve({ ...FALLBACK_RATES });
    });

    request.setTimeout(5000, () => {
      request.destroy(new Error('FX rate request timed out'));
    });

    request.end();
  });
};

interface SnapshotInvestment {
  id: string;
  value: number;
  ticker?: string;
  currency: SupportedSnapshotCurrency;
  sourceCurrency: SupportedSnapshotCurrency;
}

const createSnapshotForPortfolio = async (
  userId: string,
  portfolioId: string,
  portfolioData: FirebaseFirestore.DocumentData,
  rates: Record<SupportedSnapshotCurrency, number>
) => {
  const investments = Array.isArray(portfolioData?.investments) ? portfolioData.investments : [];

  const snapshotInvestments: SnapshotInvestment[] = [];
  let totalValue = 0;

  investments.forEach((investment: any, index: number) => {
    const sourceCurrency = normalizeCurrency(investment?.currency);
    const converted = convertToBaseCurrency(investment?.currentValue, sourceCurrency, rates);
    const value = Number(converted.toFixed(2));

    if (!Number.isFinite(value)) {
      return;
    }

    totalValue += value;

    snapshotInvestments.push({
      id: typeof investment?.id === 'string' ? investment.id : `investment-${index}`,
      value,
      ticker: typeof investment?.ticker === 'string' ? investment.ticker : undefined,
      currency: BASE_CURRENCY,
      sourceCurrency,
    });
  });

  const today = new Date().toISOString().split('T')[0];
  const snapshotId = `daily-${today}`;
  const snapshotRef = db.doc(`users/${userId}/portfolios/${portfolioId}/snapshots/${snapshotId}`);

  const snapshot = {
    id: snapshotId,
    date: today,
    currency: BASE_CURRENCY,
    totalValue: Number(totalValue.toFixed(2)),
    investments: snapshotInvestments,
    createdAt: new Date().toISOString(),
  };

  await snapshotRef.set(snapshot, { merge: true });
};

export const createDailyPortfolioSnapshots = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const rates = await fetchFxRates();
    const usersSnapshot = await db.collection('users').get();

    let processed = 0;
    let skipped = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const portfoliosSnapshot = await db.collection(`users/${userId}/portfolios`).get();

      for (const portfolioDoc of portfoliosSnapshot.docs) {
        try {
          await createSnapshotForPortfolio(userId, portfolioDoc.id, portfolioDoc.data(), rates);
          processed += 1;
        } catch (error) {
          skipped += 1;
          functions.logger.error('Failed to generate snapshot', {
            userId,
            portfolioId: portfolioDoc.id,
            error: (error as Error).message,
          });
        }
      }
    }

    functions.logger.info('Daily portfolio snapshots complete', {
      processedPortfolios: processed,
      skippedPortfolios: skipped,
      usersProcessed: usersSnapshot.size,
    });
  });
