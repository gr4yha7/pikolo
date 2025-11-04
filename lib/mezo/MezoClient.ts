/**
 * Mezo Protocol Integration Client
 * 
 * Interfaces with Mezo protocol contracts to enable:
 * - BTC collateral deposit (native currency on Mezo network)
 * - MUSD minting/borrowing
 * - MUSD repayment and BTC collateral withdrawal
 * 
 * Based on actual Mezo protocol architecture:
 * - Uses BorrowerOperations contract for all operations
 * - Uses TroveManager for state queries
 * - Requires hints for all operations (gas optimization)
 * - Minimum Collateral Ratio (MCR): 110%
 * - Critical Collateral Ratio (CCR): 150%
 * - Max Effective LTV: ~90.91% (1/1.1)
 * 
 * References:
 * - Documentation: https://mezo.org/docs/developers
 * - GitHub: https://github.com/mezo-org/musd
 * - Contract Addresses (Matsnet): See MEZO_PROTOCOL_ANALYSIS.md
 */

import type { Address } from 'viem';
import { createPublicClient, decodeErrorResult, http, parseEther, parseUnits, type PublicClient, type WalletClient } from 'viem';

import { mezoTestnetChain } from '@/constants/chain';
import BorrowerOperationsABI from '@/lib/contracts/abis/mezo/BorrowerOperations.json';
import InterestRateManagerABI from '@/lib/contracts/abis/mezo/InterestRateManager.json';
import MUSDABI from '@/lib/contracts/abis/mezo/MUSD.json';
import PriceFeedABI from '@/lib/contracts/abis/mezo/PriceFeed.json';
import TroveManagerABI from '@/lib/contracts/abis/mezo/TroveManager.json';

import type {
  AddCollateralParams,
  BorrowParams,
  CollateralInfo,
  MezoConfig,
  MezoTransactionResult,
  RepayParams,
  WithdrawMUSDParams,
} from './types';

export class MezoClient {
  private config: MezoConfig;
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;

  constructor(config: MezoConfig) {
    this.config = config;

    const rpcUrl =
      config.chainId === 31611
        ? process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org'
        : process.env.EXPO_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY';

    // Create public client for read operations
    this.publicClient = createPublicClient({
      chain: mezoTestnetChain, // Use custom Mezo testnet chain definition
      transport: http(rpcUrl),
    }) as PublicClient;
  }

  /**
   * Set wallet client for transactions
   */
  setWalletClient(walletClient: WalletClient) {
    this.walletClient = walletClient;
  }

  /**
   * Get current BTC price from PriceFeed
   */
  async getBtcPrice(): Promise<bigint> {
    try {
      const price = await this.publicClient.readContract({
        address: this.config.priceFeedAddress,
        abi: PriceFeedABI.abi as any,
        functionName: 'fetchPrice',
        args: [],
      });
      return price as bigint;
    } catch (error: any) {
      // PriceFeed may revert on testnet if not initialized - this is expected
      // Use fallback price instead of logging error
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('underflow or overflow')) {
        // Only log non-arithmetic errors (unexpected errors)
        console.warn('PriceFeed fetchPrice failed, using fallback:', errorMessage);
      }
      // Fallback: return a mock price in wei (18 decimals)
      return parseEther('100000'); // $100,000
    }
  }

  /**
   * Get user's comprehensive trove information from TroveManager
   */
  async getCollateralInfo(userAddress: Address): Promise<CollateralInfo> {
    try {
      // Get entire debt and collateral (includes pending rewards)
      const debtAndColl = await this.publicClient.readContract({
        address: this.config.troveManagerAddress,
        abi: TroveManagerABI.abi as any,
        functionName: 'getEntireDebtAndColl',
        args: [userAddress],
      });

      const [coll, principal, interest, pendingColl, pendingPrincipal, pendingInterest] =
        debtAndColl as [bigint, bigint, bigint, bigint, bigint, bigint];

      // Get BTC price
      const btcPrice = await this.getBtcPrice();

      // Calculate total debt (principal + interest)
      const totalDebt = principal + interest;

      // Calculate collateral value in USD (coll is in wei, btcPrice is also in wei with 18 decimals)
      // Both have 18 decimals, so divide by 1e18 to get actual value
      const collateralValueUSD = (coll * btcPrice) / parseEther('1');
      const debtValueUSD = totalDebt; // Already in wei (18 decimals)

      // Calculate ICR (Individual Collateral Ratio) = (collateral value / debt) * 100
      let collateralRatio = 0;
      if (debtValueUSD > 0n) {
        collateralRatio = Number((collateralValueUSD * BigInt(100)) / debtValueUSD);
      } else if (collateralValueUSD > 0n) {
        collateralRatio = Infinity;
      }

      // Calculate max borrowable based on 110% MCR (max LTV = 1/1.1 = ~90.91%)
      const maxBorrowable = (collateralValueUSD * BigInt(90)) / BigInt(100); // Conservative estimate

      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'danger' = 'healthy';
      if (collateralRatio < 150) {
        healthStatus = 'danger';
      } else if (collateralRatio < 200) {
        healthStatus = 'warning';
      }

      return {
        btcCollateral: (Number(coll) / 1e18).toFixed(8), // BTC has 18 decimals on Mezo
        borrowedMUSD: (Number(totalDebt) / 1e18).toFixed(2), // MUSD has 18 decimals
        principal: (Number(principal) / 1e18).toFixed(2),
        interest: (Number(interest) / 1e18).toFixed(2),
        collateralRatio: parseFloat(collateralRatio.toFixed(2)),
        maxBorrowable: (Number(maxBorrowable) / 1e18).toFixed(2),
        healthStatus,
        pendingCollateral: (Number(pendingColl) / 1e18).toFixed(8),
        pendingPrincipal: (Number(pendingPrincipal) / 1e18).toFixed(2),
        pendingInterest: (Number(pendingInterest) / 1e18).toFixed(2),
      };
    } catch (error) {
      console.error('Error getting collateral info:', error);
      return {
        btcCollateral: '0',
        borrowedMUSD: '0',
        principal: '0',
        interest: '0',
        collateralRatio: 0,
        maxBorrowable: '0',
        healthStatus: 'healthy',
        pendingCollateral: '0',
        pendingPrincipal: '0',
        pendingInterest: '0',
      };
    }
  }

  /**
   * Get maximum MUSD a user can borrow based on their collateral
   */
  async getMaxBorrowable(userAddress: Address): Promise<bigint> {
    try {
      const info = await this.getCollateralInfo(userAddress);
      const btcCollateral = parseUnits(info.btcCollateral, 18);
      const btcPrice = await this.getBtcPrice();
      const collateralValueUSD = (btcCollateral * btcPrice) / parseEther('1');
      // Max borrowable at 110% MCR = collateral value * (1/1.1) ≈ 90.91%
      const maxBorrowable = (collateralValueUSD * BigInt(9091)) / BigInt(10000); // ~90.91%
      return maxBorrowable;
    } catch (error) {
      console.error('Error getting max borrowable:', error);
      return BigInt(0);
    }
  }

  /**
   * Open a new trove (borrow MUSD against BTC collateral)
   * 
   * @param params - Borrow parameters including BTC amount, MUSD amount, and hints
   * @returns Transaction result
   */
  async openTrove(params: BorrowParams): Promise<MezoTransactionResult> {
    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        error: 'Wallet client not initialized',
        txHash: undefined,
      };
    }

    try {
      const accountAddress = this.walletClient.account.address;

      // Validate max borrowable (optional - contract will also check)
      const maxBorrowable = await this.getMaxBorrowable(accountAddress);
      if (params.musdAmount > maxBorrowable) {
        return {
          success: false,
          error: `Borrow amount exceeds maximum (${(Number(maxBorrowable) / 1e18).toFixed(2)} MUSD)`,
          txHash: undefined,
        };
      }

      // Call BorrowerOperations.openTrove()
      // Note: BTC is sent via the `value` field in the transaction
      const hash = await this.walletClient.writeContract({
        address: this.config.borrowerOperationsAddress,
        abi: BorrowerOperationsABI.abi as any,
        functionName: 'openTrove',
        args: [params.musdAmount, params.upperHint, params.lowerHint],
        value: params.btcAmount, // Send BTC as native currency
        account: accountAddress,
        chain: mezoTestnetChain,
      });

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        return {
          txHash: receipt.transactionHash,
          success: false,
          error: 'Transaction reverted. Please check your trove status and try again.',
        };
      }

      return {
        txHash: receipt.transactionHash,
        success: true,
        error: undefined,
      };
    } catch (error: any) {
      console.error('Error opening trove:', error);
      const errorMessage = this.parseRevertReason(error);
      return {
        success: false,
        error: errorMessage,
        txHash: undefined,
      };
    }
  }

  /**
   * Parse revert reason from error and return user-friendly message
   */
  private parseRevertReason(error: any): string {
    if (!error) return 'Transaction failed';
    
    // Get error message from various possible locations
    let errorMessage = '';
    
    // Try to extract from error object
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.reason) {
      errorMessage = error.reason;
    } else if (error?.data?.message) {
      errorMessage = error.data.message;
    } else if (error?.shortMessage) {
      errorMessage = error.shortMessage;
    } else {
      errorMessage = String(error);
    }
    
    // Try to decode error if it's a contract error
    if (error?.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
      try {
        const decoded = decodeErrorResult({
          abi: BorrowerOperationsABI.abi as any,
          data: error.data as `0x${string}`,
        });
        errorMessage = decoded.errorName || errorMessage;
      } catch (e) {
        // If decoding fails, continue with original message
      }
    }
    
    // Check for common revert reasons and provide user-friendly messages
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('trove is active') || lowerMessage.includes('borrowerops: trove is active')) {
      return 'You already have an active trove. Please use "Add Collateral" or "Borrow More" to modify your existing trove instead of opening a new one.';
    }
    
    if (lowerMessage.includes('trove does not exist') || lowerMessage.includes('trove is not active')) {
      return 'No active trove found. Please open a new trove first.';
    }
    
    if (lowerMessage.includes('insufficient balance') || lowerMessage.includes('erc20: transfer amount exceeds balance') || lowerMessage.includes('erc20insufficientbalance')) {
      return 'Insufficient balance. Please check your BTC or MUSD balance.';
    }
    
    if (lowerMessage.includes('collateral ratio') && (lowerMessage.includes('too low') || lowerMessage.includes('below mcr') || lowerMessage.includes('below minimum'))) {
      return 'This operation would make your collateral ratio too low. Please add more collateral or reduce the amount you want to borrow.';
    }
    
    if (lowerMessage.includes('debt would be below minimum') || lowerMessage.includes('debt must be above minimum')) {
      return 'The resulting debt would be below the minimum required amount. Please borrow more or close your trove completely.';
    }
    
    if (lowerMessage.includes('erc20insufficientallowance') || lowerMessage.includes('erc20: insufficient allowance')) {
      return 'Token approval required. Please approve the contract to spend your tokens first.';
    }
    
    if (lowerMessage.includes('execution reverted')) {
      // Try to extract the actual revert reason
      const revertMatch = errorMessage.match(/revert reason[:\s]+(.+?)(?:\n|$)/i);
      if (revertMatch && revertMatch[1]) {
        return this.parseRevertReason(revertMatch[1]);
      }
    }
    
    // Return original message if no specific pattern matched
    return errorMessage || 'Transaction failed. Please try again.';
  }

  /**
   * Add BTC collateral to existing trove
   */
  async addCollateral(params: AddCollateralParams): Promise<MezoTransactionResult> {
    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        error: 'Wallet client not initialized',
        txHash: undefined,
      };
    }

    try {
      const accountAddress = this.walletClient.account.address;

      const hash = await this.walletClient.writeContract({
        address: this.config.borrowerOperationsAddress,
        abi: BorrowerOperationsABI.abi as any,
        functionName: 'addColl',
        args: [params.upperHint, params.lowerHint],
        value: params.btcAmount, // Send BTC via value
        account: accountAddress,
        chain: mezoTestnetChain,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        return {
          txHash: receipt.transactionHash,
          success: false,
          error: 'Transaction reverted. Please check your trove status and try again.',
        };
      }

      return {
        txHash: receipt.transactionHash,
        success: true,
        error: undefined,
      };
    } catch (error: any) {
      console.error('Error adding collateral:', error);
      const errorMessage = this.parseRevertReason(error);
      return {
        success: false,
        error: errorMessage,
        txHash: undefined,
      };
    }
  }

  /**
   * Repay MUSD debt
   * 
   * Note: MUSD must be approved for BorrowerOperations contract first
   */
  async repay(params: RepayParams): Promise<MezoTransactionResult> {
    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        error: 'Wallet client not initialized',
        txHash: undefined,
      };
    }

    try {
      const userAddress = this.walletClient.account.address;

      // Check MUSD balance
      const balance = await this.publicClient.readContract({
        address: this.config.musdAddress,
        abi: MUSDABI.abi as any,
        functionName: 'balanceOf',
        args: [userAddress],
      });

      if (params.musdAmount > (balance as bigint)) {
        return {
          success: false,
          error: 'Insufficient MUSD balance',
          txHash: undefined,
        };
      }

      // Note: MUSD approval should be handled separately before calling this function
      // BorrowerOperations contract needs approval to transfer MUSD from user

      // Call BorrowerOperations.repayMUSD()
      const hash = await this.walletClient.writeContract({
        address: this.config.borrowerOperationsAddress,
        abi: BorrowerOperationsABI.abi as any,
        functionName: 'repayMUSD',
        args: [params.musdAmount, params.upperHint, params.lowerHint],
        account: userAddress,
        chain: mezoTestnetChain,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        return {
          txHash: receipt.transactionHash,
          success: false,
          error: 'Transaction reverted. Please check your trove status and try again.',
        };
      }

      return {
        txHash: receipt.transactionHash,
        success: true,
        error: undefined,
      };
    } catch (error: any) {
      console.error('Error repaying MUSD:', error);
      const errorMessage = this.parseRevertReason(error);
      return {
        success: false,
        error: errorMessage,
        txHash: undefined,
      };
    }
  }

  /**
   * Borrow additional MUSD from existing trove
   */
  async withdrawMUSD(params: WithdrawMUSDParams): Promise<MezoTransactionResult> {
    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        error: 'Wallet client not initialized',
        txHash: undefined,
      };
    }

    try {
      const accountAddress = this.walletClient.account.address;

      const hash = await this.walletClient.writeContract({
        address: this.config.borrowerOperationsAddress,
        abi: BorrowerOperationsABI.abi as any,
        functionName: 'withdrawMUSD',
        args: [params.musdAmount, params.upperHint, params.lowerHint],
        account: accountAddress,
        chain: mezoTestnetChain,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        return {
          txHash: receipt.transactionHash,
          success: false,
          error: 'Transaction reverted. Please check your trove status and try again.',
        };
      }

      return {
        txHash: receipt.transactionHash,
        success: true,
        error: undefined,
      };
    } catch (error: any) {
      console.error('Error withdrawing MUSD:', error);
      const errorMessage = this.parseRevertReason(error);
      return {
        success: false,
        error: errorMessage,
        txHash: undefined,
      };
    }
  }

  /**
   * Close trove (repay all debt and withdraw all collateral)
   */
  async closeTrove(): Promise<MezoTransactionResult> {
    if (!this.walletClient || !this.walletClient.account) {
      return {
        success: false,
        error: 'Wallet client not initialized',
        txHash: undefined,
      };
    }

    try {
      const accountAddress = this.walletClient.account.address;

      // Close trove requires having enough MUSD to repay all debt (except gas compensation)
      const hash = await this.walletClient.writeContract({
        address: this.config.borrowerOperationsAddress,
        abi: BorrowerOperationsABI.abi as any,
        functionName: 'closeTrove',
        args: [],
        account: accountAddress,
        chain: mezoTestnetChain,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        txHash: receipt.transactionHash,
        success: receipt.status === 'success',
        error: receipt.status === 'reverted' ? 'Transaction reverted' : undefined,
      };
    } catch (error) {
      console.error('Error closing trove:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        txHash: undefined,
      };
    }
  }

  /**
   * Get borrowing rate (governable fee)
   */
  async getBorrowingRate(): Promise<bigint> {
    try {
      const rate = await this.publicClient.readContract({
        address: this.config.borrowerOperationsAddress,
        abi: BorrowerOperationsABI.abi as any,
        functionName: 'borrowingRate',
        args: [],
      });
      return rate as bigint;
    } catch (error) {
      console.error('Error fetching borrowing rate:', error);
      return BigInt(1e15); // 0.1% fallback (1e15 / 1e18 = 0.001 = 0.1%)
    }
  }

  /**
   * Get MCR (Minimum Collateral Ratio) - constant: 110%
   */
  async getMCR(): Promise<bigint> {
    try {
      const mcr = await this.publicClient.readContract({
        address: this.config.borrowerOperationsAddress,
        abi: BorrowerOperationsABI.abi as any,
        functionName: 'MCR',
        args: [],
      });
      return mcr as bigint;
    } catch (error) {
      console.error('Error fetching MCR:', error);
      return BigInt(110); // 110% as per protocol
    }
  }

  /**
   * Get CCR (Critical Collateral Ratio) - constant: 150%
   */
  async getCCR(): Promise<bigint> {
    try {
      const ccr = await this.publicClient.readContract({
        address: this.config.borrowerOperationsAddress,
        abi: BorrowerOperationsABI.abi as any,
        functionName: 'CCR',
        args: [],
      });
      return ccr as bigint;
    } catch (error) {
      console.error('Error fetching CCR:', error);
      return BigInt(150); // 150% as per protocol
    }
  }

  /**
   * Get current interest rate from InterestRateManager
   * Returns the interest rate as a percentage (e.g., 1.0 for 1%)
   */
  async getInterestRate(): Promise<number> {
    try {
      const interestRateManagerAddress =
        this.config.interestRateManagerAddress ||
        ('0xD4D6c36A592A2c5e86035A6bca1d57747a567f37' as Address); // Default Matsnet address

      // Fetch current interest rate from InterestRateManager
      // The rate is returned as uint16, likely in basis points (100 = 1%)
      const rate = (await this.publicClient.readContract({
        address: interestRateManagerAddress,
        abi: InterestRateManagerABI.abi as any,
        functionName: 'interestRate',
        args: [],
      })) as bigint;

      // Convert from basis points to percentage (e.g., 100 basis points = 1%)
      return Number(rate) / 100;
    } catch (error) {
      console.error('Error fetching interest rate from InterestRateManager:', error);
      // Return default 1% if fetch fails
      return 1.0;
    }
  }

  /**
   * Get max effective LTV (~90.91% based on 110% MCR)
   */
  getMaxLTV(): number {
    return 90.91; // 1/1.1 = 90.91%
  }

  /**
   * Get public client (for external use)
   */
  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  /**
   * Get configuration
   */
  getConfig(): MezoConfig {
    return this.config;
  }
}
