/**
 * Hook for PredictionMarket contract interactions
 */

import { mezoTestnetChain } from '@/constants/chain';
import type {
  BuySharesParams,
  MarketData,
  RedeemParams,
  SellSharesParams,
  UserPosition,
} from '@/lib/contracts/PredictionMarket';
import { PredictionMarketClient } from '@/lib/contracts/PredictionMarket';
import { resolveSingleMarket } from '@/services/price-resolution';
import { useAccount } from '@reown/appkit-react-native';
import { useEffect, useState } from 'react';
import { createPublicClient, http, type Address, type PublicClient, type WalletClient } from 'viem';
import { useWalletClient } from 'wagmi';

export function usePredictionMarket(marketAddress: Address | null) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [marketClient, setMarketClient] = useState<PredictionMarketClient | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [reserves, setReserves] = useState<{ reserveYes: bigint; reserveNo: bigint } | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [totalVolume, setTotalVolume] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize market client
  useEffect(() => {
    if (!marketAddress) {
      setMarketClient(null);
      return;
    }

    const rpcUrl =
      process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';

    // Create public client for read operations
    const publicClient = createPublicClient({
      chain: mezoTestnetChain,
      transport: http(rpcUrl),
    }) as PublicClient;

    const client = new PredictionMarketClient(
      marketAddress,
      publicClient,
      walletClient as WalletClient | undefined,
    );

    setMarketClient(client);
  }, [marketAddress, walletClient]);

  // Fetch market data
  const fetchMarketData = async () => {
    if (!marketClient) return;

    try {
      setIsLoading(true);
      setError(null);

      const [data, reservesData, volume] = await Promise.all([
        marketClient.getMarketData(),
        marketClient.getReserves(),
        marketClient.getTotalVolume(),
      ]);

      setMarketData(data);
      setReserves(reservesData);
      setTotalVolume(volume);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch market data';
      setError(errorMessage);
      console.error('Error fetching market data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user position
  const fetchUserPosition = async () => {
    if (!marketClient || !address) return;

    try {
      setIsLoading(true);
      setError(null);

      const position = await marketClient.getUserPosition(address as Address);
      setUserPosition(position);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch user position';
      setError(errorMessage);
      console.error('Error fetching user position:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Buy shares
  const buyShares = async (params: BuySharesParams) => {
    if (!marketClient) {
      throw new Error('Market client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await marketClient.buyShares(params);
      
      // Refresh data after transaction
      await Promise.all([fetchMarketData(), fetchUserPosition()]);

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to buy shares';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sell shares
  const sellShares = async (params: SellSharesParams) => {
    if (!marketClient) {
      throw new Error('Market client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await marketClient.sellShares(params);
      
      // Refresh data after transaction
      await Promise.all([fetchMarketData(), fetchUserPosition()]);

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sell shares';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Redeem winning shares
  const redeem = async (params: RedeemParams) => {
    if (!marketClient) {
      throw new Error('Market client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await marketClient.redeem(params);
      
      // Refresh data after transaction
      await Promise.all([fetchMarketData(), fetchUserPosition()]);

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to redeem shares';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Estimate shares output for buying
  const estimateSharesOut = async (isYes: boolean, amountIn: bigint) => {
    if (!marketClient) {
      return BigInt(0);
    }

    try {
      return await marketClient.estimateSharesOut(isYes, amountIn);
    } catch (err) {
      console.error('Error estimating shares:', err);
      return BigInt(0);
    }
  };

  // Estimate amount output for selling
  const estimateAmountOut = async (isYes: boolean, sharesAmount: bigint) => {
    if (!marketClient) {
      return BigInt(0);
    }

    try {
      return await marketClient.estimateAmountOut(isYes, sharesAmount);
    } catch (err) {
      console.error('Error estimating amount:', err);
      return BigInt(0);
    }
  };

  // Get share price
  const getSharePrice = async (isYes: boolean) => {
    if (!marketClient) {
      return BigInt(0);
    }

    try {
      return await marketClient.getSharePrice(isYes);
    } catch (err) {
      console.error('Error getting share price:', err);
      return BigInt(0);
    }
  };

  // Resolve market (manual resolution for testing)
  const resolveMarket = async (testPrice?: number) => {
    if (!marketAddress) {
      throw new Error('Market address is required');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available. Please connect your wallet.');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create public client for reading market data
      const rpcUrl =
        process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';
      const client = createPublicClient({
        chain: mezoTestnetChain,
        transport: http(rpcUrl),
      }) as PublicClient;

      // Resolve the market
      const result = await resolveSingleMarket(
        marketAddress,
        walletClient as WalletClient,
        client,
        testPrice,
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to resolve market');
      }

      // Refresh market data after resolution
      await fetchMarketData();

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to resolve market';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount and when address/market changes
  useEffect(() => {
    if (marketClient && isConnected) {
      fetchMarketData();
      fetchUserPosition();
    }
  }, [marketClient, isConnected, address]);

  return {
    marketClient,
    marketData,
    reserves,
    userPosition,
    totalVolume,
    isLoading,
    error,
    buyShares,
    sellShares,
    redeem,
    resolveMarket,
    estimateSharesOut,
    estimateAmountOut,
    getSharePrice,
    fetchMarketData,
    fetchUserPosition,
    refetch: () => {
      if (isConnected) {
        fetchMarketData();
        fetchUserPosition();
      }
    },
  };
}

