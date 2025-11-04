/**
 * Tigris Router Contract Interface
 * 
 * TypeScript wrapper for Tigris Router.sol contract
 * Used for swapping tokens via the MUSD/BTC pool
 */

import { Address, PublicClient, WalletClient, getContract } from 'viem';
import RouterABI from './abis/tigris/Router.json';

// Router ABI from tigris deployment
const routerABI = RouterABI.abi || RouterABI;

export interface Route {
  from: Address;
  to: Address;
  stable: boolean;
  factory?: Address;
}

export interface SwapParams {
  amountIn: bigint;
  amountOutMin: bigint;
  routes: Route[];
  to: Address;
  deadline: bigint;
}

export class RouterClient {
  private contract: any;
  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(
    routerAddress: Address,
    publicClient: PublicClient,
    walletClient?: WalletClient,
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.contract = getContract({
      address: routerAddress,
      abi: routerABI,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
  }

  /**
   * Get pool address for a token pair
   */
  async poolFor(
    tokenA: Address,
    tokenB: Address,
    stable: boolean,
    factory?: Address,
  ): Promise<Address> {
    const factoryAddress = factory || '0x0000000000000000000000000000000000000000';
    return await this.contract.read.poolFor([tokenA, tokenB, stable, factoryAddress]);
  }

  /**
   * Get reserves for a pool
   */
  async getReserves(
    tokenA: Address,
    tokenB: Address,
    stable: boolean,
    factory?: Address,
  ): Promise<{ reserveA: bigint; reserveB: bigint }> {
    const factoryAddress = factory || '0x0000000000000000000000000000000000000000';
    const [reserveA, reserveB] = await this.contract.read.getReserves([
      tokenA,
      tokenB,
      stable,
      factoryAddress,
    ]);
    return { reserveA, reserveB };
  }

  /**
   * Get estimated output amount for a swap
   */
  async getAmountsOut(
    amountIn: bigint,
    routes: Route[],
  ): Promise<bigint[]> {
    const amounts = await this.contract.read.getAmountsOut([amountIn, routes]);
    return amounts as bigint[];
  }

  /**
   * Swap exact tokens for tokens
   */
  async swapExactTokensForTokens(
    params: SwapParams,
  ): Promise<{ hash: string; amounts: bigint[] }> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const hash = await this.contract.write.swapExactTokensForTokens([
      params.amountIn,
      params.amountOutMin,
      params.routes,
      params.to,
      params.deadline,
    ]);

    // Wait for transaction receipt
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Get amounts from the receipt (they're returned in the function)
    // For now, we'll estimate them again or parse from events
    const amounts = await this.getAmountsOut(params.amountIn, params.routes);

    return { hash, amounts };
  }

  /**
   * Calculate deadline (current timestamp + 20 minutes)
   */
  static getDeadline(): bigint {
    return BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  }
}

