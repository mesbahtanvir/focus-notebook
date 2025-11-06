/**
 * Plaid Link Button Component
 * Handles both new connections and relink flow
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink, PlaidLinkError, PlaidLinkOnExitMetadata } from 'react-plaid-link';
import { Loader2, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { useSpendingTool } from '@/store/useSpendingTool';

interface PlaidLinkButtonProps {
  mode?: 'new' | 'relink';
  itemId?: string;
  onSuccess?: () => void;
  className?: string;
}

export default function PlaidLinkButton({
  mode = 'new',
  itemId,
  onSuccess,
  className = '',
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  const {
    createLinkToken,
    exchangePublicToken,
    createRelinkToken,
    markRelinking,
    linkLoading,
  } = useSpendingTool();

  // Initialize link token
  useEffect(() => {
    const initLinkToken = async () => {
      setIsCreatingToken(true);
      try {
        let token: string;
        if (mode === 'relink' && itemId) {
          token = await createRelinkToken(itemId);
        } else {
          token = await createLinkToken('web');
        }
        setLinkToken(token);
      } catch (error) {
        console.error('Error creating link token:', error);
      } finally {
        setIsCreatingToken(false);
      }
    };

    // Only initialize once on mount or when mode/itemId changes
    if (!linkToken && !isCreatingToken) {
      initLinkToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, itemId]); // Intentionally excluding functions to prevent infinite loop

  const onPlaidSuccess = useCallback(
    async (public_token: string, metadata: any) => {
      try {
        if (mode === 'new') {
          await exchangePublicToken(public_token);
        } else if (mode === 'relink' && itemId) {
          await markRelinking(itemId);
        }
        onSuccess?.();
      } catch (error) {
        console.error('Error processing Plaid success:', error);
      }
    },
    [mode, itemId, exchangePublicToken, markRelinking, onSuccess]
  );

  const config: Parameters<typeof usePlaidLink>[0] = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: (err: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => {
      if (err) {
        console.error('Plaid Link error:', err);
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = () => {
    if (ready) {
      open();
    }
  };

  const isLoading = isCreatingToken || linkLoading || !ready;

  if (mode === 'relink') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {isLoading ? 'Preparing...' : 'Reconnect'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <LinkIcon className="h-5 w-5" />
      )}
      {isLoading ? 'Preparing...' : 'Connect Bank Account'}
    </button>
  );
}
