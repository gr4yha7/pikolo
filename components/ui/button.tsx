import { DesignColors, Radius, Typography } from '@/constants/theme';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles.button,
        sizeStyles.button,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              textStyle,
            ] as any}>
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

function getVariantStyles(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return {
        button: {
          backgroundColor: DesignColors.yellow.primary,
        },
        text: {
          color: DesignColors.dark.primary,
          fontWeight: '700',
        },
      };
    case 'secondary':
      return {
        button: {
          backgroundColor: DesignColors.purple.primary,
        },
        text: {
          color: DesignColors.light.white,
          fontWeight: '600',
        },
      };
    case 'outline':
      return {
        button: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: DesignColors.light.white,
        },
        text: {
          color: DesignColors.light.white,
          fontWeight: '600',
        },
      };
    case 'ghost':
      return {
        button: {
          backgroundColor: 'transparent',
        },
        text: {
          color: DesignColors.light.white,
          fontWeight: '500',
        },
      };
  }
}

function getSizeStyles(size: ButtonSize) {
  switch (size) {
    case 'sm':
      return {
        button: {
          paddingVertical: 8,
          paddingHorizontal: 16,
          minHeight: 36,
        },
        text: {
          fontSize: Typography.body.sm.fontSize,
        },
      };
    case 'md':
      return {
        button: {
          paddingVertical: 12,
          paddingHorizontal: 24,
          minHeight: 48,
        },
        text: {
          fontSize: Typography.body.md.fontSize,
        },
      };
    case 'lg':
      return {
        button: {
          paddingVertical: 16,
          paddingHorizontal: 32,
          minHeight: 56,
        },
        text: {
          fontSize: Typography.body.lg.fontSize,
        },
      };
  }
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

