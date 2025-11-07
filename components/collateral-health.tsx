/**
 * Collateral Health Indicator Component
 * Displays collateral ratio and health status
 */

import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui/card';

interface CollateralHealthProps {
  collateralRatio: number;
  healthStatus: 'healthy' | 'warning' | 'danger';
  btcCollateral: string;
  borrowedMUSD: string;
  maxBorrowable: string;
}

export function CollateralHealth({
  collateralRatio,
  healthStatus,
  btcCollateral,
  borrowedMUSD,
  maxBorrowable,
}: CollateralHealthProps) {
  const getHealthColor = () => {
    switch (healthStatus) {
      case 'healthy':
        return DesignColors.success;
      case 'warning':
        return DesignColors.warning || '#FFA500';
      case 'danger':
        return DesignColors.error;
      default:
        return DesignColors.dark.muted;
    }
  };

  const getHealthIcon = () => {
    switch (healthStatus) {
      case 'healthy':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'alert-circle';
      default:
        return 'information-circle';
    }
  };

  const getHealthLabel = () => {
    switch (healthStatus) {
      case 'healthy':
        return 'Healthy';
      case 'warning':
        return 'Warning';
      case 'danger':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={20} color={DesignColors.yellow.primary} />
          <Text style={styles.title}>Collateral Health</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getHealthColor() + '20' }]}>
          <Ionicons name={getHealthIcon()} size={16} color={getHealthColor()} />
          <Text style={[styles.statusText, { color: getHealthColor() }]}>{getHealthLabel()}</Text>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Collateral Ratio</Text>
          <Text style={[styles.metricValue, { color: getHealthColor() }]}>
            {collateralRatio === Infinity ? '∞' : `${collateralRatio.toFixed(1)}%`}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>BTC Collateral</Text>
          <Text style={styles.metricValue}>{btcCollateral}</Text>
          <Text style={styles.metricUnit}>BTC</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Borrowed</Text>
          <Text style={styles.metricValue}>{borrowedMUSD}</Text>
          <Text style={styles.metricUnit}>MUSD</Text>
        </View>
      </View>

      <View style={styles.maxBorrowableContainer}>
        <Text style={styles.maxBorrowableLabel}>Max Borrowable</Text>
        <Text style={styles.maxBorrowableValue}>{maxBorrowable}</Text>
        <Text style={styles.maxBorrowableUnit}>MUSD</Text>
      </View>

      {healthStatus === 'warning' && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning-outline" size={16} color={DesignColors.warning || '#FFA500'} />
          <Text style={styles.warningText}>
            Collateral ratio is below 200%. Consider adding collateral to avoid risk.
          </Text>
        </View>
      )}

      {healthStatus === 'danger' && (
        <View style={styles.dangerContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={DesignColors.error} />
          <Text style={styles.dangerText}>
            Collateral ratio is critically low (&lt;150%). Add collateral or repay debt immediately.
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
  },
  metricLabel: {
    fontSize: Typography.caption.md.fontSize,
    color: DesignColors.dark.muted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    lineHeight: 20,
  },
  metricUnit: {
    fontSize: Typography.caption.md.fontSize,
    color: DesignColors.dark.muted,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 35,
    backgroundColor: DesignColors.dark.muted,
    marginHorizontal: Spacing.xs,
  },
  maxBorrowableContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: DesignColors.dark.muted,
    alignItems: 'center',
  },
  maxBorrowableLabel: {
    fontSize: Typography.caption.md.fontSize,
    color: DesignColors.dark.muted,
    marginBottom: 2,
  },
  maxBorrowableValue: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    lineHeight: 20,
  },
  maxBorrowableUnit: {
    fontSize: Typography.caption.md.fontSize,
    color: DesignColors.dark.muted,
    marginTop: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: (DesignColors.warning || '#FFA500') + '20',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: (DesignColors.warning || '#FFA500') + '40',
  },
  warningText: {
    flex: 1,
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.warning || '#FFA500',
    lineHeight: 18,
  },
  dangerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: DesignColors.error + '20',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.error + '40',
  },
  dangerText: {
    flex: 1,
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.error,
    lineHeight: 18,
  },
});

