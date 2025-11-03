/**
 * Borrowing Power Calculation Utilities
 * 
 * Calculates borrow amounts, liquidation prices, and fees for Mezo protocol
 */


/**
 * Calculate borrow amount from BTC collateral and collateralization ratio
 * 
 * @param btcAmount - Amount of BTC collateral (in BTC, not wei)
 * @param btcPrice - Current BTC price in USD
 * @param collateralizationRatio - Desired collateralization ratio (e.g., 151 for 151%)
 * @returns Amount of MUSD that can be borrowed
 */
export function calculateBorrowAmount(
  btcAmount: number,
  btcPrice: number,
  collateralizationRatio: number,
): number {
  if (btcAmount <= 0 || collateralizationRatio <= 0) return 0;
  
  const collateralValueUSD = btcAmount * btcPrice;
  // Borrow amount = collateral value / (collateralization ratio / 100)
  // e.g., $100 collateral at 150% ratio = $100 / 1.5 = $66.67
  const borrowAmount = collateralValueUSD / (collateralizationRatio / 100);
  return borrowAmount;
}

/**
 * Calculate liquidation price
 * 
 * @param btcPrice - Current BTC price in USD
 * @param borrowAmount - Amount of MUSD borrowed
 * @param btcCollateral - Amount of BTC collateral
 * @param liquidationThreshold - Collateralization ratio at liquidation (default 110% MCR)
 * @returns BTC price at which liquidation occurs
 */
export function calculateLiquidationPrice(
  btcPrice: number,
  borrowAmount: number,
  btcCollateral: number,
  liquidationThreshold: number = 110,
): number {
  if (borrowAmount <= 0 || btcCollateral <= 0) return 0;
  
  // Liquidation price = (borrow amount * liquidation threshold) / collateral
  // e.g., borrow $1000 at 110% threshold with 0.03 BTC = ($1000 * 1.1) / 0.03
  const liquidationPrice = (borrowAmount * (liquidationThreshold / 100)) / btcCollateral;
  return liquidationPrice;
}

/**
 * Calculate borrowing fees
 * 
 * @param borrowAmount - Base borrow amount in MUSD
 * @param borrowingFeeRate - Borrowing fee rate in basis points (e.g., 100 = 1%)
 * @returns Object with issuance fee and total fees
 */
export function calculateBorrowingFees(
  borrowAmount: number,
  borrowingFeeRate: number = 10, // 0.1% default (10 basis points)
): {
  issuanceFee: number;
  liquidationFeeDeposit: number;
  totalFees: number;
} {
  const liquidationFeeDeposit = 200; // Fixed 200 MUSD gas compensation
  const issuanceFee = (borrowAmount * borrowingFeeRate) / 10000; // Convert basis points to percentage
  
  return {
    issuanceFee,
    liquidationFeeDeposit,
    totalFees: issuanceFee + liquidationFeeDeposit,
  };
}

/**
 * Calculate collateralization ratio from borrow amount
 * 
 * @param btcAmount - Amount of BTC collateral
 * @param btcPrice - Current BTC price in USD
 * @param borrowAmount - Amount of MUSD borrowed
 * @returns Collateralization ratio as percentage (e.g., 151 for 151%)
 */
export function calculateCollateralizationRatio(
  btcAmount: number,
  btcPrice: number,
  borrowAmount: number,
): number {
  if (borrowAmount <= 0) return Infinity;
  
  const collateralValueUSD = btcAmount * btcPrice;
  const ratio = (collateralValueUSD / borrowAmount) * 100;
  return ratio;
}

/**
 * Get minimum collateralization ratio (MCR)
 */
export function getMinimumCollateralizationRatio(): number {
  return 110; // 110% MCR for Mezo protocol
}

/**
 * Get maximum safe collateralization ratio recommendation
 */
export function getRecommendedCollateralizationRatio(): number {
  return 200; // 200% is considered safe
}

