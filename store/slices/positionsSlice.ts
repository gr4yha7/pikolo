import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Position {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: 'yes' | 'no';
  shares: string;
  entryPrice: number;
  currentPrice: number;
  entryValue: string;
  currentValue: string;
  profitLoss: string;
  profitLossPercent: number;
  status: 'open' | 'closed' | 'redeemable';
  createdAt: number;
  closedAt?: number;
  redeemed?: boolean;
}

export interface PositionsState {
  positions: Position[];
  openPositions: Position[];
  closedPositions: Position[];
  redeemablePositions: Position[];
  totalValue: string;
  totalProfitLoss: string;
  totalProfitLossPercent: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: PositionsState = {
  positions: [],
  openPositions: [],
  closedPositions: [],
  redeemablePositions: [],
  totalValue: '0',
  totalProfitLoss: '0',
  totalProfitLossPercent: 0,
  isLoading: false,
  error: null,
};

const calculateTotals = (positions: Position[]) => {
  const totalValue = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.currentValue || '0'),
    0,
  );
  const totalProfitLoss = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.profitLoss || '0'),
    0,
  );
  const totalEntryValue = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.entryValue || '0'),
    0,
  );
  const totalProfitLossPercent =
    totalEntryValue > 0 ? (totalProfitLoss / totalEntryValue) * 100 : 0;

  return {
    totalValue: totalValue.toFixed(2),
    totalProfitLoss: totalProfitLoss.toFixed(2),
    totalProfitLossPercent: parseFloat(totalProfitLossPercent.toFixed(2)),
  };
};

const positionsSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setPositions: (state, action: PayloadAction<Position[]>) => {
      state.positions = action.payload;
      state.openPositions = action.payload.filter((p) => p.status === 'open');
      state.closedPositions = action.payload.filter((p) => p.status === 'closed');
      state.redeemablePositions = action.payload.filter((p) => p.status === 'redeemable');
      const totals = calculateTotals(action.payload);
      state.totalValue = totals.totalValue;
      state.totalProfitLoss = totals.totalProfitLoss;
      state.totalProfitLossPercent = totals.totalProfitLossPercent;
      state.isLoading = false;
      state.error = null;
    },
    addPosition: (state, action: PayloadAction<Position>) => {
      state.positions.push(action.payload);
      if (action.payload.status === 'open') {
        state.openPositions.push(action.payload);
      }
      const totals = calculateTotals(state.positions);
      state.totalValue = totals.totalValue;
      state.totalProfitLoss = totals.totalProfitLoss;
      state.totalProfitLossPercent = totals.totalProfitLossPercent;
    },
    updatePosition: (state, action: PayloadAction<Partial<Position> & { id: string }>) => {
      const index = state.positions.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.positions[index] = { ...state.positions[index], ...action.payload };
      }

      // Update categorized arrays
      state.openPositions = state.positions.filter((p) => p.status === 'open');
      state.closedPositions = state.positions.filter((p) => p.status === 'closed');
      state.redeemablePositions = state.positions.filter((p) => p.status === 'redeemable');

      const totals = calculateTotals(state.positions);
      state.totalValue = totals.totalValue;
      state.totalProfitLoss = totals.totalProfitLoss;
      state.totalProfitLossPercent = totals.totalProfitLossPercent;
    },
    removePosition: (state, action: PayloadAction<string>) => {
      state.positions = state.positions.filter((p) => p.id !== action.payload);
      state.openPositions = state.openPositions.filter((p) => p.id !== action.payload);
      state.closedPositions = state.closedPositions.filter((p) => p.id !== action.payload);
      state.redeemablePositions = state.redeemablePositions.filter(
        (p) => p.id !== action.payload,
      );
      const totals = calculateTotals(state.positions);
      state.totalValue = totals.totalValue;
      state.totalProfitLoss = totals.totalProfitLoss;
      state.totalProfitLossPercent = totals.totalProfitLossPercent;
    },
  },
});

export const {
  setLoading,
  setError,
  setPositions,
  addPosition,
  updatePosition,
  removePosition,
} = positionsSlice.actions;

export default positionsSlice.reducer;

