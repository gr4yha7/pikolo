import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Market {
  id: string;
  question: string;
  description?: string;
  category: string;
  creator: string;
  yesShares: string;
  noShares: string;
  totalVolume: string;
  endDate: number;
  resolutionDate?: number;
  status: 'pending' | 'resolved' | 'cancelled';
  outcome?: 'yes' | 'no';
  oracleType: 'chainlink' | 'custom';
  oracleAddress?: string;
  yesPrice: number;
  noPrice: number;
  imageUrl?: string;
}

export interface MarketsState {
  markets: Market[];
  selectedMarket: Market | null;
  filteredCategory: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: MarketsState = {
  markets: [],
  selectedMarket: null,
  filteredCategory: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const marketsSlice = createSlice({
  name: 'markets',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setMarkets: (state, action: PayloadAction<Market[]>) => {
      state.markets = action.payload;
      state.lastUpdated = Date.now();
      state.isLoading = false;
      state.error = null;
    },
    addMarket: (state, action: PayloadAction<Market>) => {
      state.markets.unshift(action.payload);
    },
    updateMarket: (state, action: PayloadAction<Partial<Market> & { id: string }>) => {
      const index = state.markets.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        state.markets[index] = { ...state.markets[index], ...action.payload };
      }
      if (state.selectedMarket?.id === action.payload.id) {
        state.selectedMarket = { ...state.selectedMarket, ...action.payload };
      }
    },
    setSelectedMarket: (state, action: PayloadAction<Market | null>) => {
      state.selectedMarket = action.payload;
    },
    setFilteredCategory: (state, action: PayloadAction<string | null>) => {
      state.filteredCategory = action.payload;
    },
    updateMarketLiquidity: (
      state,
      action: PayloadAction<{
        marketId: string;
        yesShares: string;
        noShares: string;
        yesPrice: number;
        noPrice: number;
      }>,
    ) => {
      const market = state.markets.find((m) => m.id === action.payload.marketId);
      if (market) {
        market.yesShares = action.payload.yesShares;
        market.noShares = action.payload.noShares;
        market.yesPrice = action.payload.yesPrice;
        market.noPrice = action.payload.noPrice;
      }
      if (state.selectedMarket?.id === action.payload.marketId) {
        state.selectedMarket.yesShares = action.payload.yesShares;
        state.selectedMarket.noShares = action.payload.noShares;
        state.selectedMarket.yesPrice = action.payload.yesPrice;
        state.selectedMarket.noPrice = action.payload.noPrice;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setMarkets,
  addMarket,
  updateMarket,
  setSelectedMarket,
  setFilteredCategory,
  updateMarketLiquidity,
} = marketsSlice.actions;

export default marketsSlice.reducer;

