/**
 * Mezo Protocol Hint Calculation Utilities
 * 
 * Hints are required for all Mezo operations to optimize gas costs.
 * The sorted troves list is a linked list that needs hints to find insertion positions.
 */

import type { Address } from 'viem';
import { type PublicClient } from 'viem';

import BorrowerOperationsABI from '@/lib/contracts/abis/mezo/BorrowerOperations.json';
import HintHelpersABI from '@/lib/contracts/abis/mezo/HintHelpers.json';
import SortedTrovesABI from '@/lib/contracts/abis/mezo/SortedTroves.json';

import type { MezoConfig } from '@/lib/mezo/types';

// Minimal ABI for specific functions (in case full ABI is not needed)
const HINT_HELPERS_ABI = [
  {
    inputs: [
      { name: '_NICR', type: 'uint256' },
      { name: '_numTrials', type: 'uint256' },
      { name: '_randomSeed', type: 'uint256' },
    ],
    name: 'getApproxHint',
    outputs: [
      { name: 'hint', type: 'address' },
      { name: 'diff', type: 'uint256' },
      { name: 'latestRandomSeed', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const SORTED_TROVES_ABI = [
  {
    inputs: [
      { name: '_NICR', type: 'uint256' },
      { name: '_prevId', type: 'address' },
      { name: '_nextId', type: 'address' },
    ],
    name: 'findInsertPosition',
    outputs: [
      { name: 'hintId', type: 'address' },
      { name: 'nextId', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSize',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const BORROWER_OPERATIONS_ABI = [
  {
    inputs: [],
    name: 'MUSD_GAS_COMPENSATION',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_debt', type: 'uint256' }],
    name: 'getBorrowingFee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Calculate hints for opening a new trove
 * 
 * @param config - Mezo configuration with contract addresses
 * @param btcCollateral - BTC collateral amount (18 decimals)
 * @param musdDebt - MUSD debt amount (18 decimals) - includes gas compensation and fee
 * @returns Promise resolving to hints (upperHint, lowerHint)
 */
export async function calculateOpenTroveHints(
  config: MezoConfig,
  btcCollateral: bigint,
  musdDebt: bigint,
  publicClient: PublicClient,
): Promise<{ upperHint: Address; lowerHint: Address }> {
  try {
    // Calculate Nominal ICR (NICR) = (collateral * 100e18) / debt
    // Note: This is price-independent (doesn't use BTC price)
    const NICR = (btcCollateral * BigInt(100) * BigInt(10 ** 18)) / musdDebt;

    // Get approximate hint using HintHelpers
    const numTroves = await publicClient.readContract({
      address: config.sortedTrovesAddress,
      abi: SortedTrovesABI.abi as any,
      functionName: 'getSize',
      args: [],
    });

    const numTrials = BigInt(Math.ceil(Math.sqrt(Number(numTroves)))) * BigInt(15);
    const randomSeed = BigInt(Math.floor(Math.random() * 1000000));

    const approxHint = await publicClient.readContract({
      address: config.hintHelpersAddress,
      abi: HintHelpersABI.abi as any,
      functionName: 'getApproxHint',
      args: [NICR, numTrials, randomSeed],
    });

    const hintAddress = (approxHint as [Address, bigint, bigint])[0];

    // Get exact insertion position using SortedTroves
    const insertPosition = await publicClient.readContract({
      address: config.sortedTrovesAddress,
      abi: SortedTrovesABI.abi as any,
      functionName: 'findInsertPosition',
      args: [NICR, hintAddress, hintAddress],
    });

    const [upperHint, lowerHint] = insertPosition as [Address, Address];

    return { upperHint, lowerHint };
  } catch (error) {
    console.error('Error calculating hints:', error);
    // Fallback: use zero address hints (may cause higher gas, but won't fail)
    return {
      upperHint: '0x0000000000000000000000000000000000000000' as Address,
      lowerHint: '0x0000000000000000000000000000000000000000' as Address,
    };
  }
}

/**
 * Calculate hints for adjusting an existing trove
 * 
 * @param config - Mezo configuration
 * @param btcCollateral - New BTC collateral amount after adjustment
 * @param musdDebt - New MUSD debt amount after adjustment
 * @param publicClient - Viem public client
 * @returns Promise resolving to hints
 */
export async function calculateAdjustTroveHints(
  config: MezoConfig,
  btcCollateral: bigint,
  musdDebt: bigint,
  publicClient: PublicClient,
): Promise<{ upperHint: Address; lowerHint: Address }> {
  // Same calculation as openTrove
  return calculateOpenTroveHints(config, btcCollateral, musdDebt, publicClient);
}

/**
 * Get expected total debt including gas compensation and borrowing fee
 * 
 * @param config - Mezo configuration
 * @param requestedDebt - The debt amount the user wants to borrow
 * @param publicClient - Viem public client
 * @returns Promise resolving to total debt including fees
 */
export async function getExpectedTotalDebt(
  config: MezoConfig,
  requestedDebt: bigint,
  publicClient: PublicClient,
): Promise<bigint> {
  try {
    // Get gas compensation (200 MUSD)
    const gasCompensation = await publicClient.readContract({
      address: config.borrowerOperationsAddress,
      abi: BorrowerOperationsABI.abi as any,
      functionName: 'MUSD_GAS_COMPENSATION',
      args: [],
    });

    // Get borrowing fee
    const borrowingFee = await publicClient.readContract({
      address: config.borrowerOperationsAddress,
      abi: BorrowerOperationsABI.abi as any,
      functionName: 'getBorrowingFee',
      args: [requestedDebt],
    });

    const totalDebt = requestedDebt + (gasCompensation as bigint) + (borrowingFee as bigint);
    return totalDebt;
  } catch (error) {
    console.error('Error calculating expected total debt:', error);
    // Fallback: assume 200 MUSD gas compensation + 0.1% fee
    const gasCompensation = BigInt(200) * BigInt(10 ** 18);
    const estimatedFee = (requestedDebt * BigInt(1)) / BigInt(1000); // 0.1%
    return requestedDebt + gasCompensation + estimatedFee;
  }
}

