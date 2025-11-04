import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mezoTestnetChain } from '@/constants/chain';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { usePredictionMarket } from '@/hooks/usePredictionMarket';
import { MezoIntegrationClient } from '@/lib/contracts/MezoIntegration';
import { formatShares } from '@/utils/format-shares';
import { Ionicons } from '@expo/vector-icons';
import { useAccount } from '@reown/appkit-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createPublicClient, formatEther, formatUnits, http, type Address, type WalletClient } from 'viem';
import { useWalletClient } from 'wagmi';

export default function RedeemScreen() {
  const params = useLocalSearchParams<{ marketAddress?: string }>();
  const router = useRouter();
  const { wallet } = useWallet();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const marketAddress = params.marketAddress as `0x${string}` | undefined;
  
  const {
    marketData,
    userPosition,
    isLoading: marketLoading,
    error: marketError,
    redeem,
    fetchMarketData,
  } = usePredictionMarket(marketAddress || null);

  const [isRedeeming, setIsRedeeming] = useState(false);
  const [autoRepayEnabled, setAutoRepayEnabled] = useState(false);
  const [isCheckingAutoRepay, setIsCheckingAutoRepay] = useState(false);

  // Check if market is resolved or expired
  const isResolved = marketData?.status === 1;
  const expirationTime = marketData?.expirationTime ? Number(marketData.expirationTime) * 1000 : 0;
  const isExpired = Date.now() >= expirationTime;
  const outcome = marketData?.outcome; // 0 = No, 1 = Yes (only available if resolved)

  // Determine winning shares (if resolved) or potential winning shares (if expired but not resolved)
  // For expired but not resolved markets, we can't determine the outcome yet, so we show all shares as potentially redeemable
  const winningShares = isResolved 
    ? (outcome === 1 ? userPosition?.yesShares || 0n : userPosition?.noShares || 0n)
    : (userPosition?.yesShares || 0n) + (userPosition?.noShares || 0n); // If expired but not resolved, show all shares
  const losingShares = isResolved
    ? (outcome === 1 ? userPosition?.noShares || 0n : userPosition?.yesShares || 0n)
    : 0n;
  const hasWinningShares = winningShares > 0n;
  const isWinningSide = isResolved ? (outcome === 1 ? 'Yes' : 'No') : 'Pending';

  // Check auto-repay status
  useEffect(() => {
    const checkAutoRepay = async () => {
      if (!wallet.evmAddress || !hasWinningShares) return;

      try {
        setIsCheckingAutoRepay(true);
        const integrationAddress = process.env.EXPO_PUBLIC_MEZO_INTEGRATION_ADDRESS as Address | undefined;
        if (!integrationAddress) {
          setAutoRepayEnabled(false);
          return;
        }

        const rpcUrl = process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';
        const publicClient = createPublicClient({
          chain: mezoTestnetChain,
          transport: http(rpcUrl),
        });

        // For read operations, wallet client is optional
        const integrationClient = new MezoIntegrationClient(
          integrationAddress,
          publicClient,
          undefined, // Read-only operation doesn't need wallet client
        );

        const enabled = await integrationClient.isAutoRepayEnabled(wallet.evmAddress as Address);
        setAutoRepayEnabled(enabled);
      } catch (error) {
        console.error('Error checking auto-repay:', error);
        setAutoRepayEnabled(false);
      } finally {
        setIsCheckingAutoRepay(false);
      }
    };

    checkAutoRepay();
  }, [wallet.evmAddress, hasWinningShares]);

  const handleRedeem = async (amount: bigint | 'all' = 'all') => {
    if (!marketAddress) {
      Alert.alert('Error', 'Market address is required');
      return;
    }
    
    if (!isResolved && !isExpired) {
      Alert.alert('Error', 'Market must be expired or resolved before redeeming');
      return;
    }
    
    if (isExpired && !isResolved) {
      Alert.alert('Market Pending Resolution', 'This market has expired but is awaiting resolution. Please wait for the market to be resolved before redeeming your shares.');
      return;
    }

    if (!hasWinningShares) {
      Alert.alert('Error', 'You don\'t have any winning shares to redeem');
      return;
    }

    const sharesToRedeem = amount === 'all' ? winningShares : amount;
    if (sharesToRedeem > winningShares) {
      Alert.alert('Error', 'Cannot redeem more shares than you have');
      return;
    }

    try {
      setIsRedeeming(true);
      
      const result = await redeem({
        isYes: outcome === 1,
        sharesAmount: sharesToRedeem,
      });

      Alert.alert(
        'Success',
        `Successfully redeemed ${formatShares(sharesToRedeem)} shares! Transaction: ${result.hash.slice(0, 10)}...`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to redeem shares';
      Alert.alert('Error', errorMessage);
      console.error('Redeem error:', error);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleAutoRepayToggle = async () => {
    const integrationAddress = process.env.EXPO_PUBLIC_MEZO_INTEGRATION_ADDRESS as Address | undefined;
    if (!integrationAddress) {
      Alert.alert('Error', 'Mezo Integration not configured');
      return;
    }

    if (!address) {
      Alert.alert('Error', 'Wallet not connected. Please connect your wallet first.');
      return;
    }

    if (!walletClient) {
      Alert.alert('Error', 'Wallet client not available. Please ensure your wallet is connected and try again.');
      return;
    }

    try {
      setIsCheckingAutoRepay(true);
      const rpcUrl = process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';
      const publicClient = createPublicClient({
        chain: mezoTestnetChain,
        transport: http(rpcUrl),
      });

      // Create MezoIntegrationClient with wallet client for write operations
      const integrationClient = new MezoIntegrationClient(
        integrationAddress,
        publicClient,
        walletClient as WalletClient,
      );

      // Toggle auto-repay setting
      const newValue = !autoRepayEnabled;
      await integrationClient.setAutoRepay(newValue);
      
      setAutoRepayEnabled(newValue);
      Alert.alert('Success', `Auto-repay ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling auto-repay:', error);
      Alert.alert(
        'Error',
        `Failed to toggle auto-repay: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure your wallet is connected and you have approved transactions.`,
      );
    } finally {
      setIsCheckingAutoRepay(false);
    }
  };

  if (!marketAddress) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Redeem" showClose={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Market address is required</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (marketLoading && !marketData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Redeem" showClose={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DesignColors.yellow.primary} />
          <Text style={styles.loadingText}>Loading market data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (marketError || !marketData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Redeem" showClose={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {marketError || 'Failed to load market data'}
          </Text>
          <Button
            title="Retry"
            onPress={fetchMarketData}
            variant="primary"
            size="md"
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Format threshold and resolved price
  const threshold = formatUnits(marketData.threshold, 18);
  const resolvedPrice = marketData.resolvedPrice > 0n
    ? formatUnits(marketData.resolvedPrice, 18)
    : null;
  const question = `Will Bitcoin price be above $${threshold}?`;

  const payoutAmount = winningShares; // 1:1 payout in MUSD

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Redeem" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Market Status Card */}
        <Card variant="elevated" style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.bitcoinIcon}>
              <Text style={styles.bitcoinSymbol}>₿</Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.question}>{question}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>RESOLVED</Text>
              </View>
            </View>
          </View>
          
          {resolvedPrice && (
            <View style={styles.resolutionInfo}>
              <Text style={styles.resolutionLabel}>BTC Price at Resolution:</Text>
              <Text style={styles.resolutionPrice}>${parseFloat(resolvedPrice).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}</Text>
            </View>
          )}
          
          <View style={styles.outcomeInfo}>
            <Text style={styles.outcomeLabel}>Outcome:</Text>
            <View style={[styles.outcomeBadge, outcome === 1 ? styles.outcomeWin : styles.outcomeLose]}>
              <Text style={styles.outcomeText}>{isWinningSide}</Text>
            </View>
          </View>
        </Card>

        {/* Winning Shares Card */}
        {hasWinningShares ? (
          <Card variant="elevated" style={styles.winningCard}>
            <Text style={styles.cardTitle}>Winning Shares</Text>
            <View style={styles.sharesInfo}>
              <View style={styles.sharesRow}>
                <Text style={styles.sharesLabel}>{isWinningSide} Shares:</Text>
                <Text style={styles.sharesValue}>
                  {formatShares(winningShares)}
                </Text>
              </View>
              <View style={styles.payoutRow}>
                <View style={styles.payoutLabelRow}>
                  <Ionicons name="diamond" size={20} color={DesignColors.yellow.primary} />
                  <Text style={styles.payoutLabel}>Total Payout:</Text>
                </View>
                <Text style={styles.payoutValue}>
                  {parseFloat(formatEther(payoutAmount)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} MUSD
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card variant="elevated" style={styles.noWinningsCard}>
            <Ionicons name="close-circle" size={48} color={DesignColors.error} />
            <Text style={styles.noWinningsText}>No Winning Shares</Text>
            <Text style={styles.noWinningsSubtext}>
              You don't have any {isWinningSide} shares to redeem
            </Text>
            {losingShares > 0n && (
              <Text style={styles.losingSharesText}>
                You have {formatShares(losingShares)} {outcome === 1 ? 'No' : 'Yes'} shares (losing position)
              </Text>
            )}
          </Card>
        )}

        {/* Auto-Repay Option */}
        {hasWinningShares && (
          <Card variant="elevated" style={styles.autoRepayCard}>
            <View style={styles.autoRepayHeader}>
              <View style={styles.autoRepayInfo}>
                <Text style={styles.autoRepayTitle}>Auto-Repay Mezo Debt</Text>
                <Text style={styles.autoRepayDescription}>
                  Automatically repay your Mezo debt from winnings
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, autoRepayEnabled && styles.toggleActive]}
                onPress={handleAutoRepayToggle}
                disabled={isCheckingAutoRepay}>
                {isCheckingAutoRepay ? (
                  <ActivityIndicator size="small" color={DesignColors.light.white} />
                ) : (
                  <View style={[styles.toggleThumb, autoRepayEnabled && styles.toggleThumbActive]} />
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Redeem Buttons */}
        {hasWinningShares && (
          <View style={styles.buttonContainer}>
            <Button
              title={isRedeeming ? 'Redeeming...' : `Redeem All (${formatShares(winningShares)} shares)`}
              onPress={() => handleRedeem('all')}
              variant="primary"
              size="lg"
              style={styles.redeemButton}
              disabled={isRedeeming}
            />
          </View>
        )}
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
    paddingBottom: 20,
  },
  statusCard: {
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  bitcoinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignColors.yellow.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bitcoinSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DesignColors.dark.primary,
  },
  statusInfo: {
    flex: 1,
  },
  question: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    backgroundColor: DesignColors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: DesignColors.dark.primary,
    fontSize: Typography.caption.md.fontSize,
    fontWeight: '700',
  },
  resolutionInfo: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignColors.dark.muted,
  },
  resolutionLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  resolutionPrice: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
  },
  outcomeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  outcomeLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
  },
  outcomeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  outcomeWin: {
    backgroundColor: DesignColors.success,
  },
  outcomeLose: {
    backgroundColor: DesignColors.error,
  },
  outcomeText: {
    color: DesignColors.dark.primary,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '700',
  },
  winningCard: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  sharesInfo: {
    gap: Spacing.md,
  },
  sharesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharesLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
  },
  sharesValue: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  payoutRow: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignColors.dark.muted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  payoutLabel: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  payoutValue: {
    color: DesignColors.yellow.primary,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
  },
  noWinningsCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    padding: Spacing.xl,
  },
  noWinningsText: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  noWinningsSubtext: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    textAlign: 'center',
  },
  losingSharesText: {
    color: DesignColors.error,
    fontSize: Typography.body.sm.fontSize,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  autoRepayCard: {
    marginBottom: Spacing.lg,
  },
  autoRepayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoRepayInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  autoRepayTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  autoRepayDescription: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: DesignColors.dark.secondary,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: DesignColors.yellow.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DesignColors.light.white,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  redeemButton: {
    marginTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    color: DesignColors.error,
    fontSize: Typography.body.md.fontSize,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
});

