/**
 * Loan Metric Card Component
 * 
 * Displays a single metric in a card format
 */

import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './ui/card';

interface LoanMetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  variant?: 'default' | 'highlight' | 'warning' | 'danger';
  badge?: string;
  badgeColor?: string;
}

export function LoanMetricCard({
  label,
  value,
  subValue,
  icon,
  iconColor = DesignColors.yellow.primary,
  variant = 'default',
  badge,
  badgeColor,
}: LoanMetricCardProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'highlight':
        return {
          borderColor: DesignColors.yellow.primary + '40',
          backgroundColor: DesignColors.yellow.primary + '10',
        };
      case 'warning':
        return {
          borderColor: DesignColors.warning + '40',
          backgroundColor: DesignColors.warning + '10',
        };
      case 'danger':
        return {
          borderColor: DesignColors.error + '40',
          backgroundColor: DesignColors.error + '10',
        };
      default:
        return {};
    }
  };

  return (
    <Card variant="elevated" style={StyleSheet.flatten([styles.card, getVariantStyle()])}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          {icon && <Ionicons name={icon} size={16} color={iconColor} style={styles.icon} />}
          <Text style={styles.label}>{label}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, badgeColor && { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      {subValue && <Text style={styles.subValue}>{subValue}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    minWidth: 150,
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  label: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
    flex: 1,
  },
  badge: {
    backgroundColor: DesignColors.dark.secondary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: Typography.caption.sm.fontSize,
    color: DesignColors.light.white,
    fontWeight: '600',
  },
  value: {
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    marginTop: Spacing.xs,
  },
  subValue: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
    marginTop: 2,
  },
});

