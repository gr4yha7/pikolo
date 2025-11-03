import { configureStore } from '@reduxjs/toolkit';
import borrowReducer from './slices/borrowSlice';
import marketsReducer from './slices/marketsSlice';
import notificationsReducer from './slices/notificationsSlice';
import positionsReducer from './slices/positionsSlice';
import walletReducer from './slices/walletSlice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    markets: marketsReducer,
    positions: positionsReducer,
    borrow: borrowReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for WalletConnect
        ignoredActions: ['wallet/connect/pending', 'wallet/disconnect'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

