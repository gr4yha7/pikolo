import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AppHeaderProps {
  title?: string;
  showClose?: boolean;
  onClose?: () => void;
  rightActions?: React.ReactNode;
}

export function AppHeader({
  title = 'Pikolo',
  showClose = true,
  onClose,
  rightActions,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { wallet, connectWallet, disconnectWallet, formatAddress } = useWallet();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const isHome = pathname === '/';

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Check if we can go back, otherwise navigate to tabs
      // When navigating from a tab screen, router.canGoBack() should work
      // but we also check if pathname suggests we should go to tabs
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback: navigate to tabs root if we can't go back
        router.replace('/(tabs)');
      }
    }
  };

  // On Mezo, BTC is native currency, so evmAddress is the wallet address
  const walletAddress = wallet.evmAddress;
  const walletBalance =
    wallet.musdBalance || wallet.evmBalance || wallet.btcBalance || null;

  const handleWalletPress = () => {
    if (wallet.isConnected) {
      setShowWalletMenu(true);
    } else {
      connectWallet('evm'); // Default to EVM for trading
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setShowWalletMenu(false);
  };

  return (
    <View style={styles.header}>
      {showClose && !isHome && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={DesignColors.light.white} />
          <Text style={styles.closeText}>Back</Text>
        </TouchableOpacity>
      )}
      <View style={[styles.titleContainer, { alignItems: !isHome ? 'center' : 'flex-start' }]}>
        {title && <Text style={styles.title}>{title}</Text>}
      </View>
      <View style={styles.rightActions}>
        {rightActions || (
          <TouchableOpacity
            style={[
              styles.walletButton,
              wallet.isConnected && styles.walletButtonConnected,
            ]}
            onPress={handleWalletPress}
            activeOpacity={0.7}>
            {wallet.isConnected ? (
              <>
                <View style={styles.walletStatusIndicator} />
                <Text style={styles.walletAddress}>
                  {formatAddress(walletAddress)}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color={DesignColors.light.white}
                />
                <Text style={styles.connectText}>Connect</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Wallet Menu Modal */}
      <Modal
        visible={showWalletMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWalletMenu(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWalletMenu(false)}>
          <View style={styles.walletMenu}>
            <View style={styles.walletMenuHeader}>
              <Text style={styles.walletMenuTitle}>Wallet</Text>
              <TouchableOpacity onPress={() => setShowWalletMenu(false)}>
                <Ionicons
                  name="close"
                  size={20}
                  color={DesignColors.light.white}
                />
              </TouchableOpacity>
            </View>
            {wallet.evmAddress && (
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>Wallet Address</Text>
                <View style={styles.walletAddressContainer}>
                  <Text style={styles.walletAddressFull}>{wallet.evmAddress}</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={DesignColors.yellow.primary}
                    />
                  </TouchableOpacity>
                </View>
                {/* On Mezo network, native currency is BTC */}
                {wallet.evmBalance && (
                  <Text style={styles.walletBalance}>{wallet.evmBalance} BTC (Native)</Text>
                )}
              </View>
            )}
            {walletBalance && (
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>MUSD Balance</Text>
                <Text style={styles.walletBalance}>{walletBalance} MUSD</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}>
              <Ionicons
                name="log-out-outline"
                size={18}
                color={DesignColors.error}
              />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DesignColors.dark.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  closeText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '500',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
  },
  rightActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DesignColors.dark.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  walletButtonConnected: {
    backgroundColor: DesignColors.purple.primary,
  },
  walletStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DesignColors.success,
  },
  walletAddress: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
  },
  connectText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  walletMenu: {
    backgroundColor: DesignColors.dark.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  walletMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  walletMenuTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
  },
  walletInfo: {
    marginBottom: Spacing.md,
  },
  walletLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DesignColors.dark.secondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  walletAddressFull: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    fontFamily: 'monospace',
    flex: 1,
  },
  copyButton: {
    padding: Spacing.xs,
  },
  walletBalance: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: DesignColors.dark.secondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: DesignColors.error,
  },
  disconnectText: {
    color: DesignColors.error,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
});

