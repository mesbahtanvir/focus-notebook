import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsClient } from '@/lib/firebaseClient';
import type { CachedInvoice, CachedPaymentMethod } from '@shared/subscription';

interface BillingData {
  invoices: CachedInvoice[];
  hasMore: boolean;
  cachedAt: number;
}

interface UseBillingDataReturn {
  invoices: CachedInvoice[];
  paymentMethod: CachedPaymentMethod | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reactivateSubscription: () => Promise<boolean>;
}

export function useBillingData(): UseBillingDataReturn {
  const [invoices, setInvoices] = useState<CachedInvoice[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<CachedPaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchInvoices = useCallback(async (forceRefresh = false) => {
    try {
      const getInvoices = httpsCallable<
        { limit?: number; forceRefresh?: boolean },
        BillingData
      >(functionsClient, 'getStripeInvoices');

      const result = await getInvoices({ limit: 20, forceRefresh });
      setInvoices(result.data.invoices);
      setHasMore(result.data.hasMore);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    }
  }, []);

  const fetchPaymentMethod = useCallback(async () => {
    try {
      const getPaymentMethod = httpsCallable<void, CachedPaymentMethod | null>(
        functionsClient,
        'getStripePaymentMethod'
      );

      const result = await getPaymentMethod();
      setPaymentMethod(result.data);
    } catch (err) {
      console.error('Failed to fetch payment method:', err);
      // Don't set error for payment method - it's not critical
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || invoices.length === 0) return;

    try {
      const lastInvoiceId = invoices[invoices.length - 1].id;
      const getInvoices = httpsCallable<
        { limit?: number; startingAfter?: string },
        BillingData
      >(functionsClient, 'getStripeInvoices');

      const result = await getInvoices({ limit: 20, startingAfter: lastInvoiceId });
      setInvoices((prev) => [...prev, ...result.data.invoices]);
      setHasMore(result.data.hasMore);
    } catch (err) {
      console.error('Failed to load more invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more invoices');
    }
  }, [invoices, hasMore]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchInvoices(true), fetchPaymentMethod()]);
    setIsLoading(false);
  }, [fetchInvoices, fetchPaymentMethod]);

  const reactivateSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const reactivate = httpsCallable<void, { success: boolean }>(
        functionsClient,
        'reactivateStripeSubscription'
      );

      const result = await reactivate();
      return result.data.success;
    } catch (err) {
      console.error('Failed to reactivate subscription:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchInvoices(), fetchPaymentMethod()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchInvoices, fetchPaymentMethod]);

  return {
    invoices,
    paymentMethod,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    reactivateSubscription,
  };
}
