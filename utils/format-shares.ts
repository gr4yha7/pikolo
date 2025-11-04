/**
 * Format shares with exactly 4 decimal places
 */

import { formatEther } from 'viem';

export function formatShares(value: bigint | number): string {
  const numValue = typeof value === 'bigint' ? Number(formatEther(value)) : value;
  return numValue.toFixed(4);
}

