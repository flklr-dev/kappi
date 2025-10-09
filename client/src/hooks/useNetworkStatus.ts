import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineQueue } from '../services/OfflineQueueManager';

export const useNetworkStatus = () => {
  const { setOnlineStatus, processQueue } = useOfflineQueue();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = !!(state.isConnected && state.isInternetReachable);
      setOnlineStatus(isOnline);
      
      if (isOnline) {
        console.log('Network restored, processing queue...');
        // Process queue when coming back online
        processQueue();
      }
    });

    return unsubscribe;
  }, [setOnlineStatus, processQueue]);
};
