import { AppHeader } from '@/components/app-header';
import { CollateralHealth } from '@/components/collateral-health';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMezo } from '@/hooks/useMezo';
import { resetOnboarding } from '@/utils/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WalletTab() {
  const router = useRouter();
  const { wallet, formatAddress, refreshBalances, connectWallet } = useWallet();
  const { mezoClient, collateralInfo, isLoading: mezoLoading, refetch } = useMezo();
  const [btcPrice, setBtcPrice] = useState(100000); // Default BTC price

  // Refresh balances when screen comes into focus (only if connected)
  useFocusEffect(
    useCallback(() => {
      if (wallet.isConnected) {
        refreshBalances();
        refetch(); // Also refresh Mezo collateral info
      }
    }, [refreshBalances, refetch, wallet.isConnected]),
  );

  // Fetch BTC price (only if connected)
  useEffect(() => {
    const fetchBTCPrice = async () => {
      if (mezoClient && wallet.evmAddress && wallet.isConnected) {
        try {
          // MezoClient.getBtcPrice() already handles errors and returns a fallback value
          const price = await mezoClient.getBtcPrice();
          // BTC price on Mezo is in wei (18 decimals), convert to USD
          setBtcPrice(Number(price) / 1e18);
        } catch (error) {
          // If MezoClient fails completely, use default price
          // This shouldn't happen as MezoClient has its own fallback, but just in case
          console.warn('Failed to fetch BTC price, using default:', error);
          setBtcPrice(100000); // Default fallback
        }
      }
    };
    fetchBTCPrice();
  }, [mezoClient, wallet.evmAddress, wallet.isConnected]);

  const handleResetOnboarding = async () => {
    try {
      await resetOnboarding();
      Alert.alert('Success', 'Onboarding reset. Please restart the app to see onboarding again.');
    } catch (error) {
      Alert.alert('Error', 'Failed to reset onboarding');
      console.error('Error resetting onboarding:', error);
    }
  };

  // Show connect wallet screen if not connected
  if (!wallet.isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Wallet" showClose={false} rightActions={
          <Button
            title=""
            onPress={handleResetOnboarding}
            variant="outline"
            size="sm"
            style={styles.debugButton}
            leftIcon={<Ionicons name="refresh" size={16} color={DesignColors.dark.muted} />}
          />} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.connectWalletContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Decorative Icons */}
          <View style={styles.decorativeIcons}>
            <Ionicons name="wallet-outline" size={64} color={DesignColors.yellow.primary} style={styles.decorativeIcon} />
          </View>

          {/* Empty State Content */}
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateTitle}>Connect Your Wallet</Text>
            <Text style={styles.emptyStateText}>
              Connect your wallet to view balances, manage your trove, and start borrowing MUSD.
            </Text>
          </View>

          {/* Connect Wallet Button */}
          <Button
            title="Connect Wallet"
            onPress={() => connectWallet('evm')}
            variant="primary"
            size="lg"
            style={styles.connectWalletButton}
            leftIcon={<Ionicons name="wallet" size={20} color={DesignColors.dark.primary} />}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Calculate total balance in USD (only shown when connected)
  const nativeBalance = parseFloat(wallet.evmBalance || wallet.btcBalance || '0'); // BTC balance
  const musdBalance = parseFloat(wallet.musdBalance || '0'); // MUSD balance (already in USD)
  const btcValueUSD = nativeBalance * btcPrice; // Convert BTC to USD
  const totalBalance = btcValueUSD + musdBalance; // Total in USD

  // In positions = borrowed MUSD (debt)
  const inPositions = parseFloat(collateralInfo?.borrowedMUSD || '0');
  
  // Calculate change from previous balance (simplified for MVP)
  // In a production app, you'd store historical balances in AsyncStorage or a backend
  // For now, we'll show 0% change as we don't have historical data storage implemented
  const changePercent = 0; // TODO: Implement historical balance tracking for accurate change calculation
  const changeAmount = 0; // TODO: Calculate from stored historical balance data

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader 
        title="Wallet" 
        showClose={false}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Wallet Header Card with Gradient */}
        <View style={[styles.walletCard, styles.gradient]}>
          <View style={styles.gradientInner}>
            <View style={styles.walletHeader}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color={DesignColors.light.white} />
                </View>
                <Text style={styles.greeting}>Hi, Legion</Text>
              </View>
            </View>
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Total balance</Text>
              <Text style={styles.balanceValue}>
                ${totalBalance > 0 ? totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </Text>
              <Text style={styles.balanceSubtext}>
                {nativeBalance > 0 && `${nativeBalance.toFixed(4)} BTC`}
                {nativeBalance > 0 && musdBalance > 0 && ' + '}
                {musdBalance > 0 && `${musdBalance.toFixed(2)} MUSD`}
              </Text>
            </View>
            {wallet.evmAddress && (
              <View style={styles.walletIdContainer}>
                <Ionicons name="wallet" size={12} color={DesignColors.yellow.primary} />
                <Text style={styles.walletId}>{formatAddress(wallet.evmAddress)}</Text>
              </View>
            )}
            <View style={styles.actionButtons}>
              <Button
                title="Borrow MUSD"
                onPress={() => router.push('/borrow' as any)}
                variant="primary"
                size="md"
                leftIcon={<Ionicons name="add" size={20} color={DesignColors.dark.primary} />}
                style={styles.fullWidthButton}
              />
              <Button
                title="Check Borrowing Power"
                onPress={() => router.push('/check-borrowing-power' as any)}
                variant="outline"
                size="md"
                leftIcon={<Ionicons name="calculator" size={20} color={DesignColors.yellow.primary} />}
                style={styles.fullWidthButton}
              />
              <Button
                title="Swap"
                onPress={() => router.push('/swap' as any)}
                variant="outline"
                size="md"
                leftIcon={<Ionicons name="swap-horizontal" size={20} color={DesignColors.yellow.primary} />}
                style={styles.fullWidthButton}
              />
            </View>
          </View>
        </View>

        {/* Collateral Health (if user has a trove) */}
        {collateralInfo && parseFloat(collateralInfo.btcCollateral) > 0 && (
          <CollateralHealth
            collateralRatio={collateralInfo.collateralRatio}
            healthStatus={collateralInfo.healthStatus}
            btcCollateral={collateralInfo.btcCollateral}
            borrowedMUSD={collateralInfo.borrowedMUSD}
            maxBorrowable={collateralInfo.maxBorrowable}
          />
        )}

        {/* Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>In positions (Borrowed MUSD)</Text>
            <Text style={styles.metricValue}>{inPositions.toLocaleString()}</Text>
            {changePercent > 0 && (
              <View style={styles.metricChange}>
                <Text style={[styles.metricChangeText, { color: DesignColors.success }]}>
                  +{changePercent}% ({changeAmount})
                </Text>
              </View>
            )}
          </View>
          {collateralInfo && parseFloat(collateralInfo.btcCollateral) > 0 && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>BTC Collateral</Text>
              <Text style={styles.metricValue}>
                {parseFloat(collateralInfo.btcCollateral).toFixed(4)}
              </Text>
              <Text style={styles.metricSubtext}>Deposited in Mezo</Text>
            </View>
          )}
        </View>

        {/* Borrow Section Header - Only show if user has a trove */}
        {collateralInfo && parseFloat(collateralInfo.borrowedMUSD) > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Borrow Management</Text>
          </View>
        )}

        {/* Borrow Management Section */}
        {collateralInfo && parseFloat(collateralInfo.borrowedMUSD) > 0 && (
          <View style={styles.borrowSection}>
            <Card variant="elevated" style={styles.borrowCard}>
              {/* Header with Icon */}
              <View style={styles.troveHeader}>
                <View style={styles.troveIconContainer}>
                  <Ionicons name="shield-checkmark" size={24} color={DesignColors.yellow.primary} />
                </View>
                <View style={styles.troveHeaderText}>
                  <Text style={styles.borrowTitle}>Manage Your Trove</Text>
                  <Text style={styles.borrowSubtitle}>Monitor and manage your collateral position</Text>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.troveStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Collateral</Text>
                  <Text style={styles.statValue}>
                    {parseFloat(collateralInfo.btcCollateral || '0').toFixed(4)} BTC
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Debt</Text>
                  <Text style={styles.statValue}>
                    {parseFloat(collateralInfo.borrowedMUSD || '0').toFixed(2)} MUSD
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Health</Text>
                  <View style={styles.healthBadge}>
                    <View style={[
                      styles.healthDot,
                      { backgroundColor: collateralInfo.healthStatus === 'healthy' ? DesignColors.success : 
                                         collateralInfo.healthStatus === 'warning' ? DesignColors.warning : 
                                         DesignColors.error }
                    ]} />
                    <Text style={[
                      styles.statValue,
                      { color: collateralInfo.healthStatus === 'healthy' ? DesignColors.success : 
                              collateralInfo.healthStatus === 'warning' ? DesignColors.warning : 
                              DesignColors.error }
                    ]}>
                      {collateralInfo.healthStatus === 'healthy' ? 'Healthy' :
                       collateralInfo.healthStatus === 'warning' ? 'Warning' : 'Danger'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.borrowActions}>
                <Button
                  title="View Your Loan"
                  onPress={() => router.push('/your-loan' as any)}
                  variant="primary"
                  size="md"
                  style={styles.borrowActionButton}
                  leftIcon={<Ionicons name="document-text" size={20} color={DesignColors.dark.primary} />}
                />
                <Button
                  title="Add Collateral"
                  onPress={() => router.push('/add-collateral' as any)}
                  variant="outline"
                  size="md"
                  style={styles.borrowActionButton}
                  leftIcon={<Ionicons name="add-circle-outline" size={20} color={DesignColors.yellow.primary} />}
                />
                <Button
                  title="Repay MUSD"
                  onPress={() => router.push('/repay-debt' as any)}
                  variant="secondary"
                  size="md"
                  style={styles.borrowActionButton}
                  leftIcon={<Ionicons name="arrow-down-circle-outline" size={20} color={DesignColors.light.white} />}
                />
              </View>
            </Card>
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
  walletCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  gradient: {
    backgroundColor: DesignColors.purple.primary,
  },
  gradientInner: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  walletHeader: {
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: DesignColors.light.white,
    fontSize: Typography.body.lg.fontSize,
    fontWeight: '500',
  },
  balanceSection: {
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  balanceValue: {
    color: DesignColors.light.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  balanceSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: Typography.body.sm.fontSize,
    marginTop: Spacing.xs,
  },
  walletIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  walletId: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
  },
  actionButtons: {
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.md,
  },
  fullWidthButton: {
    width: '100%',
  },
  metricsContainer: {
    marginBottom: Spacing.md,
  },
  metricItem: {
    backgroundColor: DesignColors.dark.card,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  metricLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.lg.fontSize,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  metricChange: {
    flexDirection: 'row',
  },
  metricChangeText: {
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
  },
  metricSubtext: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  sectionHeaderText: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
  },
  borrowSection: {
    marginBottom: Spacing.md,
  },
  borrowCard: {
    padding: Spacing.lg,
  },
  troveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  troveIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DesignColors.dark.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DesignColors.yellow.primary,
  },
  troveHeaderText: {
    flex: 1,
  },
  borrowTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  borrowSubtitle: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  troveStats: {
    flexDirection: 'row',
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  statValue: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: DesignColors.dark.muted,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  borrowActions: {
    gap: Spacing.sm,
  },
  borrowActionButton: {
    width: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.dark.muted,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: DesignColors.light.white,
  },
  tabText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '500',
  },
  activeTabText: {
    color: DesignColors.light.white,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: DesignColors.light.white,
  },
  checkInCard: {
    marginBottom: Spacing.md,
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkInText: {
    flex: 1,
  },
  checkInTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  checkInSubtitle: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  tasksContainer: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  taskCard: {
    marginBottom: Spacing.sm,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DesignColors.dark.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  taskPoints: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  connectWalletContent: {
    flex: 1,
    padding: Spacing.md,
    paddingTop: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorativeIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  decorativeIcon: {
    opacity: 0.8,
  },
  emptyStateContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  emptyStateTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.lg.fontSize,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    textAlign: 'center',
    lineHeight: 24,
  },
  connectWalletButton: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  debugButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 40,
  },
});

