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

interface Transaction {
  id: string;
  type: 'loan_issued' | 'collateral_added' | 'debt_repaid' | 'debt_withdrawn' | 'trove_closed';
  amount: string;
  timestamp: number;
  txHash?: string;
  description: string;
}

export default function YourLoanScreen() {
  const router = useRouter();
  const { wallet } = useWallet();
  const { mezoClient, collateralInfo, isLoading, error, refetch } = useMezo();
  
  const [btcPrice, setBtcPrice] = useState(60000);
  const [interestRate, setInterestRate] = useState(1.0); // Default 1% APR
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);

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

  // Fetch transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!mezoClient || !wallet.evmAddress) return;
      
      setLoadingTransactions(true);
      try {
        // TODO: Implement event fetching from TroveUpdated events
        // For now, use mock data structure
        // In production, query TroveUpdated events from BorrowerOperations contract
        const mockTransactions: Transaction[] = [
          // This will be replaced with real event data
        ];
        setTransactions(mockTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
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
            onPress={() => {
              // TODO: Implement add MUSD functionality
              router.push('/borrow' as any);
            }}
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
                    router.push('/borrow' as any);
                  }}>
                  <Ionicons name="add-circle" size={20} color={DesignColors.yellow.primary} />
                  <Text style={styles.menuItemText}>Add Collateral</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowManageMenu(false);
                    router.push('/borrow' as any);
                  }}>
                  <Ionicons name="remove-circle" size={20} color={DesignColors.yellow.primary} />
                  <Text style={styles.menuItemText}>Repay Debt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowManageMenu(false);
                    router.push('/borrow' as any);
                  }}>
                  <Ionicons name="cash" size={20} color={DesignColors.yellow.primary} />
                  <Text style={styles.menuItemText}>Withdraw MUSD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowManageMenu(false);
                    router.push('/borrow' as any);
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
                    <Text style={styles.transactionAmount}>+{tx.amount} MUSD</Text>
                    {tx.txHash && (
                      <TouchableOpacity
                        onPress={() => {
                          // Open in explorer
                          const explorerUrl = `https://explorer.test.mezo.org/tx/${tx.txHash}`;
                          // TODO: Open URL
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

