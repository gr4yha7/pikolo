/**
 * PredictionMarket Contract Interface
 * 
 * TypeScript wrapper for PredictionMarket.sol contract
 */

import { Address, PublicClient, WalletClient, decodeEventLog, getContract } from 'viem';
import MUSDABI from './abis/mezo/MUSD.json';
import PredictionMarketABI from './abis/prediction/PredictionMarket.json';

export interface MarketData {
  threshold: bigint; // Price threshold in wei (1e18 scaled)
  expirationTime: bigint; // Unix timestamp
  status: 0 | 1 | 2; // 0 = Pending, 1 = Resolved, 2 = Cancelled
  outcome: 0 | 1; // 0 = No, 1 = Yes
  resolvedPrice: bigint; // BTC price used for resolution (wei)
  creator: Address;
  createdAt: bigint;
}

export interface UserPosition {
  yesShares: bigint;
  noShares: bigint;
}

export interface BuySharesParams {
  isYes: boolean;
  amountIn: bigint; // Amount in MUSD (wei)
}

export interface SellSharesParams {
  isYes: boolean;
  sharesAmount: bigint;
}

export interface RedeemParams {
  isYes: boolean;
  sharesAmount: bigint;
}

export class PredictionMarketClient {
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
      abi: PredictionMarketABI.abi,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
  }

  /**
   * Get MUSD token address from market contract
   */
  async getMUSDAddress(): Promise<Address> {
    return await this.contract.read.musdToken();
  }

  /**
   * Check MUSD allowance for this market contract
   */
  async getMUSDAllowance(userAddress: Address): Promise<bigint> {
    const musdAddress = await this.getMUSDAddress();
    const musdContract = getContract({
      address: musdAddress,
      abi: MUSDABI.abi,
      client: {
        public: this.publicClient,
        wallet: this.walletClient,
      },
    });
    const allowance = await musdContract.read.allowance([userAddress, this.contract.address]);
    return allowance as bigint;
  }

  /**
   * Approve MUSD tokens for this market contract
   */
  async approveMUSD(amount: bigint): Promise<string> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const musdAddress = await this.getMUSDAddress();
    const currentAllowance = await this.getMUSDAllowance(this.walletClient.account.address);

    // Only approve if current allowance is less than required amount
    if (currentAllowance < amount) {
      const musdContract = getContract({
        address: musdAddress,
        abi: MUSDABI.abi,
        client: {
          public: this.publicClient,
          wallet: this.walletClient,
        },
      });
      const hash = await musdContract.write.approve([this.contract.address, amount]);
      await this.publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }

    // Return empty string if no approval needed
    return '';
  }

  /**
   * Get market data
   */
  async getMarketData(): Promise<MarketData> {
    return await this.contract.read.getMarketData();
  }

  /**
   * Get current AMM reserves
   */
  async getReserves(): Promise<{ reserveYes: bigint; reserveNo: bigint }> {
    const [reserveYes, reserveNo] = await Promise.all([
      this.contract.read.reserveYes(),
      this.contract.read.reserveNo(),
    ]);
    return { reserveYes, reserveNo };
  }

  /**
   * Get share price (0-1 range, scaled by 1e18)
   * Note: This is calculated client-side based on reserves
   */
  async getSharePrice(isYes: boolean): Promise<bigint> {
    const reserves = await this.getReserves();
    const total = reserves.reserveYes + reserves.reserveNo;
    if (total === 0n) {
      return BigInt(0.5 * 1e18); // Default 50/50 odds
    }
    if (isYes) {
      // Yes price = reserveNo / total
      return (reserves.reserveNo * BigInt(1e18)) / total;
    } else {
      // No price = reserveYes / total
      return (reserves.reserveYes * BigInt(1e18)) / total;
    }
  }

  /**
   * Get user's position (Yes/No shares)
   */
  async getUserPosition(userAddress: Address): Promise<UserPosition> {
    const [yesShares, noShares] = await Promise.all([
      this.contract.read.yesShares([userAddress]),
      this.contract.read.noShares([userAddress]),
    ]);
    return { yesShares, noShares };
  }

  /**
   * Get total trading volume
   */
  async getTotalVolume(): Promise<bigint> {
    return await this.contract.read.totalVolume();
  }

  /**
   * Buy Yes or No shares
   */
  async buyShares(
    params: BuySharesParams,
  ): Promise<{ hash: string; sharesOut: bigint }> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    // Check and approve MUSD if needed
    const currentAllowance = await this.getMUSDAllowance(this.walletClient.account.address);
    if (currentAllowance < params.amountIn) {
      // Approve max uint256 for efficiency (only needs to be done once per market)
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      await this.approveMUSD(maxApproval);
    }

    const hash = await this.contract.write.buyShares([
      params.isYes,
      params.amountIn,
    ]);

    // Wait for transaction receipt to get shares out from events
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
    });

    // Parse SharesBought event from receipt
    let sharesOut = BigInt(0);
    if (receipt.logs && receipt.logs.length > 0) {
      const eventAbi = (this.contract.abi as any[]).find(
        (item) => item.type === 'event' && item.name === 'SharesBought',
      );
      
      if (eventAbi) {
        try {
          const decodedLogs = receipt.logs
            .map((log) => {
              try {
                return decodeEventLog({
                  abi: [eventAbi],
                  data: log.data,
                  topics: log.topics,
                });
              } catch {
                return null;
              }
            })
            .filter((decoded) => {
              if (!decoded || typeof decoded !== 'object') return false;
              return 'eventName' in decoded && (decoded as any).eventName === 'SharesBought';
            })
            .map((decoded) => decoded as { eventName: string; args: any });

          if (decodedLogs.length > 0 && decodedLogs[0]) {
            const event = decodedLogs[0] as any;
            sharesOut = event.args.sharesOut as bigint;
          }
        } catch (error) {
          console.warn('Failed to parse SharesBought event, estimating shares:', error);
          // Fallback to estimation
          const reserves = await this.getReserves();
          sharesOut = await this.estimateSharesOut(params.isYes, params.amountIn);
        }
      } else {
        // Fallback to estimation if event ABI not found
        sharesOut = await this.estimateSharesOut(params.isYes, params.amountIn);
      }
    } else {
      // Fallback to estimation if no logs
      sharesOut = await this.estimateSharesOut(params.isYes, params.amountIn);
    }

    return { hash, sharesOut };
  }

  /**
   * Sell Yes or No shares
   */
  async sellShares(
    params: SellSharesParams,
  ): Promise<{ hash: string; amountOut: bigint }> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const hash = await this.contract.write.sellShares([
      params.isYes,
      params.sharesAmount,
    ]);

    // Wait for transaction receipt
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    // Parse SharesSold event from receipt
    let amountOut = BigInt(0);
    if (receipt.logs && receipt.logs.length > 0) {
      const eventAbi = (this.contract.abi as any[]).find(
        (item) => item.type === 'event' && item.name === 'SharesSold',
      );
      
      if (eventAbi) {
        try {
          const decodedLogs = receipt.logs
            .map((log) => {
              try {
                return decodeEventLog({
                  abi: [eventAbi],
                  data: log.data,
                  topics: log.topics,
                });
              } catch {
                return null;
              }
            })
            .filter((decoded) => {
              if (!decoded || typeof decoded !== 'object') return false;
              return 'eventName' in decoded && (decoded as any).eventName === 'SharesSold';
            })
            .map((decoded) => decoded as { eventName: string; args: any });

          if (decodedLogs.length > 0 && decodedLogs[0]) {
            const event = decodedLogs[0] as any;
            amountOut = event.args.amountOut as bigint;
          }
        } catch (error) {
          console.warn('Failed to parse SharesSold event, estimating amount:', error);
          // Fallback to estimation
          amountOut = await this.estimateAmountOut(params.isYes, params.sharesAmount);
        }
      } else {
        // Fallback to estimation if event ABI not found
        amountOut = await this.estimateAmountOut(params.isYes, params.sharesAmount);
      }
    } else {
      // Fallback to estimation if no logs
      amountOut = await this.estimateAmountOut(params.isYes, params.sharesAmount);
    }

    return { hash, amountOut };
  }

  /**
   * Redeem winning shares after market resolution
   */
  async redeem(params: RedeemParams): Promise<{ hash: string; payout: bigint }> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const hash = await this.contract.write.redeem([
      params.isYes,
      params.sharesAmount,
    ]);

    // Wait for transaction receipt
    await this.publicClient.waitForTransactionReceipt({ hash });

    // Payout is 1:1 with shares for winning positions
    const payout = params.sharesAmount;

    return { hash, payout };
  }

  /**
   * Resolve market (owner only)
   */
  async resolve(price: bigint, outcome: 0 | 1): Promise<string> {
    if (!this.walletClient?.account) {
      throw new Error('Wallet client required for transactions');
    }

    const hash = await this.contract.write.resolve([price, outcome]);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  /**
   * Calculate estimated shares output for buying
   */
  async estimateSharesOut(
    isYes: boolean,
    amountIn: bigint,
  ): Promise<bigint> {
    const reserves = await this.getReserves();
    // Use AMM formula - calculateSharesOut(amountIn, reserveIn, reserveOut, feeBps)
    // For buying Yes: reserveIn = reserveNo (MUSD), reserveOut = reserveYes (shares)
    // For buying No: reserveIn = reserveYes (MUSD), reserveOut = reserveNo (shares)
    const reserveIn = isYes ? reserves.reserveNo : reserves.reserveYes;
    const reserveOut = isYes ? reserves.reserveYes : reserves.reserveNo;
    
    if (reserveIn === 0n || reserveOut === 0n) {
      return amountIn; // Initial liquidity - 1:1 rate
    }

    const feeBps = 50; // 0.5% fee
    const feeMultiplier = 10000n - BigInt(feeBps);
    const amountInWithFee = (amountIn * feeMultiplier) / 10000n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;

    if (denominator === 0n) return 0n;
    return numerator / denominator;
  }

  /**
   * Calculate estimated MUSD output for selling
   */
  async estimateAmountOut(
    isYes: boolean,
    sharesAmount: bigint,
  ): Promise<bigint> {
    const reserves = await this.getReserves();
    // Use AMM formula - importing dynamically to avoid circular deps
    // calculateAmountOut(sharesIn, reserveIn, reserveOut, feeBps)
    // For selling Yes: reserveIn = reserveYes, reserveOut = reserveNo
    // For selling No: reserveIn = reserveNo, reserveOut = reserveYes
    const reserveIn = isYes ? reserves.reserveYes : reserves.reserveNo;
    const reserveOut = isYes ? reserves.reserveNo : reserves.reserveYes;
    
    if (reserveIn === 0n || reserveOut === 0n || sharesAmount === 0n) {
      return 0n;
    }

    if (sharesAmount >= reserveIn) {
      return 0n;
    }

    const feeBps = 50; // 0.5% fee
    const feeMultiplier = 10000n - BigInt(feeBps);
    const sharesInWithFee = (sharesAmount * feeMultiplier) / 10000n;
    const numerator = sharesInWithFee * reserveOut;
    const denominator = reserveIn + sharesInWithFee;

    if (denominator === 0n) return 0n;
    return numerator / denominator;
  }
}

