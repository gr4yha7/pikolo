import { DesignColors, Radius, Shadows, Spacing } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const variantStyles = getVariantStyles(variant);

  return (
    <View style={[styles.card, variantStyles, style]}>{children}</View>
  );
}

function getVariantStyles(variant: CardProps['variant']) {
  switch (variant) {
    case 'default':
      return {
        backgroundColor: DesignColors.dark.card,
      };
    case 'elevated':
      return {
        backgroundColor: DesignColors.dark.card,
        ...Shadows.md,
      };
    case 'outlined':
      return {
        backgroundColor: DesignColors.dark.card,
        borderWidth: 1,
        borderColor: DesignColors.dark.muted,
      };
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
});

