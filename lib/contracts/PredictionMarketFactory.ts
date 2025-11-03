/**
 * PredictionMarketFactory Contract Interface
 * 
 * TypeScript wrapper for PredictionMarketFactory.sol contract
 */

import { Address, PublicClient, WalletClient, getContract } from 'viem';
import PredictionMarketFactoryABI from './abis/prediction/PredictionMarketFactory.json';

export interface CreateMarketParams {
  threshold: number; // Price threshold in USD (will be scaled to 1e18 internally)
  expirationTime: number; // Unix timestamp
  initialLiquidity: bigint; // Initial liquidity in MUSD (wei)
}

export class PredictionMarketFactoryClient {
  private contract: any;
  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(
    address: Address,
    publicClient: PublicClient,
    walletClient?: WalletClient,
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.contract = getContract({
      address,
      abi: PredictionMarketFactoryABI.abi,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
  }

  /**
   * Create a new BTC price prediction market
   */
  async createMarket(
    params: CreateMarketParams,
  ): Promise<{ hash: string; marketAddress: Address }> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    // Convert threshold from USD to wei (1e18 scaled)
    const thresholdInWei = BigInt(Math.floor(params.threshold * 1e18));
    
    const hash = await this.contract.write.createMarket([
      thresholdInWei, // Price threshold in wei (1e18 scaled)
      BigInt(params.expirationTime), // Unix timestamp
      params.initialLiquidity, // Initial liquidity in MUSD (wei)
    ]);

    // Wait for transaction receipt to get market address from event
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
    });

    // Extract market address from MarketCreated event
    // Get all markets and return the latest one
    const allMarkets = await this.getAllMarkets();
    const marketAddress = allMarkets[allMarkets.length - 1];

    return { hash, marketAddress };
  }

  /**
   * Get all market addresses
   */
  async getAllMarkets(): Promise<Address[]> {
    return await this.contract.read.getAllMarkets();
  }

  /**
   * Get total number of markets
   */
  async getMarketCount(): Promise<number> {
    const markets = await this.getAllMarkets();
    return markets.length;
  }

  /**
   * Get markets created by a specific address
   */
  async getMarketsByCreator(creator: Address): Promise<Address[]> {
    return await this.contract.read.getMarketsByCreator([creator]);
  }

  /**
   * Check if an address is a valid market
   */
  async isMarket(address: Address): Promise<boolean> {
    return await this.contract.read.isMarket([address]);
  }

  /**
   * Get MUSD token address
   */
  async getMUSDAddress(): Promise<Address> {
    return await this.contract.read.musdToken();
  }
}

