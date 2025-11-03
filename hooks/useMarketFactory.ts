/**
 * Hook for PredictionMarketFactory contract interactions
 */

import type { CreateMarketParams } from '@/lib/contracts/PredictionMarketFactory';
import { PredictionMarketFactoryClient } from '@/lib/contracts/PredictionMarketFactory';
import { useAccount } from '@reown/appkit-react-native';
import { useEffect, useState } from 'react';
import { createPublicClient, http, type Address, type PublicClient, type WalletClient } from 'viem';
import { useWalletClient } from 'wagmi';

// Mezo testnet chain definition
const mezoTestnetChain = {
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Bitcoin',
    symbol: 'BTC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.test.mezo.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mezo Explorer',
      url: 'https://explorer.test.mezo.org',
    },
  },
  testnet: true,
};

export function useMarketFactory(factoryAddress: Address | null) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [factoryClient, setFactoryClient] = useState<PredictionMarketFactoryClient | null>(null);
  const [allMarkets, setAllMarkets] = useState<Address[]>([]);
  const [marketCount, setMarketCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize factory client
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

    const client = new PredictionMarketFactoryClient(
      factoryAddress,
      publicClient,
      walletClient as WalletClient | undefined,
    );

    setFactoryClient(client);
  }, [factoryAddress, walletClient]);

  // Fetch all markets
  const fetchAllMarkets = async () => {
    if (!factoryClient) return;

    try {
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
    }
  };

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

  // Create new market
  const createMarket = async (params: CreateMarketParams) => {
    if (!factoryClient) {
      throw new Error('Factory client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await factoryClient.createMarket(params);
      
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

  // Auto-fetch markets on mount
  useEffect(() => {
    if (factoryClient) {
      fetchAllMarkets();
    }
  }, [factoryClient]);

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

