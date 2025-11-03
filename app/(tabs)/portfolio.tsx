import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMarketFactory } from '@/hooks/useMarketFactory';
import { calculateSharePrice } from '@/utils/amm';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Address } from 'viem';
import { formatEther, formatUnits } from 'viem';

type Position = {
  marketAddress: Address;
  threshold: string;
  expirationTime: number;
  choice: 'Yes' | 'No';
  shares: bigint;
  currentValue: number; // Current value in MUSD
  entryValue: number; // Entry value (estimated)
  change: number;
  changePercent: number;
  isResolved: boolean;
  outcome?: 0 | 1; // 0 = No, 1 = Yes
  closedAt?: string;
  status: 'pending' | 'resolved';
};

export default function PortfolioTab() {
  const [activeSection, setActiveSection] = useState<'open' | 'closed'>('open');
  const router = useRouter();
  const { wallet, connectWallet } = useWallet();
  
  // Get factory address from environment
  const factoryAddress = (process.env.EXPO_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS ||
    '0x0000000000000000000000000000000000000000') as Address;
  
  const { allMarkets, isLoading: marketsLoading } = useMarketFactory(
    factoryAddress !== '0x0000000000000000000000000000000000000000' ? factoryAddress : null
  );
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  // Fetch user positions from all markets
  useEffect(() => {
    const fetchPositions = async () => {
      if (!wallet.evmAddress || !allMarkets || allMarkets.length === 0) {
        setPositions([]);
        return;
      }

      setIsLoadingPositions(true);
      const userPositions: Position[] = [];

      for (const marketAddress of allMarkets) {
        try {
          // We'd need to use usePredictionMarket hook, but hooks can't be called conditionally
          // For now, we'll create a client directly
          const { PredictionMarketClient } = await import('@/lib/contracts/PredictionMarket');
          const { createPublicClient, http } = await import('viem');
          
          const mezoTestnetChain = {
            id: 31611,
            name: 'Mezo Testnet',
            nativeCurrency: { decimals: 18, name: 'Bitcoin', symbol: 'BTC' },
            rpcUrls: { default: { http: ['https://rpc.test.mezo.org'] } },
            blockExplorers: { default: { name: 'Mezo Explorer', url: 'https://explorer.test.mezo.org' } },
            testnet: true,
          };

          const publicClient = createPublicClient({
            chain: mezoTestnetChain,
            transport: http('https://rpc.test.mezo.org'),
          });

          const marketClient = new PredictionMarketClient(
            marketAddress,
            publicClient,
            undefined,
          );

          const [marketData, reserves, userPosition] = await Promise.all([
            marketClient.getMarketData(),
            marketClient.getReserves(),
            marketClient.getUserPosition(wallet.evmAddress as Address),
          ]);

          // Check if user has any shares
          if (userPosition.yesShares > 0n || userPosition.noShares > 0n) {
            const threshold = formatUnits(marketData.threshold, 18);
            const isResolved = marketData.status === 1; // Resolved status
            
            // Calculate current value and P&L
            if (userPosition.yesShares > 0n) {
              const sharePrice = calculateSharePrice(reserves.reserveYes, reserves.reserveNo, true);
              const currentValue = Number(formatEther(userPosition.yesShares)) * sharePrice;
              const entryValue = Number(formatEther(userPosition.yesShares)); // Estimate 1:1 entry
              const change = currentValue - entryValue;
              const changePercent = entryValue > 0 ? (change / entryValue) * 100 : 0;

              userPositions.push({
                marketAddress,
                threshold,
                expirationTime: Number(marketData.expirationTime),
                choice: 'Yes',
                shares: userPosition.yesShares,
                currentValue,
                entryValue,
                change,
                changePercent,
                isResolved,
                outcome: marketData.outcome,
                status: isResolved ? 'resolved' : 'pending',
                closedAt: isResolved
                  ? new Date(Number(marketData.expirationTime) * 1000).toLocaleDateString()
                  : undefined,
              });
            }

            if (userPosition.noShares > 0n) {
              const sharePrice = calculateSharePrice(reserves.reserveYes, reserves.reserveNo, false);
              const currentValue = Number(formatEther(userPosition.noShares)) * sharePrice;
              const entryValue = Number(formatEther(userPosition.noShares)); // Estimate 1:1 entry
              const change = currentValue - entryValue;
              const changePercent = entryValue > 0 ? (change / entryValue) * 100 : 0;

              userPositions.push({
                marketAddress,
                threshold,
                expirationTime: Number(marketData.expirationTime),
                choice: 'No',
                shares: userPosition.noShares,
                currentValue,
                entryValue,
                change,
                changePercent,
                isResolved,
                outcome: marketData.outcome,
                status: isResolved ? 'resolved' : 'pending',
                closedAt: isResolved
                  ? new Date(Number(marketData.expirationTime) * 1000).toLocaleDateString()
                  : undefined,
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching position for market ${marketAddress}:`, error);
        }
      }

      setPositions(userPositions);
      setIsLoadingPositions(false);
    };

    if (wallet.evmAddress && allMarkets && allMarkets.length > 0) {
      fetchPositions();
    } else {
      setPositions([]);
    }
  }, [wallet.evmAddress, allMarkets]);

  // Filter positions by section
  const filteredPositions = useMemo(() => {
    return positions.filter((pos) =>
      activeSection === 'open' ? pos.status === 'pending' : pos.status === 'resolved'
    );
  }, [positions, activeSection]);

  // Calculate totals
  const { inPositions, totalChange, totalChangePercent } = useMemo(() => {
    const openPositions = positions.filter((p) => p.status === 'pending');
    const totalValue = openPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const totalEntry = openPositions.reduce((sum, pos) => sum + pos.entryValue, 0);
    const totalChange = totalValue - totalEntry;
    const totalChangePercent = totalEntry > 0 ? (totalChange / totalEntry) * 100 : 0;

    return {
      inPositions: totalValue,
      totalChange,
      totalChangePercent,
    };
  }, [positions]);

  // Show connect wallet screen if not connected
  if (!wallet.isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Portfolio" showClose={false} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.connectWalletContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Decorative Icons */}
          <View style={styles.decorativeIcons}>
            <Ionicons name="heart-outline" size={32} color={DesignColors.light.white} style={styles.decorativeIcon} />
            <Ionicons name="eye-outline" size={32} color={DesignColors.light.white} style={styles.decorativeIcon} />
            <View style={[styles.decorativeIcon, styles.decorativeCircle]}>
              <Ionicons name="ellipse" size={24} color={DesignColors.yellow.primary} />
            </View>
            <Ionicons name="stats-chart" size={32} color={DesignColors.yellow.primary} style={styles.decorativeIcon} />
          </View>

          {/* Connect Wallet Button */}
          <Button
            title="Connect Wallet"
            onPress={connectWallet}
            variant="primary"
            size="lg"
            style={styles.connectWalletButton}
          />

          {/* Tabs (inactive state) */}
          <View style={styles.tabsContainer}>
            <View style={[styles.tab, styles.inactiveTab]}>
              <Text style={styles.inactiveTabText}>Open</Text>
            </View>
            <View style={[styles.tab, styles.inactiveTab]}>
              <Text style={styles.inactiveTabText}>Closed</Text>
            </View>
          </View>

          {/* Call to Action Text */}
          <Text style={styles.ctaText}>
            Connect wallet, get 500 coins, make your first prediction
          </Text>

          {/* Bottom Decorative Elements */}
          <View style={styles.bottomDecorations}>
            <View style={styles.gameController}>
              <Ionicons name="game-controller-outline" size={40} color={DesignColors.light.white} />
              <View style={styles.controllerScreen}>
                <Ionicons name="trending-up" size={20} color={DesignColors.yellow.primary} />
              </View>
            </View>
            <Ionicons name="diamond" size={32} color={DesignColors.yellow.primary} style={styles.coinIcon} />
            <Ionicons name="arrow-up-circle" size={40} color={DesignColors.purple.primary} style={styles.arrowIcon} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Portfolio" showClose={false} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header Metrics with Purple Gradient */}
        <View style={styles.metricsContainer}>
          <View style={[styles.metricItem, styles.gradientCard]}>
            <Text style={styles.metricLabel}>In positions</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValue}>{inPositions.toLocaleString()}</Text>
              <View style={styles.coinIconContainer}>
                <Ionicons name="diamond" size={20} color={DesignColors.yellow.primary} />
              </View>
            </View>
            <View style={styles.metricChange}>
              <Ionicons name="arrow-up" size={16} color={DesignColors.success} />
              <Text style={[styles.metricChangeText, { color: DesignColors.success }]}>
                +{totalChangePercent}% ({totalChange.toFixed(2)})
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'open' && styles.activeTab]}
            onPress={() => setActiveSection('open')}>
            <Text
              style={[
                styles.tabText,
                activeSection === 'open' && styles.activeTabText,
              ]}>
              Open
            </Text>
            {activeSection === 'open' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'closed' && styles.activeTab]}
            onPress={() => setActiveSection('closed')}>
            <Text
              style={[
                styles.tabText,
                activeSection === 'closed' && styles.activeTabText,
              ]}>
              Closed
            </Text>
            {activeSection === 'closed' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>
              {filteredPositions.length} {filteredPositions.length === 1 ? 'position' : 'positions'}
            </Text>
          </View>
          {activeSection === 'closed' && (
            <Button
              title="Claim Rewards"
              onPress={() => router.push('/claim-rewards')}
              variant="primary"
              size="md"
              style={styles.claimButton}
            />
          )}
        </View>

        {/* Loading State */}
        {isLoadingPositions && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={DesignColors.yellow.primary} />
            <Text style={styles.loadingText}>Loading positions...</Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoadingPositions && filteredPositions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={48} color={DesignColors.dark.muted} />
            <Text style={styles.emptyText}>
              No {activeSection === 'open' ? 'open' : 'closed'} positions
            </Text>
            <Text style={styles.emptySubtext}>
              {activeSection === 'open'
                ? 'Start trading to see your positions here'
                : 'Closed positions will appear here'}
            </Text>
          </View>
        )}

        {/* Positions List */}
        {filteredPositions.map((position, index) => (
          <Card key={`${position.marketAddress}-${position.choice}-${index}`} variant="elevated" style={styles.positionCard}>
            {activeSection === 'closed' && (
              <View style={styles.closedLabelContainer}>
                <Text style={styles.closedLabel}>Closed</Text>
              </View>
            )}
            <View style={styles.positionHeader}>
              <TouchableOpacity style={styles.bookmarkButton}>
                <Ionicons
                  name="bookmark-outline"
                  size={20}
                  color={DesignColors.light.white}
                />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={DesignColors.light.white}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.positionContent}>
              <View style={styles.bitcoinIconContainer}>
                <Text style={styles.bitcoinSymbol}>₿</Text>
              </View>
              <View style={styles.positionInfo}>
                <Text style={styles.positionQuestion}>
                  Will BTC be {position.choice === 'Yes' ? 'above' : 'below'} ${position.threshold}?
                </Text>
                <View style={styles.positionDetails}>
                  <TouchableOpacity 
                    style={[
                      styles.choiceButton,
                      position.choice === 'Yes' && styles.choiceButtonActive,
                    ]}
                    disabled>
                    <Text style={[
                      styles.choiceButtonText,
                      position.choice === 'Yes' && styles.choiceButtonTextActive,
                    ]}>
                      {position.choice}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.positionShares}>
                    {parseFloat(formatEther(position.shares)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })} shares
                  </Text>
                </View>
                <View style={styles.positionValueRow}>
                  <View style={styles.valueContainer}>
                    <Ionicons name="diamond" size={16} color={DesignColors.yellow.primary} />
                    <Text style={styles.positionValue}>
                      {position.currentValue.toFixed(2)}
                    </Text>
                  </View>
                  {position.change !== 0 && (
                    <Text
                      style={[
                        styles.positionChange,
                        {
                          color:
                            position.change > 0
                              ? DesignColors.success
                              : DesignColors.error,
                        },
                      ]}>
                      {position.change > 0 ? '+' : ''}
                      {position.change.toFixed(2)} ({Math.abs(position.changePercent).toFixed(1)}%)
                    </Text>
                  )}
                  {activeSection === 'closed' && position.closedAt && (
                    <Text style={styles.closedTime}>Closed {position.closedAt}</Text>
                  )}
                </View>
              </View>
            </View>
          </Card>
        ))}
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
  connectWalletContent: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  decorativeIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
    marginTop: Spacing.xxl,
  },
  decorativeIcon: {
    opacity: 0.6,
  },
  decorativeCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectWalletButton: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  inactiveTab: {
    opacity: 0.5,
  },
  inactiveTabText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
  },
  ctaText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  bottomDecorations: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xl,
    position: 'absolute',
    bottom: Spacing.xxl,
  },
  gameController: {
    position: 'relative',
  },
  controllerScreen: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 20,
    height: 12,
    backgroundColor: DesignColors.yellow.primary,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIcon: {
    opacity: 0.8,
  },
  arrowIcon: {
    opacity: 0.8,
  },
  metricsContainer: {
    marginBottom: Spacing.md,
  },
  metricItem: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  gradientCard: {
    backgroundColor: DesignColors.purple.primary,
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  coinIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.xl.fontSize,
    fontWeight: 'bold',
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metricChangeText: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
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
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: DesignColors.dark.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  claimButton: {
    flex: 1,
  },
  positionCard: {
    marginBottom: Spacing.md,
  },
  closedLabelContainer: {
    marginBottom: Spacing.sm,
  },
  closedLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.caption.md.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bookmarkButton: {},
  positionContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  bitcoinIconContainer: {
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
  positionInfo: {
    flex: 1,
  },
  positionQuestion: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  positionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  choiceButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: DesignColors.dark.secondary,
    borderWidth: 1,
    borderColor: DesignColors.dark.muted,
  },
  choiceButtonActive: {
    backgroundColor: DesignColors.yellow.primary,
    borderColor: DesignColors.yellow.primary,
  },
  choiceButtonText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
  },
  choiceButtonTextActive: {
    color: DesignColors.dark.primary,
  },
  positionShares: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  positionValueRow: {
    flexDirection: 'column',
    gap: Spacing.xs,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  positionValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
  },
  positionChange: {
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '500',
  },
  closedTime: {
    color: DesignColors.dark.muted,
    fontSize: Typography.caption.md.fontSize,
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    textAlign: 'center',
  },
});

