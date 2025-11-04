/**
 * Hook for PredictionMarketFactory contract interactions
 */

import { mezoTestnetChain } from '@/constants/chain';
import type { CreateMarketParams } from '@/lib/contracts/PredictionMarketFactory';
import { PredictionMarketFactoryClient } from '@/lib/contracts/PredictionMarketFactory';
import { useAccount } from '@reown/appkit-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPublicClient, http, type Address, type PublicClient, type WalletClient } from 'viem';
import { useWalletClient } from 'wagmi';

export function useMarketFactory(factoryAddress: Address | null) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [factoryClient, setFactoryClient] = useState<PredictionMarketFactoryClient | null>(null);
  const [allMarkets, setAllMarkets] = useState<Address[]>([]);
  const [marketCount, setMarketCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Initialize factory client
  // Note: walletClient is only needed for write operations (createMarket)
  // Read operations (getAllMarkets, etc.) don't require wallet connection
  useEffect(() => {
    if (!factoryAddress) {
      setFactoryClient(null);
      return;
    }

    const rpcUrl =
      process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';

    // Create public client for read operations
    const publicClient = createPublicClient({
      chain: mezoTestnetChain,
      transport: http(rpcUrl),
    }) as PublicClient;

    // Factory client can be initialized without walletClient for read-only operations
    // walletClient will be passed when available (for write operations)
    const client = new PredictionMarketFactoryClient(
      factoryAddress,
      publicClient,
      walletClient as WalletClient | undefined, // Optional - only needed for createMarket
    );

    setFactoryClient(client);
  }, [factoryAddress]); // Removed walletClient dependency - not needed for read operations

  // Fetch all markets - memoized to prevent infinite loops
  const fetchAllMarkets = useCallback(async () => {
    if (!factoryClient) return;
    
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const markets = await factoryClient.getAllMarkets();
      const count = await factoryClient.getMarketCount();

      setAllMarkets(markets);
      setMarketCount(count);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch markets';
      setError(errorMessage);
      console.error('Error fetching markets:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [factoryClient]);

  // Get markets created by user
  const fetchUserMarkets = async () => {
    if (!factoryClient || !address) return [];

    try {
      setIsLoading(true);
      setError(null);

      const markets = await factoryClient.getMarketsByCreator(address as Address);
      return markets;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch user markets';
      setError(errorMessage);
      console.error('Error fetching user markets:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Create new market - requires wallet connection
  const createMarket = async (params: CreateMarketParams) => {
    if (!factoryClient) {
      throw new Error('Factory client not initialized');
    }
    
    if (!walletClient) {
      throw new Error('Wallet connection required to create markets');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Re-initialize factory client with wallet client for write operations
      const rpcUrl =
        process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';
      const publicClient = createPublicClient({
        chain: mezoTestnetChain,
        transport: http(rpcUrl),
      }) as PublicClient;
      
      const writeClient = new PredictionMarketFactoryClient(
        factoryAddress!,
        publicClient,
        walletClient,
      );

      // Approve MUSD tokens before creating market (required for transferFrom)
      try {
        await writeClient.approveMUSD(params.initialLiquidity);
      } catch (approvalError) {
        console.error('Error approving MUSD:', approvalError);
        throw new Error('Failed to approve MUSD tokens. Please approve manually or try again.');
      }

      const result = await writeClient.createMarket(params);
      
      // Refresh markets list after creation
      await fetchAllMarkets();

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create market';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if address is a valid market
  const isMarket = async (address: Address) => {
    if (!factoryClient) {
      return false;
    }

    try {
      return await factoryClient.isMarket(address);
    } catch (err) {
      console.error('Error checking if address is market:', err);
      return false;
    }
  };

  // Auto-fetch markets on mount - only when factoryClient is ready
  // Use a ref to track if we've already auto-fetched for the current factoryClient
  const lastFactoryClientRef = useRef<PredictionMarketFactoryClient | null>(null);
  
  useEffect(() => {
    // Check if factoryClient has changed (new instance)
    const clientChanged = lastFactoryClientRef.current !== factoryClient;
    
    if (factoryClient && clientChanged) {
      console.log('Factory client ready, fetching markets...');
      lastFactoryClientRef.current = factoryClient;
      fetchAllMarkets().catch((err) => {
        console.error('Error in auto-fetch markets:', err);
      });
    }
    
    // Reset when factoryClient is null
    if (!factoryClient) {
      lastFactoryClientRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factoryClient]); // Only depend on factoryClient, not fetchAllMarkets to avoid loops

  return {
    factoryClient,
    allMarkets,
    marketCount,
    isLoading,
    error,
    createMarket,
    fetchAllMarkets,
    fetchUserMarkets,
    isMarket,
    refetch: fetchAllMarkets,
  };
}

