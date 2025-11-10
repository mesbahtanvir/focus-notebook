/**
 * Transactions List Component
 * Displays transactions with filters and infinite scroll
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { useSpendingTool } from '@/store/useSpendingTool';
import type { PlaidTransaction } from '@/types/spending-tool';

export default function TransactionsList() {
  const { transactions, accounts, selectedAccountId, setSelectedAccount } = useSpendingTool();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
        <span>{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</span>
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
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map((txn) => (
            <TransactionRow key={txn.id} transaction={txn} />
          ))
        )}
      </div>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: PlaidTransaction }) {
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

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
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
                onClick={handleAcceptSuggestion}
                disabled={actionState === 'link'}
                className="rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-400"
              >
                {actionState === 'link' ? 'Linking…' : 'Link Trip'}
              </button>
              <button
                onClick={handleDismissSuggestion}
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
