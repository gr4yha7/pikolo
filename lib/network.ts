import NetInfo from '@react-native-community/netinfo';

/**
 * Network status detection utility
 */

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Check current network status
 */
export async function getNetworkState(): Promise<NetworkState> {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? null,
    type: state.type ?? null,
  };
}

/**
 * Subscribe to network state changes
 */
export function subscribeToNetworkState(
  callback: (state: NetworkState) => void,
): () => void {
  return NetInfo.addEventListener((state) => {
    callback({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
      type: state.type ?? null,
    });
  });
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await getNetworkState();
  return state.isConnected && (state.isInternetReachable ?? true);
}

