import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BTC_ADDRESS, MUSD_ADDRESS } from '@/constants/swap';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useSwap } from '@/hooks/useSwap';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Address } from 'viem';
import { formatEther, parseEther } from 'viem';

// Format BTC with 4-8 decimal places (smart formatting)
const formatBTC = (value: bigint | number): string => {
  const numValue = typeof value === 'bigint' ? Number(formatEther(value)) : value;
  if (numValue === 0) return '0.0000';
  
  // For values >= 1, use 4-6 decimals
  if (numValue >= 1) {
    return numValue.toFixed(4);
  }
  // For values < 1, use up to 8 decimals, removing trailing zeros
  const formatted = numValue.toFixed(8);
  return formatted.replace(/\.?0+$/, '') || '0';
};

// Format MUSD with 2 decimal places
const formatMUSD = (value: bigint | number): string => {
  const numValue = typeof value === 'bigint' ? Number(formatEther(value)) : value;
  return numValue.toFixed(2);
};

export default function SwapScreen() {
  const router = useRouter();
  const { wallet } = useWallet();
  const { getQuote, getBalance, swap, isLoading, error } = useSwap();

  const [fromToken, setFromToken] = useState<Address>(MUSD_ADDRESS);
  const [toToken, setToToken] = useState<Address>(BTC_ADDRESS);
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState<{ amountOut: bigint; amountOutMin: bigint; price: number } | null>(null);
  const [fromBalance, setFromBalance] = useState<bigint>(0n);
  const [toBalance, setToBalance] = useState<bigint>(0n);
  const [slippage, setSlippage] = useState(0.5); // 0.5% default slippage
  const [isSwapping, setIsSwapping] = useState(false);

  const fromTokenSymbol = fromToken === MUSD_ADDRESS ? 'MUSD' : 'BTC';
  const toTokenSymbol = toToken === MUSD_ADDRESS ? 'MUSD' : 'BTC';

  // Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet.evmAddress) return;

      try {
        const fromBal = await getBalance(fromToken, wallet.evmAddress as Address);
        const toBal = await getBalance(toToken, wallet.evmAddress as Address);
        setFromBalance(fromBal);
        setToBalance(toBal);
      } catch (err) {
        console.error('Error fetching balances:', err);
      }
    };

    fetchBalances();
  }, [wallet.evmAddress, fromToken, toToken, getBalance]);

  // Fetch quote when amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        setQuote(null);
        return;
      }

      try {
        const amountIn = parseEther(fromAmount);
        const slippageBps = Math.floor(slippage * 100); // Convert % to basis points
        const result = await getQuote(fromToken, toToken, amountIn, slippageBps);
        setQuote(result);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setQuote(null);
      }
    };

    fetchQuote();
  }, [fromAmount, fromToken, toToken, slippage, getQuote]);

  const handleSwitch = () => {
    // Switch tokens only if they're different
    if (fromToken !== toToken) {
      const temp = fromToken;
      setFromToken(toToken);
      setToToken(temp);
      setFromAmount('');
      setQuote(null);
    }
  };

  const handleMax = () => {
    if (fromBalance > 0n) {
      // Format based on token type
      const formatted = fromToken === BTC_ADDRESS 
        ? formatBTC(fromBalance)
        : formatMUSD(fromBalance);
      setFromAmount(formatted);
    }
  };

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0 || !quote) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!wallet.isConnected) {
      Alert.alert('Error', 'Please connect your wallet');
      return;
    }

    const amountIn = parseEther(fromAmount);
    if (amountIn > fromBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setIsSwapping(true);
      const slippageBps = Math.floor(slippage * 100);
      const result = await swap(fromToken, toToken, amountIn, quote.amountOutMin, slippageBps);
      
      Alert.alert(
        'Swap Successful!',
        `Transaction: ${result.hash.slice(0, 10)}...`,
        [
          {
            text: 'OK',
            onPress: () => {
              setFromAmount('');
              setQuote(null);
              // Refresh balances
              if (wallet.evmAddress) {
                getBalance(fromToken, wallet.evmAddress as Address).then(setFromBalance);
                getBalance(toToken, wallet.evmAddress as Address).then(setToBalance);
              }
            },
          },
        ],
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      Alert.alert('Swap Failed', errorMessage);
    } finally {
      setIsSwapping(false);
    }
  };

  const fromAmountNum = parseFloat(fromAmount) || 0;
  const toAmountNum = quote ? Number(formatEther(quote.amountOut)) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Swap" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        <Card variant="elevated" style={styles.swapCard}>
          {/* From Token */}
          <View style={styles.tokenSection}>
            <View style={styles.tokenHeader}>
              <Text style={styles.label}>From</Text>
              <TouchableOpacity onPress={handleMax}>
                <Text style={styles.maxButton}>MAX</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.tokenButton}
                onPress={() => {
                  // Toggle between MUSD and BTC, but don't set to same as toToken
                  const newToken = fromToken === MUSD_ADDRESS ? BTC_ADDRESS : MUSD_ADDRESS;
                  if (newToken !== toToken) {
                    setFromToken(newToken);
                    setFromAmount('');
                    setQuote(null);
                  }
                }}>
                <Text style={styles.tokenSymbol}>{fromTokenSymbol}</Text>
                <Ionicons name="chevron-down" size={16} color={DesignColors.light.white} />
              </TouchableOpacity>
              <View style={styles.amountInputContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={fromAmount}
                  onChangeText={setFromAmount}
                  placeholder="0.0"
                  placeholderTextColor={DesignColors.dark.muted}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.balanceText}>
                  Balance: {fromToken === BTC_ADDRESS ? formatBTC(fromBalance) : formatMUSD(fromBalance)} {fromTokenSymbol}
                </Text>
              </View>
            </View>
          </View>

          {/* Switch Button */}
          <TouchableOpacity style={styles.switchButton} onPress={handleSwitch}>
            <View style={styles.switchButtonInner}>
              <Ionicons name="swap-vertical" size={24} color={DesignColors.light.white} />
            </View>
          </TouchableOpacity>

          {/* To Token */}
          <View style={styles.tokenSection}>
            <View style={styles.tokenHeader}>
              <Text style={styles.label}>To</Text>
            </View>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.tokenButton}
                onPress={() => {
                  // Toggle between MUSD and BTC, but don't set to same as fromToken
                  const newToken = toToken === MUSD_ADDRESS ? BTC_ADDRESS : MUSD_ADDRESS;
                  if (newToken !== fromToken) {
                    setToToken(newToken);
                    setQuote(null);
                  }
                }}>
                <Text style={styles.tokenSymbol}>{toTokenSymbol}</Text>
                <Ionicons name="chevron-down" size={16} color={DesignColors.light.white} />
              </TouchableOpacity>
              <View style={styles.amountInputContainer}>
                <Text style={[styles.amountInput, styles.amountOutput]}>
                  {toAmountNum > 0 
                    ? (toToken === BTC_ADDRESS ? formatBTC(toAmountNum) : formatMUSD(toAmountNum))
                    : '0.0'}
                </Text>
                <Text style={styles.balanceText}>
                  Balance: {toToken === BTC_ADDRESS ? formatBTC(toBalance) : formatMUSD(toBalance)} {toTokenSymbol}
                </Text>
              </View>
            </View>
          </View>

          {/* Quote Info */}
          {quote && (
            <View style={styles.quoteInfo}>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Rate</Text>
                <Text style={styles.quoteValue}>
                  1 {fromTokenSymbol} = {
                    fromTokenSymbol === 'BTC' 
                      ? quote.price.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                      : toTokenSymbol === 'BTC'
                        ? formatBTC(parseEther((1 / quote.price).toString()))
                        : quote.price.toFixed(4)
                  } {toTokenSymbol}
                </Text>
              </View>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Slippage</Text>
                <Text style={styles.quoteValue}>{slippage}%</Text>
              </View>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Minimum Received</Text>
                <Text style={styles.quoteValue}>
                  {toToken === BTC_ADDRESS ? formatBTC(quote.amountOutMin) : formatMUSD(quote.amountOutMin)} {toTokenSymbol}
                </Text>
              </View>
            </View>
          )}

          {/* Swap Button */}
          <Button
            title={isSwapping ? 'Swapping...' : 'Swap'}
            onPress={handleSwap}
            variant="primary"
            size="lg"
            style={styles.swapButton}
            disabled={
              isSwapping ||
              !fromAmount ||
              parseFloat(fromAmount) <= 0 ||
              !quote ||
              fromAmountNum > Number(formatEther(fromBalance)) ||
              !wallet.isConnected
            }
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.dark.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  swapCard: {
    padding: Spacing.md,
  },
  tokenSection: {
    marginBottom: Spacing.md,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '500',
  },
  maxButton: {
    color: DesignColors.yellow.primary,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  tokenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: DesignColors.dark.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    minWidth: 100,
  },
  tokenSymbol: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  amountInputContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  amountInput: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 100,
  },
  amountOutput: {
    paddingVertical: Spacing.sm,
  },
  balanceText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.caption.sm.fontSize,
    marginTop: Spacing.xs,
  },
  switchButton: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  switchButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignColors.dark.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DesignColors.dark.primary,
  },
  quoteInfo: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  quoteValue: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '500',
  },
  swapButton: {
    marginTop: Spacing.md,
  },
  errorText: {
    color: DesignColors.error,
    fontSize: Typography.body.sm.fontSize,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

