/**
 * Loan Calculation Utilities
 * 
 * Helper functions for calculating loan metrics and liquidation prices
 */


/**
 * Calculate liquidation price buffer
 * Shows how much BTC price can drop before liquidation (as percentage of liquidation price)
 * 
 * @param currentPrice - Current BTC price in USD
 * @param liquidationPrice - BTC price at which liquidation occurs
 * @returns Buffer as percentage (e.g., 111.63 for 111.63%)
 */
export function calculateLiquidationPriceBuffer(
  currentPrice: number,
  liquidationPrice: number,
): number {
  if (currentPrice <= 0 || liquidationPrice <= 0) return 0;
  
  // Buffer = ((current price - liquidation price) / liquidation price) * 100
  // This shows how much the price can drop relative to the liquidation price
  const buffer = ((currentPrice - liquidationPrice) / liquidationPrice) * 100;
  return Math.max(0, buffer); // Ensure non-negative
}

/**
 * Calculate liquidation price from collateral and debt
 * 
 * @param btcCollateral - BTC collateral amount
 * @param totalDebt - Total debt in MUSD (including interest)
 * @param mcr - Minimum Collateral Ratio (default 110%)
 * @returns Liquidation price in USD
 */
export function calculateLiquidationPriceFromDebt(
  btcCollateral: number,
  totalDebt: number,
  mcr: number = 110,
): number {
  if (btcCollateral <= 0 || totalDebt <= 0) return 0;
  
  // Liquidation price = (debt * MCR) / collateral
  // e.g., $2000 debt at 110% MCR with 0.03 BTC = ($2000 * 1.1) / 0.03 = $73,333.33
  return (totalDebt * (mcr / 100)) / btcCollateral;
}

/**
 * Format USD amount for display
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format BTC amount for display
 */
export function formatBTC(amount: number): string {
  return `${amount.toFixed(8)} BTC`;
}

