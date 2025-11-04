import { appKit, wagmiAdapter } from '@/lib/AppKitConfig';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { AppKit, AppKitProvider } from '@reown/appkit-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { WagmiProvider } from 'wagmi';

import { WalletProvider } from '@/contexts/WalletContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ReactQueryProvider } from '@/lib/react-query';
import { store } from '@/store';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Use dark theme as default for Pikolo app
  const theme = 'dark';

  return (
    <Provider store={store}>
      <AppKitProvider instance={appKit}>
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
          <ReactQueryProvider>
            <WalletProvider>
              <ThemeProvider value={DarkTheme}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="search" options={{ headerShown: false }} />
                <Stack.Screen name="buy" options={{ headerShown: false }} />
                <Stack.Screen name="borrow" options={{ headerShown: false }} />
                <Stack.Screen name="wallet" options={{ headerShown: false }} />
                <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
                <Stack.Screen name="order-confirmed" options={{ headerShown: false }} />
                <Stack.Screen name="claim-rewards" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="good-luck" options={{ headerShown: false }} />
                <Stack.Screen name="prediction/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="swap" options={{ headerShown: false }} />
                <Stack.Screen name="check-borrowing-power" options={{ headerShown: false }} />
                <Stack.Screen name="create-market" options={{ headerShown: false }} />
                <Stack.Screen name="redeem" options={{ headerShown: false }} />
                <Stack.Screen name="your-loan" options={{ headerShown: false }} />
                <Stack.Screen name="market-resolution" options={{ headerShown: false }} />
                <Stack.Screen name="sell" options={{ headerShown: false }} />
                <Stack.Screen name="add-collateral" options={{ headerShown: false }} />
                <Stack.Screen name="repay-debt" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="light" />
              <AppKit />
            </ThemeProvider>
          </WalletProvider>
          </ReactQueryProvider>
        </WagmiProvider>
      </AppKitProvider>
    </Provider>
  );
}
