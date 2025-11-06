export const SUBSCRIPTION_STATUS_COLLECTION = 'subscriptionStatus';
export const SUBSCRIPTION_STATUS_DOC_ID = 'status';
export const SUBSCRIPTION_STATUS_DOC_PATH = `${SUBSCRIPTION_STATUS_COLLECTION}/${SUBSCRIPTION_STATUS_DOC_ID}`;
export const STRIPE_CUSTOMERS_COLLECTION = 'stripeCustomers';

export type SubscriptionTier = 'free' | 'pro' | 'teams';

export type SubscriptionLifecycleStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'
  | 'unknown';

export interface SubscriptionEntitlements {
  aiProcessing?: boolean;
  aiCreditsRemaining?: number | null;
  aiCreditsResetsAt?: unknown;
}

export interface SubscriptionSnapshot {
  id?: string;
  tier?: SubscriptionTier | null;
  status?: SubscriptionLifecycleStatus | string | null;
  entitlements?: SubscriptionEntitlements | null;
  currentPeriodEnd?: unknown;
  currentPeriodStart?: unknown;
  cancelAtPeriodEnd?: boolean | null;
  cancelAt?: unknown;
  updatedAt?: unknown;
  trialEndsAt?: unknown;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  priceId?: string | null;
  invoicesCachedAt?: number;
  usageStatsEnabled?: boolean;
}

export type InvoiceStatus = 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';

export interface CachedInvoice {
  id: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  description: string | null;
  created: number;
  periodStart: number | null;
  periodEnd: number | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  cachedAt: number;
}

export interface CachedPaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cachedAt: number;
}

export interface UsageStats {
  month: string;
  thoughtsProcessed: number;
  lastProcessedAt: number;
  dailyBreakdown: Record<string, number>;
}

export type AiEntitlementCode =
  | 'allowed'
  | 'no-record'
  | 'tier-mismatch'
  | 'inactive'
  | 'disabled'
  | 'exhausted';

export interface AiEntitlement {
  allowed: boolean;
  code: AiEntitlementCode;
}

const ACTIVE_STATUSES = new Set<SubscriptionLifecycleStatus | string>([
  'active',
  'trialing',
  'past_due',
]);

function extractMillis(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'object') {
    const candidate = value as { toMillis?: () => number; toDate?: () => Date };
    if (typeof candidate.toMillis === 'function') {
      const millis = candidate.toMillis();
      return typeof millis === 'number' && Number.isFinite(millis) ? millis : null;
    }
    if (typeof candidate.toDate === 'function') {
      const date = candidate.toDate();
      return date instanceof Date ? date.getTime() : null;
    }
  }

  return null;
}

/**
 * Evaluate whether the supplied subscription snapshot grants AI processing access.
 */
export function evaluateAiEntitlement(subscription?: SubscriptionSnapshot | null): AiEntitlement {
  if (!subscription) {
    return { allowed: false, code: 'no-record' };
  }

  const entitlements = subscription.entitlements || undefined;

  if (entitlements?.aiProcessing === true) {
    return { allowed: true, code: 'allowed' };
  }

  if (entitlements?.aiProcessing === false) {
    return { allowed: false, code: 'disabled' };
  }

  if (
    typeof entitlements?.aiCreditsRemaining === 'number' &&
    entitlements.aiCreditsRemaining > 0
  ) {
    return { allowed: true, code: 'allowed' };
  }

  if (entitlements?.aiCreditsRemaining === 0) {
    return { allowed: false, code: 'exhausted' };
  }

  const tier = (subscription.tier || 'free') as SubscriptionTier | string;
  if (typeof tier !== 'string' || tier.toLowerCase() !== 'pro') {
    return { allowed: false, code: 'tier-mismatch' };
  }

  const lifecycle = (subscription.status || 'unknown') as SubscriptionLifecycleStatus | string;
  const normalizedStatus = typeof lifecycle === 'string' ? lifecycle.toLowerCase() : lifecycle;

  if (!ACTIVE_STATUSES.has(normalizedStatus)) {
    return { allowed: false, code: 'inactive' };
  }

  if (subscription.cancelAtPeriodEnd) {
    const periodEnd = extractMillis(subscription.currentPeriodEnd);
    if (periodEnd !== null && periodEnd <= Date.now()) {
      return { allowed: false, code: 'inactive' };
    }
  }

  return { allowed: true, code: 'allowed' };
}

export function hasActivePro(subscription?: SubscriptionSnapshot | null): boolean {
  return evaluateAiEntitlement(subscription).allowed;
}
