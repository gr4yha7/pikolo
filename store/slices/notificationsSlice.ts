import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'market_resolved' | 'low_collateral' | 'position_update' | 'reward';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  timestamp: number;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  enabled: boolean;
  preferences: {
    marketResolutions: boolean;
    lowCollateral: boolean;
    positionUpdates: boolean;
    rewards: boolean;
  };
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  enabled: true,
  preferences: {
    marketResolutions: true,
    lowCollateral: true,
    positionUpdates: true,
    rewards: true,
  },
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'read' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        read: false,
        timestamp: Date.now(),
      };
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        state.unreadCount -= 1;
      }
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    setEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },
    updatePreferences: (
      state,
      action: PayloadAction<Partial<NotificationsState['preferences']>>,
    ) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    clearAll: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  setEnabled,
  updatePreferences,
  clearAll,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

