/**
 * DJINX Design System
 * Comprehensive color palette, typography, and spacing system
 */

import { Platform } from 'react-native';

// Design System Colors
export const DesignColors = {
  // Primary Accent Colors
  yellow: {
    primary: '#F4EF4D',
    bright: '#FEE700',
    dark: '#FFD700',
  },
  purple: {
    primary: '#7D41FF',
    bright: '#8A2BE2',
    dark: '#4B0082',
    gradient: ['#7D41FF', '#8A2BE2'],
  },
  
  // Neutral Colors
  dark: {
    primary: '#1C1A24',
    secondary: '#211D2B',
    tertiary: '#282433',
    card: '#2C2C3A',
    muted: '#59566A',
  },
  
  // Light Colors
  light: {
    lavender: '#F1ECF9',
    white: '#FFFFFF',
    offWhite: '#F5F5F5',
  },
  
  // Semantic Colors
  success: '#32CD32',
  error: '#FF4500',
  warning: '#FFD700',
  
  // Graph/Chart Colors
  chart: {
    line: '#DFFF00',
    fill: 'rgba(223, 255, 0, 0.3)',
  },
};

const tintColorLight = DesignColors.purple.primary;
const tintColorDark = DesignColors.yellow.primary;

export const Colors = {
  light: {
    text: DesignColors.light.white,
    background: DesignColors.dark.primary,
    tint: tintColorLight,
    icon: DesignColors.light.white,
    tabIconDefault: DesignColors.dark.muted,
    tabIconSelected: DesignColors.yellow.primary,
  },
  dark: {
    text: DesignColors.light.white,
    background: DesignColors.dark.primary,
    tint: tintColorDark,
    icon: DesignColors.light.white,
    tabIconDefault: DesignColors.dark.muted,
    tabIconSelected: DesignColors.yellow.primary,
  },
};

// Typography System
// Note: Clash and Inter fonts would need to be loaded via expo-font
// For now, using system fonts that closely match
export const Fonts = Platform.select({
  ios: {
    /** Clash Display - for headings */
    display: 'System',
    /** Inter - for body text */
    body: 'System',
    /** Rounded for accents */
    rounded: 'ui-rounded',
    /** Monospace for numbers */
    mono: 'ui-monospace',
  },
  default: {
    display: 'normal',
    body: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    display: "'Clash Display', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

// Typography Scale
export const Typography = {
  heading: {
    xl: { fontSize: 28, fontWeight: 'bold', lineHeight: 36 },
    lg: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
    md: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    sm: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  },
  body: {
    lg: { fontSize: 17, fontWeight: '400', lineHeight: 24 },
    md: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
    sm: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  },
  caption: {
    md: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    sm: { fontSize: 10, fontWeight: '400', lineHeight: 14 },
  },
};

// Spacing System
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
