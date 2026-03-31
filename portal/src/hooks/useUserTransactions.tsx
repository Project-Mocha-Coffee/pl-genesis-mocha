import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';

export interface Transaction {
  id: string;
  hash: string;
  type: 'Swap' | 'Investment' | 'Approval' | 'Transfer';
  amount: string;
  tokenSymbol: string;
  timestamp: number;
  blockNumber: number;
  status: 'Success' | 'Pending' | 'Failed';
  farmId?: string;
  farmName?: string;
  description: string;
}

/**
 * Transaction history from Scroll via eth_getLogs was removed: public RPC rejects large
 * block ranges and stalls the UI. Restore via an indexer / subgraph later.
 */
export function useUserTransactions() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!address || !isConnected || !publicClient) {
      setTransactions([]);
      setIsLoading(false);
      setError(null);
      setIsRetrying(false);
      return;
    }

    setTransactions([]);
    setError(null);
    setIsLoading(false);
    setIsRetrying(false);
    setRetryCount(0);
  }, [address, isConnected, publicClient, refreshTrigger]);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return {
    transactions,
    isLoading,
    error,
    refetch,
    isRetrying,
    retryCount,
  };
}
