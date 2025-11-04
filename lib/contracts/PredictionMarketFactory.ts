/**
 * PredictionMarketFactory Contract Interface
 * 
 * TypeScript wrapper for PredictionMarketFactory.sol contract
 */

import { Address, PublicClient, WalletClient, getContract } from 'viem';
import MUSDABI from './abis/mezo/MUSD.json';
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

    // Note: Contract will scale threshold to 1e18 internally, so we pass the raw USD value
    const hash = await this.contract.write.createMarket([
      BigInt(Math.floor(params.threshold)), // Price threshold in USD (contract will scale to 1e18)
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

  /**
   * Approve MUSD tokens for the factory contract
   * This must be called before createMarket if the user hasn't approved enough tokens
   */
  async approveMUSD(amount: bigint): Promise<string> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const musdAddress = await this.getMUSDAddress();
    const musdContract = getContract({
      address: musdAddress,
      abi: MUSDABI.abi,
      client: {
        public: this.publicClient,
        wallet: this.walletClient,
      },
    });

    // Check current allowance
    const currentAllowance = (await musdContract.read.allowance([
      this.walletClient.account.address,
      this.contract.address,
    ])) as bigint;

    // Only approve if current allowance is less than required amount
    if (currentAllowance < amount) {
      const hash = await musdContract.write.approve([this.contract.address, amount]);
      await this.publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }

    // Return empty string if no approval needed
    return '';
  }
}

