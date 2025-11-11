/**
 * Transactions List Component
 * Displays transactions with filters and infinite scroll
 */

'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  ArrowUpDown,
  X,
  Calendar,
  MapPin,
  DollarSign,
  Link2,
  Tag,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useSpendingTool } from '@/store/useSpendingTool';
import { useTrips } from '@/store/useTrips';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { PlaidTransaction, Account } from '@/types/spending-tool';
import type { Trip } from '@/store/useTrips';

export default function TransactionsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { transactions, accounts, selectedAccountId, setSelectedAccount, linkTransactionToTrip } = useSpendingTool();
  const trips = useTrips((state) => state.trips);
  const subscribeTrips = useTrips((state) => state.subscribe);
  const tripsLoading = useTrips((state) => state.isLoading);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTransaction, setSelectedTransaction] = useState<PlaidTransaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    if (user?.uid) {
      subscribeTrips(user.uid);
    }
  }, [user?.uid, subscribeTrips]);

  useEffect(() => {
    setPage(1);
  }, [transactions.length, selectedAccountId, selectedCategory, searchQuery, sortBy, sortOrder]);

  const handleOpenDetails = useCallback((transaction: PlaidTransaction) => {
    setSelectedTransaction(transaction);
    setShowDetails(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedTransaction(null);
    setShowDetails(false);
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach((txn) => {
      const cat = txn.category_premium?.[0] || txn.category_base?.[0] || 'Other';
      cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter((txn) => {
      // Account filter
      if (selectedAccountId && txn.accountId !== selectedAccountId) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const cat = txn.category_premium?.[0] || txn.category_base?.[0] || 'Other';
        if (cat !== selectedCategory) {
          return false;
        }
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const merchant = (txn.merchant?.normalized || txn.merchant?.name || '').toLowerCase();
        const description = (txn.originalDescription || '').toLowerCase();
        if (!merchant.includes(query) && !description.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.postedAt.localeCompare(b.postedAt);
      } else {
        comparison = Math.abs(a.amount) - Math.abs(b.amount);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [transactions, selectedAccountId, selectedCategory, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page]);

  const startIndex =
    filteredTransactions.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(filteredTransactions.length, page * pageSize);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
          />
        </div>

        {/* Account filter */}
        <select
          value={selectedAccountId || 'all'}
          onChange={(e) => setSelectedAccount(e.target.value === 'all' ? null : e.target.value)}
          className="px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
        >
          <option value="all">All Accounts</option>
          {Object.values(accounts).map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} (...{account.mask})
            </option>
          ))}
        </select>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          {filteredTransactions.length === 0
            ? 'No transactions'
            : `Showing ${startIndex}-${endIndex} of ${filteredTransactions.length.toLocaleString()} transactions`}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSort('date')}
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Date
              {sortBy === 'date' && <ArrowUpDown className="h-3 w-3" />}
            </button>
            <button
              onClick={() => toggleSort('amount')}
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Amount
              {sortBy === 'amount' && <ArrowUpDown className="h-3 w-3" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Previous
            </button>
            <span className="font-medium">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
          </div>
        ) : (
          paginatedTransactions.map((txn) => (
            <TransactionRow key={txn.id} transaction={txn} onSelect={handleOpenDetails} />
          ))
        )}
      </div>

      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={showDetails && Boolean(selectedTransaction)}
        onClose={handleCloseDetails}
        trips={trips}
        tripsLoading={tripsLoading}
        linkTransactionToTrip={linkTransactionToTrip}
        accounts={accounts}
        onLinked={() =>
          toast({
            title: 'Transaction linked',
            description: 'This transaction is now connected to your trip.',
          })
        }
      />
    </div>
  );
}

function TransactionRow({
  transaction,
  onSelect,
}: {
  transaction: PlaidTransaction;
  onSelect: (txn: PlaidTransaction) => void;
}) {
  const linkTransactionToTrip = useSpendingTool((s) => s.linkTransactionToTrip);
  const dismissTripSuggestion = useSpendingTool((s) => s.dismissTripSuggestion);
  const [actionState, setActionState] = useState<'link' | 'dismiss' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const merchant = transaction.merchant?.normalized || transaction.merchant?.name || 'Unknown';
  const category = transaction.category_premium?.[0] || transaction.category_base?.[0] || 'Other';
  const isIncome = transaction.amount < 0;
  const amount = Math.abs(transaction.amount);
  const suggestion = transaction.tripLinkSuggestion;
  const hasPendingSuggestion = suggestion && suggestion.status === 'pending';
  const tripLink = transaction.tripLink;

  const handleAcceptSuggestion = async () => {
    if (!transaction.id || !suggestion) return;
    setActionState('link');
    setActionError(null);
    try {
      await linkTransactionToTrip(transaction.id, suggestion.tripId);
    } catch (error: any) {
      setActionError(error?.message || 'Failed to link trip');
    } finally {
      setActionState(null);
    }
  };

  const handleDismissSuggestion = async () => {
    if (!transaction.id) return;
    setActionState('dismiss');
    setActionError(null);
    try {
      await dismissTripSuggestion(transaction.id);
    } catch (error: any) {
      setActionError(error?.message || 'Failed to dismiss suggestion');
    } finally {
      setActionState(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(transaction);
    }
  };

  return (
    <div
      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow cursor-pointer focus-visible:ring-2 focus-visible:ring-green-500/70 focus:outline-none"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(transaction)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{merchant}</h3>
            {transaction.pending && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                Pending
              </span>
            )}
            {transaction.isSubscription && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                Subscription
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {transaction.originalDescription}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{new Date(transaction.postedAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>{category}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-lg font-bold ${isIncome ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
            {isIncome ? '+' : '-'}${amount.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{transaction.isoCurrency}</div>
        </div>
      </div>

      {tripLink && (
        <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-md bg-green-50 dark:bg-emerald-950/40 px-3 py-2 text-xs text-green-800 dark:text-emerald-200">
          <span className="font-semibold">Linked Trip:</span>
          <span>{tripLink.tripName}</span>
          {tripLink.tripDestination && <span className="text-green-600/70">({tripLink.tripDestination})</span>}
          <span className="text-[11px] text-green-600/70">
            {Math.round((tripLink.confidence ?? 0) * 100)}% {tripLink.method === 'ai-auto' ? 'AI match' : 'manual'}
          </span>
        </div>
      )}

      {!tripLink && hasPendingSuggestion && suggestion && (
        <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/60 dark:border-purple-800 dark:bg-purple-900/20 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-purple-900 dark:text-purple-100">
                Suggested Trip: {suggestion.tripName}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-200">
                Confidence {Math.round((suggestion.confidence ?? 0) * 100)}% • {suggestion.reasoning || 'AI detected a possible match'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleAcceptSuggestion();
                }}
                disabled={actionState === 'link'}
                className="rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-400"
              >
                {actionState === 'link' ? 'Linking…' : 'Link Trip'}
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleDismissSuggestion();
                }}
                disabled={actionState === 'dismiss'}
                className="rounded-md border border-purple-300 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {actionState === 'dismiss' ? 'Dismissing…' : 'Dismiss'}
              </button>
            </div>
          </div>
          {actionError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-300">{actionError}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface TransactionDetailModalProps {
  transaction: PlaidTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  tripsLoading: boolean;
  linkTransactionToTrip: (transactionId: string, tripId: string) => Promise<void>;
  accounts: Record<string, Account>;
  onLinked: () => void;
}

function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  trips,
  tripsLoading,
  linkTransactionToTrip,
  accounts,
  onLinked,
}: TransactionDetailModalProps) {
  const { toast } = useToast();
  const [selectedTripId, setSelectedTripId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction?.tripLink?.tripId) {
      setSelectedTripId(transaction.tripLink.tripId);
    } else if (transaction?.tripLinkSuggestion?.tripId) {
      setSelectedTripId(transaction.tripLinkSuggestion.tripId);
    } else {
      setSelectedTripId('');
    }
  }, [transaction]);

  if (!transaction || !isOpen) {
    return null;
  }

  const account = accounts[transaction.accountId];
  const isIncome = transaction.amount < 0;
  const amount = Math.abs(transaction.amount);
  const categories = transaction.category_premium ?? transaction.category_base ?? [];

  const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);

  const linkWithTrip = async (tripId?: string) => {
    if (!transaction.id) {
      toast({
        title: 'Unable to link',
        description: 'Missing transaction identifier.',
        variant: 'destructive',
      });
      return;
    }

    const targetTripId = tripId ?? selectedTripId;
    if (!targetTripId) {
      setLinkError('Select a trip to link this transaction.');
      return;
    }

    setIsLinking(true);
    setLinkError(null);
    try {
      await linkTransactionToTrip(transaction.id, targetTripId);
      onLinked();
      onClose();
    } catch (error: any) {
      const message = error?.message || 'Failed to link transaction to trip.';
      setLinkError(message);
      toast({ title: 'Link failed', description: message, variant: 'destructive' });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Transaction Details
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {transaction.merchant?.normalized || transaction.merchant?.name || 'Unknown merchant'}
            </h2>
            <div className="mt-2 text-lg font-semibold">
              <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                {isIncome ? '+' : '-'}
                {formatCurrency(amount, transaction.isoCurrency)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-6 p-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                <span>Posted {new Date(transaction.postedAt).toLocaleDateString()}</span>
                {transaction.pending && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                    Pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <CreditCard className="h-4 w-4" />
                <span>
                  {account?.name || 'Account'}
                  {account?.mask ? ` ••••${account.mask}` : ''}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <Tag className="h-3 w-3" />
                    {cat}
                  </span>
                ))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="font-semibold text-gray-800 dark:text-gray-100">Original Description</p>
                <p>{transaction.originalDescription}</p>
              </div>
              {transaction.personalNote && (
                <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
                  <p className="font-semibold">Personal Note</p>
                  <p>{transaction.personalNote}</p>
                </div>
              )}
              {transaction.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {[
                      transaction.location.address,
                      transaction.location.city,
                      transaction.location.region,
                      transaction.location.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Trip Linking
                  </p>
                  {transaction.tripLink ? (
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      Linked to{' '}
                      <span className="font-semibold text-purple-600 dark:text-purple-300">
                        {transaction.tripLink.tripName}
                      </span>{' '}
                      ({transaction.tripLink.method === 'manual' ? 'Manual' : 'AI'} ·{' '}
                      {(transaction.tripLink.confidence * 100).toFixed(0)}% confidence)
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">Not linked to any trip yet.</p>
                  )}
                </div>
                {transaction.tripLink && (
                  <Link
                    href="/tools/trips"
                    className="text-xs font-semibold text-purple-600 hover:underline dark:text-purple-300"
                  >
                    View trip
                  </Link>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Link to trip
                </label>
                {trips.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No trips yet.{' '}
                    <Link href="/tools/trips" className="font-semibold text-purple-600 dark:text-purple-300 underline">
                      Create one
                    </Link>{' '}
                    to start linking expenses.
                  </p>
                ) : (
                  <select
                    value={selectedTripId}
                    onChange={(event) => setSelectedTripId(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="">Select a trip…</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.name}
                        {trip.destination ? ` • ${trip.destination}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {linkError && <p className="text-xs text-red-600">{linkError}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => linkWithTrip()}
                    disabled={isLinking || trips.length === 0}
                    className="inline-flex items-center gap-2"
                  >
                    <Link2 className="h-4 w-4" />
                    {isLinking ? 'Linking…' : 'Link Transaction'}
                  </Button>
                  <Button variant="secondary" onClick={onClose}>
                    Close
                  </Button>
                </div>
                {tripsLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loading trips…</p>
                )}
              </div>
            </div>

            {transaction.tripLinkSuggestion && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 dark:border-purple-900/50 dark:bg-purple-950/30">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-200">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-sm font-semibold">Suggested trip</p>
                </div>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                  {transaction.tripLinkSuggestion.tripName}
                  {transaction.tripLinkSuggestion.tripDestination
                    ? ` • ${transaction.tripLinkSuggestion.tripDestination}`
                    : ''}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Confidence {(transaction.tripLinkSuggestion.confidence * 100).toFixed(0)}%
                </p>
                {transaction.tripLinkSuggestion.reasoning && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    {transaction.tripLinkSuggestion.reasoning}
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-3 bg-purple-600 text-white hover:bg-purple-700"
                  disabled={isLinking}
                  onClick={() => linkWithTrip(transaction.tripLinkSuggestion?.tripId)}
                >
                  {isLinking ? 'Linking…' : 'Link to suggested trip'}
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span>{transaction.isoCurrency}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-purple-500" />
                <span>{transaction.plaidTransactionId}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>
                  Authorized{' '}
                  {transaction.authorizedAt ? new Date(transaction.authorizedAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-rose-500" />
                <span>{transaction.source === 'plaid' ? 'Synced via Plaid' : 'Manual import'}</span>
              </div>
              {transaction.recurringStreamId && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Subscription detected</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
