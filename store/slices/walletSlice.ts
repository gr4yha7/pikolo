import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WalletState {
  btcAddress: string | null; // Deprecated: Kept for backward compatibility. On Mezo, BTC is native currency, so this is same as evmAddress
  evmAddress: string | null; // EVM address (on Mezo testnet, this is the wallet address)
  btcBalance: string | null; // Native BTC balance on Mezo network (native currency, same as evmBalance)
  evmBalance: string | null; // Native currency balance (BTC on Mezo network)
  musdBalance: string | null; // MUSD token balance (ERC20)
  isConnected: boolean;
  walletType: 'evm' | null; // Only EVM wallets supported (Bitcoin wallet removed - Mezo uses EVM-compatible chain)
  isLoading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  btcAddress: null,
  evmAddress: null,
  btcBalance: null,
  evmBalance: null,
  musdBalance: null,
  isConnected: false,
  walletType: null,
  isLoading: false,
  error: null,
};

const WALLET_STORAGE_KEY = '@pikolo_wallet_state';

// Load wallet state from AsyncStorage
export const loadWalletState = async (): Promise<Partial<WalletState>> => {
  try {
    const stored = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading wallet state:', error);
  }
  return {};
};

// Save wallet state to AsyncStorage
export const saveWalletState = async (state: WalletState) => {
  try {
    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving wallet state:', error);
  }
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    // connectBitcoin: Removed - Mezo uses EVM-compatible chain, no separate Bitcoin wallet needed
    // BTC is the native currency on Mezo network, accessed via EVM wallet
    connectBitcoin: (
      state,
      action: PayloadAction<{ address: string; balance?: string }>,
    ) => {
      // Deprecated: Bitcoin wallet connection removed. Use connectEVM instead.
      // This action is kept for backward compatibility but should not be used.
      console.warn('connectBitcoin is deprecated. Use connectEVM instead.');
      state.evmAddress = action.payload.address; // Map to EVM address
      state.btcAddress = action.payload.address; // Keep for compatibility
      state.evmBalance = action.payload.balance || null;
      state.btcBalance = action.payload.balance || null;
      state.walletType = 'evm';
      state.isConnected = true;
      state.error = null;
      state.isLoading = false;
      saveWalletState(state);
    },
    connectEVM: (
      state,
      action: PayloadAction<{ address: string; balance?: string }>,
    ) => {
      state.evmAddress = action.payload.address;
      state.btcAddress = action.payload.address; // On Mezo, BTC is native currency, so same address
      state.evmBalance = action.payload.balance || null;
      state.btcBalance = action.payload.balance || null; // Native BTC balance on Mezo network
      state.walletType = 'evm';
      state.isConnected = true;
      state.error = null;
      state.isLoading = false;
      saveWalletState(state);
    },
    updateBitcoinBalance: (state, action: PayloadAction<string>) => {
      state.btcBalance = action.payload;
      saveWalletState(state);
    },
    updateEVMBalance: (state, action: PayloadAction<string>) => {
      state.evmBalance = action.payload;
      saveWalletState(state);
    },
    updateMUSDBalance: (state, action: PayloadAction<string>) => {
      state.musdBalance = action.payload;
      saveWalletState(state);
    },
    disconnect: (state) => {
      state.btcAddress = null;
      state.evmAddress = null;
      state.btcBalance = null;
      state.evmBalance = null;
      state.musdBalance = null;
      state.isConnected = false;
      state.walletType = null;
      state.error = null;
      state.isLoading = false;
      AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    },
    restoreWalletState: (state, action: PayloadAction<Partial<WalletState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setLoading,
  setError,
  connectBitcoin,
  connectEVM,
  updateBitcoinBalance,
  updateEVMBalance,
  updateMUSDBalance,
  disconnect,
  restoreWalletState,
} = walletSlice.actions;

export default walletSlice.reducer;

