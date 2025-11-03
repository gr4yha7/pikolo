/**
 * Utility functions for financial and AMM calculations
 */

/**
 * Calculate collateral ratio
 * @param collateralValue Value of collateral in USD
 * @param borrowedAmount Amount borrowed in MUSD
 * @returns Collateral ratio as percentage (e.g., 200 for 200%)
 */
export function calculateCollateralRatio(
  collateralValue: number,
  borrowedAmount: number,
): number {
  if (borrowedAmount === 0) return collateralValue > 0 ? Infinity : 0;
  return (collateralValue / borrowedAmount) * 100;
}

/**
 * Calculate maximum borrowable amount at given LTV
 * @param collateralValue Value of collateral in USD
 * @param ltv Loan-to-value ratio (e.g., 0.7 for 70%)
 * @returns Maximum borrowable amount
 */
export function calculateMaxBorrowable(collateralValue: number, ltv: number = 0.7): number {
  return collateralValue * ltv;
}

/**
 * Calculate shares from AMM constant product formula
 * @param amount Amount of MUSD to spend
 * @param reserveIn Reserve of input token (Yes or No shares)
 * @param reserveOut Reserve of output token (Yes or No shares)
 * @param fee Fee in basis points (default 50 for 0.5%)
 * @returns Number of shares received
 */
export function calculateAMMShares(
  amount: number,
  reserveIn: number,
  reserveOut: number,
  fee: number = 50,
): number {
  if (reserveIn === 0 || reserveOut === 0) {
    // Initial liquidity - 1:1 rate
    return amount;
  }

  const amountInWithFee = amount * (10000 - fee);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10000 + amountInWithFee;

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calculate amount needed to buy specific number of shares
 * @param sharesDesired Number of shares desired
 * @param reserveIn Reserve of input token
 * @param reserveOut Reserve of output token
 * @param fee Fee in basis points
 * @returns Amount of MUSD needed
 */
export function calculateAmountForShares(
  sharesDesired: number,
  reserveIn: number,
  reserveOut: number,
  fee: number = 50,
): number {
  if (reserveOut === 0 || sharesDesired >= reserveOut) {
    return Infinity; // Cannot buy all shares
  }

  const numerator = reserveIn * sharesDesired * 10000;
  const denominator = (reserveOut - sharesDesired) * (10000 - fee);

  if (denominator === 0) return Infinity;
  return numerator / denominator;
}

/**
 * Calculate current price per share from AMM reserves
 * @param reserveIn Reserve of Yes shares
 * @param reserveOut Reserve of No shares
 * @param isYes Whether calculating for Yes shares
 * @returns Price per share in MUSD
 */
export function calculateSharePrice(
  reserveIn: number,
  reserveOut: number,
  isYes: boolean,
): number {
  if (reserveIn === 0 && reserveOut === 0) {
    return 0.5; // Default 50/50 odds
  }

  const total = reserveIn + reserveOut;
  if (total === 0) return 0;

  // Price represents the implied probability
  // Yes price = No reserve / Total
  // No price = Yes reserve / Total
  if (isYes) {
    return reserveOut / total;
  } else {
    return reserveIn / total;
  }
}

/**
 * Calculate profit/loss for a position
 * @param shares Number of shares held
 * @param entryPrice Entry price per share
 * @param currentPrice Current price per share
 * @returns Object with absolute and percentage P&L
 */
export function calculateProfitLoss(
  shares: number,
  entryPrice: number,
  currentPrice: number,
): { absolute: number; percent: number } {
  const currentValue = shares * currentPrice;
  const entryValue = shares * entryPrice;
  const absolute = currentValue - entryValue;
  const percent = entryValue > 0 ? (absolute / entryValue) * 100 : 0;

  return {
    absolute: parseFloat(absolute.toFixed(2)),
    percent: parseFloat(percent.toFixed(2)),
  };
}

/**
 * Calculate implied probability from share price
 * @param price Price per share (0-1)
 * @returns Probability as percentage
 */
export function priceToProbability(price: number): number {
  return price * 100;
}

/**
 * Calculate share price from probability
 * @param probability Probability as percentage (0-100)
 * @returns Price per share (0-1)
 */
export function probabilityToPrice(probability: number): number {
  return probability / 100;
}

