/**
 * AMM (Automated Market Maker) calculation utilities
 * Uses constant product formula: x * y = k
 */

/**
 * Calculate shares received from amount spent (buying shares)
 * Formula: sharesOut = (amountIn * reserveOut) / (reserveIn + amountIn)
 * With fee: sharesOut = (amountIn * (1 - fee) * reserveOut) / (reserveIn + amountIn * (1 - fee))
 */
export function calculateSharesOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number = 50, // 50 basis points = 0.5%
): bigint {
  if (reserveIn === 0n || reserveOut === 0n) {
    // Initial liquidity - 1:1 rate
    return amountIn;
  }

  const feeMultiplier = 10000n - BigInt(feeBps);
  const amountInWithFee = (amountIn * feeMultiplier) / 10000n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;

  if (denominator === 0n) return 0n;
  return numerator / denominator;
}

/**
 * Calculate amount needed to buy specific number of shares
 */
export function calculateAmountIn(
  sharesOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number = 50,
): bigint {
  if (reserveOut === 0n || sharesOut >= reserveOut) {
    // Cannot buy all or more shares than exist
    return BigInt(Number.MAX_SAFE_INTEGER);
  }

  const feeMultiplier = 10000n - BigInt(feeBps);
  const numerator = reserveIn * sharesOut * 10000n;
  const denominator = (reserveOut - sharesOut) * feeMultiplier;

  if (denominator === 0n) return BigInt(Number.MAX_SAFE_INTEGER);
  return numerator / denominator + 1n; // +1 for rounding up
}

/**
 * Calculate amount received for selling shares (inverse of buy)
 * Formula: amountOut = (sharesIn * reserveOut * (1 - fee)) / (reserveIn + sharesIn * (1 - fee))
 * For selling: sharesIn is the reserve we're taking from, reserveOut is what we're getting
 */
export function calculateAmountOut(
  sharesIn: bigint,
  reserveIn: bigint, // Shares reserve (the side being sold)
  reserveOut: bigint, // MUSD reserve (the side being received)
  feeBps: number = 50,
): bigint {
  if (reserveIn === 0n || reserveOut === 0n || sharesIn === 0n) {
    return 0n;
  }

  if (sharesIn >= reserveIn) {
    // Cannot sell all shares
    return 0n;
  }

  const feeMultiplier = 10000n - BigInt(feeBps);
  const sharesInWithFee = (sharesIn * feeMultiplier) / 10000n;
  const numerator = sharesInWithFee * reserveOut;
  const denominator = reserveIn + sharesInWithFee;

  if (denominator === 0n) return 0n;
  return numerator / denominator;
}

/**
 * Calculate current price per share from reserves
 * Price = opposite_reserve / total_reserves
 */
export function calculateSharePrice(
  reserveYes: bigint,
  reserveNo: bigint,
  isYes: boolean,
): number {
  const total = reserveYes + reserveNo;
  if (total === 0n) return 0.5; // Default 50/50 odds

  // Yes price = No reserve / Total
  // No price = Yes reserve / Total
  if (isYes) {
    return Number(reserveNo) / Number(total);
  } else {
    return Number(reserveYes) / Number(total);
  }
}

/**
 * Calculate implied probability from share price
 */
export function priceToProbability(price: number): number {
  return price * 100;
}

/**
 * Calculate slippage for a trade
 */
export function calculateSlippage(
  expectedAmount: bigint,
  actualAmount: bigint,
): number {
  if (expectedAmount === 0n) return 0;
  const diff = expectedAmount > actualAmount ? expectedAmount - actualAmount : actualAmount - expectedAmount;
  return Number((diff * 10000n) / expectedAmount) / 100; // Return as percentage
}

