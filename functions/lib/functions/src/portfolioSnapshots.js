"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.__private__ = exports.createDailyPortfolioSnapshots = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https = __importStar(require("https"));
const db = admin.firestore();
const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'BDT', 'COP'];
const BASE_CURRENCY = 'USD';
const FX_ENDPOINT = 'https://api.exchangerate.host/latest';
const FALLBACK_RATES = {
    USD: 1,
    CAD: 1.4085,
    BDT: 122.5352,
    COP: 3884.507,
};
const normalizeCurrency = (value) => {
    if (typeof value === 'string') {
        const upper = value.trim().toUpperCase();
        if (SUPPORTED_CURRENCIES.includes(upper)) {
            return upper;
        }
    }
    return BASE_CURRENCY;
};
const convertToBaseCurrency = (amount, currency, rates) => {
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
const fetchFxRates = async () => {
    return new Promise((resolve) => {
        const url = new URL(FX_ENDPOINT);
        url.searchParams.set('base', BASE_CURRENCY);
        url.searchParams.set('symbols', SUPPORTED_CURRENCIES.join(','));
        const request = https.request(url, (response) => {
            if (response.statusCode && response.statusCode >= 400) {
                functions.logger.warn('FX rate request failed', { statusCode: response.statusCode });
                response.resume(); // Drain response to avoid socket hang up
                resolve(Object.assign({}, FALLBACK_RATES));
                return;
            }
            const chunks = [];
            response.on('data', (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            response.on('end', () => {
                try {
                    const raw = Buffer.concat(chunks).toString('utf8');
                    const parsed = JSON.parse(raw);
                    const incoming = parsed === null || parsed === void 0 ? void 0 : parsed.rates;
                    const rates = Object.assign({}, FALLBACK_RATES);
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
                }
                catch (error) {
                    functions.logger.warn('Failed to parse FX rate response, using fallback', error);
                    resolve(Object.assign({}, FALLBACK_RATES));
                }
            });
        });
        request.on('error', (error) => {
            functions.logger.warn('Failed to fetch FX rates, using fallback', error);
            resolve(Object.assign({}, FALLBACK_RATES));
        });
        request.setTimeout(5000, () => {
            request.destroy(new Error('FX rate request timed out'));
        });
        request.end();
    });
};
const createSnapshotForPortfolio = async (userId, portfolioId, portfolioData, rates) => {
    const investments = Array.isArray(portfolioData === null || portfolioData === void 0 ? void 0 : portfolioData.investments) ? portfolioData.investments : [];
    const snapshotInvestments = [];
    let totalValue = 0;
    investments.forEach((investment, index) => {
        const sourceCurrency = normalizeCurrency(investment === null || investment === void 0 ? void 0 : investment.currency);
        const converted = convertToBaseCurrency(investment === null || investment === void 0 ? void 0 : investment.currentValue, sourceCurrency, rates);
        const value = Number(converted.toFixed(2));
        if (!Number.isFinite(value)) {
            return;
        }
        totalValue += value;
        snapshotInvestments.push({
            id: typeof (investment === null || investment === void 0 ? void 0 : investment.id) === 'string' ? investment.id : `investment-${index}`,
            value,
            ticker: typeof (investment === null || investment === void 0 ? void 0 : investment.ticker) === 'string' ? investment.ticker : undefined,
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
exports.createDailyPortfolioSnapshots = functions.pubsub
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
            }
            catch (error) {
                skipped += 1;
                functions.logger.error('Failed to generate snapshot', {
                    userId,
                    portfolioId: portfolioDoc.id,
                    error: error.message,
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
exports.__private__ = {
    normalizeCurrency,
    convertToBaseCurrency,
    fetchFxRates,
    createSnapshotForPortfolio,
    SUPPORTED_CURRENCIES,
    BASE_CURRENCY,
    FALLBACK_RATES,
};
//# sourceMappingURL=portfolioSnapshots.js.map