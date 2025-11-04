/**
 * Price Resolution Service (Backend Cron Job)
 * 
 * This service runs as a cron job to resolve expired BTC price prediction markets.
 * 
 * Cron Schedule: Every 5 minutes (or as needed)
 * 
 * Deployment Options:
 * - Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
 * - AWS Lambda + EventBridge: Scheduled function
 * - Railway/Render: Cron job runner
 * - Self-hosted: Node.js cron service
 * 
 * Example Vercel cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/resolve-markets",
 *     "schedule": "* /5 * * * *" // Every 5 minutes (no whitespace between * and /5)
 *   }]
 * }
 */

import type { Address, PublicClient, WalletClient } from 'viem';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { mezoTestnetChain } from '@/constants/chain';
import PredictionMarketABI from '@/lib/contracts/abis/prediction/PredictionMarket.json';
import PredictionMarketFactoryABI from '@/lib/contracts/abis/prediction/PredictionMarketFactory.json';
import { determineMarketOutcome, getBTCPriceFromMezo, shouldResolveMarket } from '@/lib/contracts/PriceResolution';

// Configuration
const RPC_URL = process.env.MEZO_RPC_URL || 'https://rpc.test.mezo.org';
const PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY; // Private key for resolver account
const FACTORY_ADDRESS = process.env.PREDICTION_MARKET_FACTORY_ADDRESS as Address | undefined;

/**
 * Get all pending markets from Factory contract
 */
async function getPendingMarkets(
  factoryAddress: Address,
  publicClient: any,
): Promise<Array<{ address: Address; threshold: number; expirationTime: number; isAboveThreshold: boolean }>> {
  try {
    // Get all markets from factory
    // This assumes the Factory has a getMarkets() or getAllMarkets() function
    const markets = await publicClient.readContract({
      address: factoryAddress,
      abi: PredictionMarketFactoryABI.abi as any,
      functionName: 'getAllMarkets', // Adjust based on actual Factory contract
      args: [],
    });

    // Filter markets that are pending and expired
    const pendingMarkets = [];
    for (const marketAddress of markets as Address[]) {
      const marketData = await publicClient.readContract({
        address: marketAddress,
        abi: PredictionMarketABI.abi as any,
        functionName: 'getMarketData', // Adjust based on actual contract
        args: [],
      });

      // marketData structure: { status, threshold, expirationTime, ... }
      // status: 0 = Pending, 1 = Resolved, 2 = Cancelled
      const status = (marketData as any).status;
      const expirationTime = Number((marketData as any).expirationTime);
      const threshold = Number((marketData as any).threshold) / 1e18; // Convert from wei
      const isAboveThreshold = (marketData as any).isAboveThreshold ?? true; // Default to true if not present

      if (status === 0 && shouldResolveMarket(expirationTime)) {
        pendingMarkets.push({
          address: marketAddress,
          threshold,
          expirationTime,
          isAboveThreshold,
        });
      }
    }

    return pendingMarkets;
  } catch (error) {
    console.error('Error fetching pending markets:', error);
    return [];
  }
}

/**
 * Resolve a single market
 */
async function resolveMarket(
  marketAddress: Address,
  threshold: number,
  isAboveThreshold: boolean,
  walletClient: any,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Fetch current BTC price from Mezo PriceFeed
    const publicClient = walletClient.publicClient || createPublicClient({
      chain: mezoTestnetChain,
      transport: http(RPC_URL),
    });

    const btcPrice = await getBTCPriceFromMezo(publicClient);

    // Determine outcome
    const outcome = determineMarketOutcome(btcPrice, threshold, isAboveThreshold);
    const outcomeValue = outcome === 'Yes' ? 1 : 0;

    // Call resolve function on market contract
    // The contract should accept: resolve(uint256 price, uint8 outcome)
    const hash = await walletClient.writeContract({
      address: marketAddress,
      abi: PredictionMarketABI.abi as any,
      functionName: 'resolve',
      args: [
        parseEther(btcPrice.toFixed(2)), // BTC price in wei (18 decimals)
        outcomeValue, // 1 for Yes, 0 for No
      ],
      account: walletClient.account,
      chain: mezoTestnetChain,
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      success: receipt.status === 'success',
      txHash: receipt.transactionHash,
      error: receipt.status === 'reverted' ? 'Transaction reverted' : undefined,
    };
  } catch (error) {
    console.error(`Error resolving market ${marketAddress}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main resolution handler (called by cron job)
 */
export async function resolveExpiredMarkets(): Promise<{
  resolved: number;
  failed: number;
  errors: string[];
}> {
  if (!PRIVATE_KEY) {
    throw new Error('RESOLVER_PRIVATE_KEY environment variable not set');
  }

  if (!FACTORY_ADDRESS) {
    throw new Error('PREDICTION_MARKET_FACTORY_ADDRESS environment variable not set');
  }

  // Create wallet client for transactions
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const publicClient = createPublicClient({
    chain: mezoTestnetChain,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: mezoTestnetChain,
    transport: http(RPC_URL),
  });

  // Get pending markets
  const pendingMarkets = await getPendingMarkets(FACTORY_ADDRESS, publicClient);

  console.log(`Found ${pendingMarkets.length} expired markets to resolve`);

  let resolved = 0;
  let failed = 0;
  const errors: string[] = [];

  // Resolve each market
  for (const market of pendingMarkets) {
    const result = await resolveMarket(
      market.address,
      market.threshold,
      market.isAboveThreshold,
      walletClient,
    );

    if (result.success) {
      resolved++;
      console.log(`✅ Resolved market ${market.address}: ${result.txHash}`);
    } else {
      failed++;
      const error = `Failed to resolve ${market.address}: ${result.error}`;
      errors.push(error);
      console.error(`❌ ${error}`);
    }
  }

  return { resolved, failed, errors };
}

/**
 * Resolve a single specific market (for testing/manual resolution)
 * Uses user's connected wallet instead of resolver private key
 * 
 * @param marketAddress - Address of the market to resolve
 * @param walletClient - Wallet client from user's connected wallet
 * @param publicClient - Public client for reading contract data (optional)
 * @param testPrice - Optional test price in USD. If not provided, fetches from Mezo PriceFeed
 * @returns Promise with success status, transaction hash, and error if any
 */
export async function resolveSingleMarket(
  marketAddress: Address,
  walletClient: WalletClient,
  publicClient?: PublicClient,
  testPrice?: number,
): Promise<{ success: boolean; txHash?: string; error?: string; outcome?: 'Yes' | 'No'; price?: number }> {
  if (!walletClient.account) {
    return {
      success: false,
      error: 'Wallet account not available',
    };
  }

  try {
    // Create public client if not provided
    const client = publicClient || createPublicClient({
      chain: mezoTestnetChain,
      transport: http(RPC_URL),
    });

    // Get market data to determine threshold and direction
    const marketData = await client.readContract({
      address: marketAddress,
      abi: PredictionMarketABI.abi as any,
      functionName: 'getMarketData',
      args: [],
    });

    const status = (marketData as any).status;
    const expirationTime = Number((marketData as any).expirationTime);
    const threshold = Number((marketData as any).threshold) / 1e18; // Convert from wei
    
    // Try to get isAboveThreshold from metadata (client-side only)
    // Since this is not stored on-chain, we need to read it from AsyncStorage
    let isAboveThreshold = true; // Default to true for backwards compatibility
    try {
      // Dynamically import metadata utilities (only works client-side in React Native)
      const { getMarketIsAboveThreshold } = await import('@/utils/market-metadata');
      isAboveThreshold = await getMarketIsAboveThreshold(marketAddress);
    } catch (error) {
      // If metadata can't be loaded (e.g., server-side or AsyncStorage not available), default to true
      console.warn(`Could not load metadata for market ${marketAddress}, defaulting to 'above':`, error);
      isAboveThreshold = true;
    }

    // Check if market is already resolved
    if (status === 1) {
      return {
        success: false,
        error: 'Market is already resolved',
      };
    }

    // Check if market has expired
    if (!shouldResolveMarket(expirationTime)) {
      return {
        success: false,
        error: 'Market has not expired yet',
      };
    }

    // Get BTC price (use test price if provided, otherwise fetch from Mezo)
    let btcPrice: number;
    if (testPrice !== undefined) {
      btcPrice = testPrice;
      console.log(`Using test price: $${btcPrice}`);
    } else {
      btcPrice = await getBTCPriceFromMezo(client);
      console.log(`Fetched BTC price from Mezo PriceFeed: $${btcPrice}`);
    }

    // Determine outcome
    const outcome = determineMarketOutcome(btcPrice, threshold, isAboveThreshold);
    const outcomeValue = outcome === 'Yes' ? 1 : 0;

    console.log(`Resolving market ${marketAddress}:`);
    console.log(`  Threshold: $${threshold}`);
    console.log(`  BTC Price: $${btcPrice}`);
    console.log(`  Direction: ${isAboveThreshold ? 'Above' : 'Below'}`);
    console.log(`  Outcome: ${outcome}`);

    // Call resolve function on market contract
    const hash = await walletClient.writeContract({
      address: marketAddress,
      abi: PredictionMarketABI.abi as any,
      functionName: 'resolve',
      args: [
        parseEther(btcPrice.toFixed(2)), // BTC price in wei (18 decimals)
        outcomeValue, // 1 for Yes, 0 for No
      ],
      account: walletClient.account,
      chain: mezoTestnetChain,
    });

    // Wait for transaction confirmation
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      return {
        success: true,
        txHash: receipt.transactionHash,
        outcome,
        price: btcPrice,
      };
    } else {
      return {
        success: false,
        error: 'Transaction reverted',
        txHash: receipt.transactionHash,
      };
    }
  } catch (error) {
    console.error(`Error resolving market ${marketAddress}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Note: The API endpoint handler is now in api/resolve-markets.ts
// This file exports both resolveExpiredMarkets (for cron) and resolveSingleMarket (for manual resolution)

