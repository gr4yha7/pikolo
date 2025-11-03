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

import type { Address } from 'viem';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import PredictionMarketABI from '@/lib/contracts/abis/prediction/PredictionMarket.json';
import PredictionMarketFactoryABI from '@/lib/contracts/abis/prediction/PredictionMarketFactory.json';
import { determineMarketOutcome, getBTCPriceFromMezo, shouldResolveMarket } from '@/lib/contracts/PriceResolution';

// Configuration
const RPC_URL = process.env.MEZO_RPC_URL || 'https://rpc.test.mezo.org';
const PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY; // Private key for resolver account
const FACTORY_ADDRESS = process.env.PREDICTION_MARKET_FACTORY_ADDRESS as Address | undefined;

// Define Mezo testnet chain
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
      http: [RPC_URL],
    },
  },
};

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
 * API endpoint handler (for serverless functions)
 * Example: Vercel serverless function
 */
export default async function handler(req: any, res: any) {
  try {
    const result = await resolveExpiredMarkets();
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

