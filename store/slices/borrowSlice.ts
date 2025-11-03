import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BorrowState {
  btcCollateral: string;
  borrowedMUSD: string;
  collateralRatio: number; // Percentage (e.g., 200% = 2.0)
  maxBorrowableMUSD: string;
  borrowRate: number; // 1% fixed
  healthStatus: 'healthy' | 'warning' | 'danger';
  isLoading: boolean;
  error: string | null;
}

const initialState: BorrowState = {
  btcCollateral: '0',
  borrowedMUSD: '0',
  collateralRatio: 0,
  maxBorrowableMUSD: '0',
  borrowRate: 1, // 1% fixed as per specs
  healthStatus: 'healthy',
  isLoading: false,
  error: null,
};

const calculateHealthStatus = (collateralRatio: number): 'healthy' | 'warning' | 'danger' => {
  if (collateralRatio >= 200) return 'healthy';
  if (collateralRatio >= 150) return 'warning';
  return 'danger';
};

const borrowSlice = createSlice({
  name: 'borrow',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setBorrowData: (
      state,
      action: PayloadAction<{
        btcCollateral: string;
        borrowedMUSD: string;
        btcPrice?: number;
      }>,
    ) => {
      state.btcCollateral = action.payload.btcCollateral;
      state.borrowedMUSD = action.payload.borrowedMUSD;

      // Calculate collateral ratio (assuming 70% max LTV)
      const btcValue = parseFloat(action.payload.btcCollateral) * (action.payload.btcPrice || 0);
      const borrowedValue = parseFloat(action.payload.borrowedMUSD);

      if (borrowedValue > 0) {
        state.collateralRatio = (btcValue / borrowedValue) * 100;
      } else {
        state.collateralRatio = btcValue > 0 ? Infinity : 0;
      }

      // Max borrowable = BTC collateral value * 0.7 (70% LTV)
      state.maxBorrowableMUSD = ((btcValue * 0.7) / 100).toFixed(2);

      state.healthStatus = calculateHealthStatus(state.collateralRatio);
      state.isLoading = false;
      state.error = null;
    },
    updateCollateral: (state, action: PayloadAction<string>) => {
      state.btcCollateral = action.payload;
      const btcValue = parseFloat(action.payload) * 0; // Will be updated with actual BTC price
      const borrowedValue = parseFloat(state.borrowedMUSD);

      if (borrowedValue > 0) {
        state.collateralRatio = (btcValue / borrowedValue) * 100;
      } else {
        state.collateralRatio = btcValue > 0 ? Infinity : 0;
      }
      state.maxBorrowableMUSD = ((btcValue * 0.7) / 100).toFixed(2);
      state.healthStatus = calculateHealthStatus(state.collateralRatio);
    },
    updateBorrowed: (state, action: PayloadAction<string>) => {
      state.borrowedMUSD = action.payload;
      const btcValue = parseFloat(state.btcCollateral) * 0; // Will be updated with actual BTC price
      const borrowedValue = parseFloat(action.payload);

      if (borrowedValue > 0) {
        state.collateralRatio = (btcValue / borrowedValue) * 100;
      } else {
        state.collateralRatio = btcValue > 0 ? Infinity : 0;
      }
      state.healthStatus = calculateHealthStatus(state.collateralRatio);
    },
    reset: (state) => {
      return initialState;
    },
  },
});

export const {
  setLoading,
  setError,
  setBorrowData,
  updateCollateral,
  updateBorrowed,
  reset,
} = borrowSlice.actions;

export default borrowSlice.reducer;

