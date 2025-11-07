/**
 * Your Loan Dashboard Screen
 * 
 * Comprehensive view of user's loan position with metrics, actions, and transaction history
 */

import { AppHeader } from '@/components/app-header';
import { LoanMetricCard } from '@/components/loan-metric-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMezo } from '@/hooks/useMezo';
import { calculateLiquidationPriceBuffer, calculateLiquidationPriceFromDebt, formatBTC, formatUSD } from '@/utils/loan-calculations';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { formatEther } from 'viem';

interface Transaction {
  id: string;
  type: 'loan_issued' | 'collateral_added' | 'debt_repaid' | 'debt_withdrawn' | 'trove_closed';
  amount: string;
  amountUnit: 'MUSD' | 'BTC';
  timestamp: number;
  txHash?: string;
  description: string;
}

export default function YourLoanScreen() {
  const router = useRouter();
  const { wallet } = useWallet();
  const { mezoClient, collateralInfo, isLoading, error, refetch } = useMezo();
  
  const [btcPrice, setBtcPrice] = useState(100000);
  const [interestRate, setInterestRate] = useState(1.0); // Default 1% APR
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);

  // Refresh collateral info when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (wallet.isConnected && refetch) {
        refetch();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet.isConnected]) // Only depend on wallet.isConnected to avoid infinite loops
  );

  // Fetch BTC price and interest rate
  useEffect(() => {
    const fetchData = async () => {
      if (mezoClient) {
        try {
          const price = await mezoClient.getBtcPrice();
          setBtcPrice(Number(price) / 1e18);
          
          const rate = await mezoClient.getInterestRate();
          setInterestRate(rate);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
    };
    fetchData();
  }, [mezoClient]);

  // Periodically refresh loan information (BTC price, collateral info, interest)
  // This is important because:
  // - BTC price changes affect liquidation price buffer and collateralization ratio
  // - Interest accrues over time, increasing debt
  useEffect(() => {
    if (!mezoClient || !wallet.isConnected || !collateralInfo || parseFloat(collateralInfo.borrowedMUSD) === 0) {
      return;
    }

    const POLL_INTERVAL = 60000; // 60 seconds

    const interval = setInterval(async () => {
      try {
        // Refresh BTC price (affects liquidation calculations)
        const price = await mezoClient.getBtcPrice();
        setBtcPrice(Number(price) / 1e18);
        
        // Refresh interest rate (may change)
        const rate = await mezoClient.getInterestRate();
        setInterestRate(rate);
        
        // Refresh collateral info (debt may have accrued interest, ratio may have changed)
        if (refetch) {
          refetch();
        }
      } catch (error) {
        console.error('Error refreshing loan data:', error);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [mezoClient, wallet.isConnected, collateralInfo, refetch]);

  // Fetch transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!mezoClient || !wallet.evmAddress) return;
      
      setLoadingTransactions(true);
      try {
        console.log('Fetching transactions for:', wallet.evmAddress);
        const events = await mezoClient.getTroveEvents(wallet.evmAddress as any);
        console.log(`Fetched ${events.length} events`);
        
        // Track previous state to determine operation type
        let previousColl = BigInt(0);
        let previousDebt = BigInt(0);
        
        const transactions: Transaction[] = [];
        
        for (const event of events) {
          if (event.eventName === 'TroveCreated') {
            transactions.push({
              id: event.transactionHash,
              type: 'loan_issued',
              amount: '0',
              amountUnit: 'MUSD', // Will be updated from first TroveUpdated
              timestamp: event.timestamp,
              txHash: event.transactionHash,
              description: 'Trove opened',
            });
          } else if (event.eventName === 'TroveUpdated') {
            const args = event.args as any;
            const currentColl = args._coll as bigint;
            const currentDebt = (args._principal as bigint) + (args._interest as bigint);
            const operation = args._operation as number;
            
            // Determine transaction type based on operation and changes
            let txType: Transaction['type'] = 'loan_issued';
            let amount = '0';
            let description = 'Trove updated';
            
            const collChange = currentColl - previousColl;
            const debtChange = currentDebt - previousDebt;
            
            // Format amount with proper decimals
            const formatAmount = (value: bigint, isBTC: boolean): string => {
              const numValue = Number(formatEther(value));
              if (isBTC) {
                // Format BTC with up to 8 decimals, remove trailing zeros
                return numValue.toFixed(8).replace(/\.?0+$/, '');
              } else {
                // Format MUSD with 2 decimals
                return numValue.toFixed(2);
              }
            };
            
            let amountUnit: 'MUSD' | 'BTC' = 'MUSD';
            
            // Operation codes (based on BorrowerOperations contract):
            // 0 = openTrove, 1 = closeTrove, 2+ = adjustTrove variations
            if (operation === 0) {
              // Open trove
              txType = 'loan_issued';
              amount = formatAmount(currentDebt, false);
              amountUnit = 'MUSD';
              description = `Borrowed ${formatAmount(currentDebt, false)} MUSD`;
            } else if (operation === 1) {
              // Close trove
              txType = 'trove_closed';
              amount = formatAmount(previousDebt, false);
              amountUnit = 'MUSD';
              description = 'Trove closed';
            } else if (collChange > 0n && debtChange === 0n) {
              // Added collateral only
              txType = 'collateral_added';
              amount = formatAmount(collChange, true);
              amountUnit = 'BTC';
              description = `Added ${formatAmount(collChange, true)} BTC collateral`;
            } else if (collChange === 0n && debtChange < 0n) {
              // Repaid debt only
              txType = 'debt_repaid';
              amount = formatAmount(-debtChange, false);
              amountUnit = 'MUSD';
              description = `Repaid ${formatAmount(-debtChange, false)} MUSD`;
            } else if (collChange === 0n && debtChange > 0n) {
              // Borrowed more
              txType = 'debt_withdrawn';
              amount = formatAmount(debtChange, false);
              amountUnit = 'MUSD';
              description = `Borrowed ${formatAmount(debtChange, false)} MUSD more`;
            } else if (collChange < 0n && debtChange === 0n) {
              // Withdrew collateral only
              txType = 'collateral_added'; // Reuse type, will show as withdrawal
              amount = formatAmount(-collChange, true);
              amountUnit = 'BTC';
              description = `Withdrew ${formatAmount(-collChange, true)} BTC collateral`;
            } else {
              // Complex operation (multiple changes)
              if (debtChange !== 0n) {
                txType = debtChange > 0n ? 'debt_withdrawn' : 'debt_repaid';
                amount = formatAmount(debtChange > 0n ? debtChange : -debtChange, false);
                amountUnit = 'MUSD';
                description = debtChange > 0n 
                  ? `Borrowed ${formatAmount(debtChange, false)} MUSD`
                  : `Repaid ${formatAmount(-debtChange, false)} MUSD`;
              } else {
                txType = 'collateral_added';
                amount = formatAmount(collChange > 0n ? collChange : -collChange, true);
                amountUnit = 'BTC';
                description = collChange > 0n
                  ? `Added ${formatAmount(collChange, true)} BTC collateral`
                  : `Withdrew ${formatAmount(-collChange, true)} BTC collateral`;
              }
            }
            
            transactions.push({
              id: `${event.transactionHash}-${event.blockNumber}`,
              type: txType,
              amount,
              amountUnit,
              timestamp: event.timestamp,
              txHash: event.transactionHash,
              description,
            });
            
            // Update previous state
            previousColl = currentColl;
            previousDebt = currentDebt;
          }
        }
        
        // Sort by timestamp (newest first)
        transactions.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log(`Processed ${transactions.length} transactions`);
        setTransactions(transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    };

    if (wallet.evmAddress && collateralInfo && parseFloat(collateralInfo.borrowedMUSD) > 0) {
      fetchTransactions();
    }
  }, [mezoClient, wallet.evmAddress, collateralInfo]);

  // Calculate loan metrics
  const loanMetrics = useMemo(() => {
    if (!collateralInfo || parseFloat(collateralInfo.borrowedMUSD) === 0) {
      return null;
    }

    const btcCollateral = parseFloat(collateralInfo.btcCollateral);
    const totalDebt = parseFloat(collateralInfo.borrowedMUSD);
    const principal = parseFloat(collateralInfo.principal);
    const interest = parseFloat(collateralInfo.interest);
    const collateralValueUSD = btcCollateral * btcPrice;
    const liquidationPrice = calculateLiquidationPriceFromDebt(btcCollateral, totalDebt, 110);
    const liquidationBuffer = calculateLiquidationPriceBuffer(btcPrice, liquidationPrice);

    return {
      interestToDate: interest,
      loanDebt: totalDebt,
      apr: interestRate,
      collateral: {
        btc: btcCollateral,
        usd: collateralValueUSD,
      },
      liquidationPrice,
      liquidationBuffer,
      collateralizationRatio: collateralInfo.collateralRatio,
      healthStatus: collateralInfo.healthStatus,
    };
  }, [collateralInfo, btcPrice, interestRate]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Your Loan" showClose={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DesignColors.yellow.primary} />
          <Text style={styles.loadingText}>Loading loan data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !collateralInfo || parseFloat(collateralInfo.borrowedMUSD) === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Your Loan" showClose={true} />
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color={DesignColors.dark.muted} />
          <Text style={styles.emptyTitle}>No Active Loan</Text>
          <Text style={styles.emptyText}>You don't have an active loan position.</Text>
          <Button
            title="Borrow MUSD"
            onPress={() => router.push('/borrow' as any)}
            variant="primary"
            size="md"
            style={styles.emptyButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!loanMetrics) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Your Loan" showClose={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load loan data</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Your Loan" showClose={true} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Add MUSD to wallet"
            onPress={() => router.push('/swap' as any)}
            variant="outline"
            size="md"
            leftIcon={<Ionicons name="wallet" size={20} color={DesignColors.yellow.primary} />}
            style={styles.actionButton}
          />
          <View style={styles.manageButtonContainer}>
            <Button
              title="Manage Loan"
              onPress={() => setShowManageMenu(!showManageMenu)}
              variant="secondary"
              size="md"
              rightIcon={
                <Ionicons
                  name={showManageMenu ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={DesignColors.light.white}
                />
              }
              style={styles.actionButton}
            />
            {showManageMenu && (
              <View style={styles.manageMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowManageMenu(false);
                    router.push('/add-collateral' as any);
                  }}>
                  <Ionicons name="add-circle" size={20} color={DesignColors.yellow.primary} />
                  <Text style={styles.menuItemText}>Add Collateral</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowManageMenu(false);
                    router.push('/repay-debt' as any);
                  }}>
                  <Ionicons name="remove-circle" size={20} color={DesignColors.yellow.primary} />
                  <Text style={styles.menuItemText}>Repay Debt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowManageMenu(false);
                    router.push('/withdraw-musd' as any);
                  }}>
                  <Ionicons name="arrow-down-circle" size={20} color={DesignColors.yellow.primary} />
                  <Text style={styles.menuItemText}>Withdraw MUSD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowManageMenu(false);
                    router.push('/close-trove' as any);
                  }}>
                  <Ionicons name="close-circle" size={20} color={DesignColors.error} />
                  <Text style={[styles.menuItemText, styles.dangerText]}>Close Trove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Loan Metrics Grid */}
        <View style={styles.metricsGrid}>
          <LoanMetricCard
            label="Interest to date"
            value={formatUSD(loanMetrics.interestToDate)}
            subValue={formatUSD(loanMetrics.interestToDate)}
            icon="trending-up"
            variant="default"
          />
          <LoanMetricCard
            label="Loan debt"
            value={formatUSD(loanMetrics.loanDebt)}
            subValue={formatUSD(loanMetrics.loanDebt)}
            icon="card"
            variant="default"
          />
          <LoanMetricCard
            label="APR"
            value={`${loanMetrics.apr.toFixed(2)}%`}
            icon="calculator"
            variant="default"
          />
          <LoanMetricCard
            label="Collateral"
            value={formatBTC(loanMetrics.collateral.btc)}
            subValue={formatUSD(loanMetrics.collateral.usd)}
            icon="diamond"
            iconColor={DesignColors.yellow.primary}
            variant="highlight"
            badge="Locked"
            badgeColor={DesignColors.dark.tertiary}
          />
        </View>

        {/* Liquidation Metrics */}
        <Card variant="elevated" style={styles.liquidationCard}>
          <Text style={styles.sectionTitle}>Liquidation price buffer</Text>
          <Text style={styles.liquidationBuffer}>{loanMetrics.liquidationBuffer.toFixed(2)}%</Text>
          <View style={styles.liquidationDetails}>
            <View style={styles.liquidationRow}>
              <View style={styles.liquidationRowLeft}>
                <Text style={styles.liquidationLabel}>BTC liquidation price</Text>
                <TouchableOpacity style={styles.infoIcon}>
                  <Ionicons name="information-circle" size={16} color={DesignColors.dark.muted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.liquidationValue}>{formatUSD(loanMetrics.liquidationPrice)}</Text>
            </View>
            <View style={styles.liquidationRow}>
              <Text style={styles.liquidationLabel}>Current BTC price</Text>
              <Text style={styles.liquidationValue}>{formatUSD(btcPrice)}</Text>
            </View>
          </View>
        </Card>

        {/* Collateralization Ratio */}
        <Card variant="elevated" style={StyleSheet.flatten([
          styles.collateralizationCard,
          loanMetrics.healthStatus === 'danger' && styles.dangerCard,
          loanMetrics.healthStatus === 'warning' && styles.warningCard,
        ])}>
          <View style={styles.collateralizationHeader}>
            <Text style={styles.sectionTitle}>Collateralization ratio</Text>
            <View style={[
              styles.statusBadge,
              loanMetrics.healthStatus === 'danger' && styles.dangerBadge,
              loanMetrics.healthStatus === 'warning' && styles.warningBadge,
            ]}>
              <Ionicons
                name={loanMetrics.healthStatus === 'danger' ? 'alert-circle' : 'warning'}
                size={16}
                color={DesignColors.light.white}
              />
              <Text style={styles.statusBadgeText}>
                {loanMetrics.healthStatus === 'danger' ? 'High Risk' : 'Increased risk'}
              </Text>
            </View>
          </View>
          <Text style={styles.collateralizationRatio}>{loanMetrics.collateralizationRatio.toFixed(2)}%</Text>
        </Card>

        {/* Transaction History */}
        <Card variant="elevated" style={styles.transactionsCard}>
          <Text style={styles.sectionTitle}>Latest transactions</Text>
          {loadingTransactions ? (
            <View style={styles.transactionsLoading}>
              <ActivityIndicator size="small" color={DesignColors.yellow.primary} />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.noTransactions}>
              <Ionicons name="document-text-outline" size={32} color={DesignColors.dark.muted} />
              <Text style={styles.noTransactionsText}>No transactions yet</Text>
              <Text style={styles.noTransactionsSubtext}>
                Your loan transactions will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((tx) => (
                <TouchableOpacity key={tx.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Ionicons
                      name={getTransactionIcon(tx.type)}
                      size={24}
                      color={DesignColors.yellow.primary}
                    />
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionType}>{tx.description}</Text>
                      <Text style={styles.transactionDate}>
                        {new Date(tx.timestamp * 1000).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>
                      {tx.type === 'debt_repaid' || tx.type === 'trove_closed' ? '-' : '+'}
                      {tx.amount} {tx.amountUnit}
                    </Text>
                    {tx.txHash && (
                      <TouchableOpacity
                        onPress={async () => {
                          const explorerUrl = `https://explorer.test.mezo.org/tx/${tx.txHash}`;
                          try {
                            await openBrowserAsync(explorerUrl, {
                              presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                            });
                          } catch (error) {
                            console.error('Error opening explorer URL:', error);
                          }
                        }}>
                        <Text style={styles.receiptLink}>Receipt</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function getTransactionIcon(type: Transaction['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'loan_issued':
      return 'arrow-up-circle';
    case 'collateral_added':
      return 'add-circle';
    case 'debt_repaid':
      return 'remove-circle';
    case 'debt_withdrawn':
      return 'arrow-down-circle';
    case 'trove_closed':
      return 'close-circle';
    default:
      return 'document-text';
  }
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
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.body.md.fontSize,
    color: DesignColors.dark.muted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    color: DesignColors.error,
    fontSize: Typography.body.md.fontSize,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  manageButtonContainer: {
    flex: 1,
    position: 'relative',
  },
  manageMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.xs,
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: DesignColors.dark.muted,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  menuItemText: {
    fontSize: Typography.body.md.fontSize,
    color: DesignColors.light.white,
  },
  dangerText: {
    color: DesignColors.error,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
    marginBottom: Spacing.lg,
  },
  liquidationCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
    marginBottom: Spacing.md,
  },
  liquidationBuffer: {
    fontSize: Typography.heading.xl.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    marginBottom: Spacing.md,
  },
  liquidationDetails: {
    gap: Spacing.sm,
  },
  liquidationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liquidationRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  liquidationLabel: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
  },
  liquidationValue: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
  },
  infoIcon: {
    padding: 2,
  },
  collateralizationCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  collateralizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: DesignColors.dark.tertiary,
  },
  dangerBadge: {
    backgroundColor: DesignColors.error + '40',
  },
  warningBadge: {
    backgroundColor: DesignColors.warning + '40',
  },
  statusBadgeText: {
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
  },
  collateralizationRatio: {
    fontSize: Typography.heading.xl.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: DesignColors.error + '40',
    backgroundColor: DesignColors.error + '10',
  },
  warningCard: {
    borderWidth: 1,
    borderColor: DesignColors.warning + '40',
    backgroundColor: DesignColors.warning + '10',
  },
  transactionsCard: {
    padding: Spacing.lg,
  },
  transactionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  noTransactions: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  noTransactionsText: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  noTransactionsSubtext: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
    textAlign: 'center',
  },
  transactionsList: {
    gap: Spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.dark.muted,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
  },
  transactionDate: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.yellow.primary,
  },
  receiptLink: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.yellow.primary,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
});

