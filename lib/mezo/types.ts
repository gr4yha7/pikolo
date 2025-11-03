/**
 * TypeScript types for Mezo protocol integration
 * 
 * Updated based on actual Mezo protocol architecture:
 * - Uses BorrowerOperations + TroveManager (no single Vault contract)
 * - All operations require hints for gas optimization
 * - Max LTV: ~90.91% (MCR = 110%)
 */

import type { Address } from 'viem';

export interface MezoConfig {
  borrowerOperationsAddress: Address;
  troveManagerAddress: Address;
  musdAddress: Address;
  hintHelpersAddress: Address;
  sortedTrovesAddress: Address;
  priceFeedAddress: Address;
  interestRateManagerAddress?: Address; // Optional - InterestRateManager address
  chainId: number;
}

export interface BorrowParams {
  btcAmount: bigint; // Amount of BTC to deposit as collateral (18 decimals - native on Mezo)
  musdAmount: bigint; // Amount of MUSD to borrow (18 decimals)
  upperHint: Address; // Hint for sorted troves list
  lowerHint: Address; // Hint for sorted troves list
}

export interface RepayParams {
  musdAmount: bigint; // Amount of MUSD to repay
  upperHint: Address; // Hint for sorted troves list
  lowerHint: Address; // Hint for sorted troves list
}

export interface AddCollateralParams {
  btcAmount: bigint; // Amount of BTC to add
  upperHint: Address;
  lowerHint: Address;
}

export interface WithdrawMUSDParams {
  musdAmount: bigint; // Amount of MUSD to borrow (additional)
  upperHint: Address;
  lowerHint: Address;
}

export interface Hints {
  upperHint: Address;
  lowerHint: Address;
}

export interface CollateralInfo {
  btcCollateral: string; // Active collateral (18 decimals)
  borrowedMUSD: string; // Total debt (principal + interest, 18 decimals)
  principal: string; // Principal debt only
  interest: string; // Interest owed
  collateralRatio: number; // ICR (Individual Collateral Ratio) in percentage
  maxBorrowable: string; // Maximum MUSD that can be borrowed
  healthStatus: 'healthy' | 'warning' | 'danger';
  pendingCollateral: string; // Pending rewards from liquidations
  pendingPrincipal: string; // Pending debt from redistributions
  pendingInterest: string; // Pending interest
}

export interface MezoTransactionResult {
  txHash?: string;
  success: boolean;
  error?: string;
}

