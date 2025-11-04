/**
 * Hook for Tigris Router swap functionality
 * Handles MUSD/BTC swaps via the Tigris DEX Router
 */

import { mezoTestnetChain } from '@/constants/chain';
import { MUSD_BTC_STABLE, POOL_FACTORY_ADDRESS, ROUTER_ADDRESS } from '@/constants/swap';
import { RouterClient, type Route } from '@/lib/contracts/Router';
import { useAccount } from '@reown/appkit-react-native';
import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, formatEther, http, type Address, type PublicClient, type WalletClient } from 'viem';
import { useWalletClient } from 'wagmi';

// Standard ERC20 ABI (minimal for balanceOf, allowance, approve)
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
] as const;

export interface SwapQuote {
  amountOut: bigint;
  amountOutMin: bigint; // With slippage applied
  price: number; // Price per token
  priceImpact: number; // Price impact percentage
}

export function useSwap() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [routerClient, setRouterClient] = useState<RouterClient | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize router client
  useEffect(() => {
    const rpcUrl = process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';
    const client = createPublicClient({
      chain: mezoTestnetChain,
      transport: http(rpcUrl),
    }) as PublicClient;

    setPublicClient(client);

    const router = new RouterClient(
      ROUTER_ADDRESS,
      client,
      walletClient as WalletClient | undefined,
    );
    setRouterClient(router);
  }, [walletClient]);

  /**
   * Get swap quote (estimated output)
   */
  const getQuote = useCallback(async (
    fromToken: Address,
    toToken: Address,
    amountIn: bigint,
    slippageBps: number = 50, // 0.5% default slippage
  ): Promise<SwapQuote | null> => {
    if (!routerClient || amountIn === 0n) {
      return null;
    }

    try {
      // Create route for MUSD/BTC swap
      const routes: Route[] = [
        {
          from: fromToken,
          to: toToken,
          stable: MUSD_BTC_STABLE,
          factory: POOL_FACTORY_ADDRESS,
        },
      ];

      // Get estimated output
      const amounts = await routerClient.getAmountsOut(amountIn, routes);
      const amountOut = amounts[amounts.length - 1];

      // Calculate price
      const price = Number(formatEther(amountOut)) / Number(formatEther(amountIn));

      // Calculate price impact (simplified - would need reserves for accurate calculation)
      const priceImpact = 0; // TODO: Calculate from reserves

      // Apply slippage
      const slippageMultiplier = BigInt(10000 - slippageBps);
      const amountOutMin = (amountOut * slippageMultiplier) / 10000n;

      return {
        amountOut,
        amountOutMin,
        price,
        priceImpact,
      };
    } catch (err) {
      console.error('Error getting swap quote:', err);
      return null;
    }
  }, [routerClient]);

  /**
   * Get token balance
   */
  const getBalance = useCallback(async (tokenAddress: Address, userAddress: Address): Promise<bigint> => {
    if (!publicClient) return 0n;

    try {
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      });
      return balance as bigint;
    } catch (err) {
      console.error('Error getting balance:', err);
      return 0n;
    }
  }, [publicClient]);

  /**
   * Check token allowance
   */
  const getAllowance = useCallback(async (
    tokenAddress: Address,
    owner: Address,
    spender: Address,
  ): Promise<bigint> => {
    if (!publicClient) return 0n;

    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender],
      });
      return allowance as bigint;
    } catch (err) {
      console.error('Error getting allowance:', err);
      return 0n;
    }
  }, [publicClient]);

  /**
   * Approve token spending
   */
  const approve = useCallback(async (
    tokenAddress: Address,
    spender: Address,
    amount: bigint,
  ): Promise<string> => {
    if (!walletClient?.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
        account: walletClient.account,
        chain: mezoTestnetChain,
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve token';
      throw new Error(errorMessage);
    }
  }, [walletClient, publicClient]);

  /**
   * Execute swap
   */
  const swap = useCallback(async (
    fromToken: Address,
    toToken: Address,
    amountIn: bigint,
    amountOutMin: bigint,
    slippageBps: number = 50,
  ): Promise<{ hash: string; amounts: bigint[] }> => {
    if (!routerClient || !walletClient?.account || !address) {
      throw new Error('Wallet not connected or router not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check and approve if needed
      const allowance = await getAllowance(fromToken, address as Address, ROUTER_ADDRESS);
      if (allowance < amountIn) {
        // Approve max uint256 for efficiency
        const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        await approve(fromToken, ROUTER_ADDRESS, maxApproval);
      }

      // Create route
      const routes: Route[] = [
        {
          from: fromToken,
          to: toToken,
          stable: MUSD_BTC_STABLE,
          factory: POOL_FACTORY_ADDRESS,
        },
      ];

      // Get deadline (20 minutes from now)
      const deadline = RouterClient.getDeadline();

      // Execute swap
      const result = await routerClient.swapExactTokensForTokens({
        amountIn,
        amountOutMin,
        routes,
        to: address as Address,
        deadline,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [routerClient, walletClient, address, getAllowance, approve]);

  return {
    routerClient,
    isLoading,
    error,
    getQuote,
    getBalance,
    getAllowance,
    approve,
    swap,
  };
}

