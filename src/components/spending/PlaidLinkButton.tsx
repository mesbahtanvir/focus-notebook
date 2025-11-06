'use client';

/**
 * Plaid Link Button Component
 *
 * Provides a button to connect bank accounts via Plaid Link
 * Handles the OAuth flow and token exchange
 */

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '@/contexts/AuthContext';
import { useSpending } from '@/store/useSpending';

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function PlaidLinkButton({ onSuccess, onError, className }: PlaidLinkButtonProps) {
  const { user } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Fetch link token when component mounts
  useEffect(() => {
    if (!user?.uid) return;

    const fetchLinkToken = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid }),
        });

        const data = await response.json();

        if (data.needsSetup) {
          setNeedsSetup(true);
          setIsLoading(false);
          return;
        }

        if (data.error) {
          throw new Error(data.error);
        }

        setLinkToken(data.link_token);
      } catch (error) {
        console.error('Failed to create link token:', error);
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkToken();
  }, [user?.uid, onError]);

  // Handle successful connection
  const handleSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);

        // Exchange public token for access token
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicToken,
            userId: user.uid,
            metadata,
          }),
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Sync transactions for all newly created accounts
        const syncPromises = data.accountIds.map((accountId: string) =>
          fetch('/api/plaid/sync-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId,
              userId: user.uid,
            }),
          })
        );

        await Promise.all(syncPromises);

        onSuccess?.();
      } catch (error) {
        console.error('Failed to exchange token:', error);
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.uid, onSuccess, onError]
  );

  // Initialize Plaid Link
  const config: any = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (error: any, metadata: any) => {
      if (error) {
        console.error('Plaid Link exited with error:', error);
        onError?.(error);
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Show setup message if Plaid is not configured
  if (needsSetup) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Plaid is not configured. Please add your Plaid API credentials to <code>.env.local</code> to enable bank connections.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready || isLoading}
      className={className || 'btn-primary'}
    >
      {isLoading ? 'Connecting...' : 'Connect Bank Account'}
    </button>
  );
}
