/**
 * Consolidated trading hook for prediction markets
 * 
 * Provides unified interface for buy/sell/redeem operations
 */

import { calculateAmountOut, calculateSharesOut, calculateSlippage } from '@/utils/amm';
import { useMemo } from 'react';
import type { Address } from 'viem';
import { parseEther } from 'viem';
import { useWallet } from './use-wallet';
import { usePredictionMarket } from './usePredictionMarket';

export interface TradeEstimate {
  sharesOut: bigint;
  amountOut: bigint;
  pricePerShare: number;
  slippage: number;
  fee: bigint;
}

export interface SlippageTolerance {
  buy: number; // Percentage (e.g., 1 = 1%)
  sell: number;
}

export function useTrading(
  marketAddress: Address | null,
  slippageTolerance: SlippageTolerance = { buy: 1, sell: 1 },
) {
  const { wallet } = useWallet();
  const market = usePredictionMarket(marketAddress);

  /**
   * Estimate buy trade
   */
  const estimateBuy = async (
    isYes: boolean,
    amountIn: bigint,
  ): Promise<TradeEstimate | null> => {
    if (!market.reserves || !market.marketClient) {
      return null;
    }

    try {
      const { reserveYes, reserveNo } = market.reserves;
      
      // Calculate shares output
      const sharesOut = calculateSharesOut(
        amountIn,
        isYes ? reserveNo : reserveYes,
        isYes ? reserveYes : reserveNo,
        50, // 0.5% fee
      );

      // Calculate fee
      const fee = (amountIn * 50n) / 10000n;

      // Get current price
      const pricePerShare = await market.getSharePrice(isYes);
      const priceNum = Number(pricePerShare) / 1e18;

      // Calculate slippage (compare to expected if buying at current price)
      const expectedShares = amountIn / parseEther(priceNum.toString());
      const slippage = calculateSlippage(expectedShares, sharesOut);

      return {
        sharesOut,
        amountOut: amountIn, // Amount in = amount spent
        pricePerShare: priceNum,
        slippage,
        fee,
      };
    } catch (error) {
      console.error('Error estimating buy:', error);
      return null;
    }
  };

  /**
   * Estimate sell trade
   */
  const estimateSell = async (
    isYes: boolean,
    sharesAmount: bigint,
  ): Promise<TradeEstimate | null> => {
    if (!market.reserves || !market.marketClient) {
      return null;
    }

    try {
      const { reserveYes, reserveNo } = market.reserves;
      
      // Calculate MUSD output
      const amountOut = calculateAmountOut(
        sharesAmount,
        isYes ? reserveYes : reserveNo,
        isYes ? reserveNo : reserveYes,
        50, // 0.5% fee
      );

      // Calculate fee (estimated)
      const fee = (amountOut * 50n) / 10050n; // Fee is on amountOut

      // Get current price
      const pricePerShare = await market.getSharePrice(isYes);
      const priceNum = Number(pricePerShare) / 1e18;

      // Calculate slippage (compare to expected if selling at current price)
      const expectedAmount = sharesAmount * parseEther(priceNum.toString()) / parseEther('1');
      const slippage = calculateSlippage(expectedAmount, amountOut);

      return {
        sharesOut: sharesAmount, // Shares out = shares being sold
        amountOut,
        pricePerShare: priceNum,
        slippage,
        fee,
      };
    } catch (error) {
      console.error('Error estimating sell:', error);
      return null;
    }
  };

  /**
   * Check if slippage is acceptable
   */
  const isSlippageAcceptable = (
    estimate: TradeEstimate | null,
    isBuy: boolean,
  ): boolean => {
    if (!estimate) return false;
    
    const tolerance = isBuy ? slippageTolerance.buy : slippageTolerance.sell;
    return estimate.slippage <= tolerance;
  };

  /**
   * Get user's available shares for selling
   */
  const availableShares = useMemo(() => {
    if (!market.userPosition) {
      return { yes: 0n, no: 0n };
    }
    return {
      yes: market.userPosition.yesShares,
      no: market.userPosition.noShares,
    };
  }, [market.userPosition]);

  /**
   * Check if user can afford a buy
   */
  const canAfford = (amountIn: bigint): boolean => {
    if (!wallet.musdBalance) return false;
    const balance = BigInt(Math.floor(parseFloat(wallet.musdBalance) * 1e18));
    return amountIn <= balance;
  };

  return {
    ...market,
    estimateBuy,
    estimateSell,
    isSlippageAcceptable,
    availableShares,
    canAfford,
  };
}

