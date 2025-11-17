import { useOfflineQueue } from './OfflineQueueManager';
import api from './api';

export const useScanService = () => {
  const { addItem } = useOfflineQueue();

  const saveScan = async (scanData: any) => {
    try {
      // Try immediate upload first
      console.log('Attempting immediate scan upload...');
      const response = await api.post('/scans', scanData);
      console.log('Scan uploaded successfully');
      return response.data;
    } catch (error: any) {
      console.log('Immediate upload failed, adding to queue:', error.message);
      
      // If offline or network error, add to queue
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine || error.message?.includes('Network Error')) {
        await addItem({
          type: 'SCAN_UPLOAD',
          payload: scanData,
          priority: 'HIGH',
          maxRetries: 3,
        });
        
        // Return local success for UX
        return { 
          success: true, 
          queued: true, 
          message: 'Scan saved locally and will sync when online' 
        };
      }
      throw error;
    }
  };

  const updateUserLocation = async (locationData: any) => {
    try {
      await api.put('/auth/location', locationData);
    } catch (error: any) {
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine || error.message?.includes('Network Error')) {
        await addItem({
          type: 'LOCATION_UPDATE',
          payload: locationData,
          priority: 'MEDIUM',
          maxRetries: 2,
        });
      }
      throw error;
    }
  };

  const updateUserProfile = async (profileData: any) => {
    try {
      await api.put('/auth/profile', profileData);
    } catch (error: any) {
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine || error.message?.includes('Network Error')) {
        await addItem({
          type: 'USER_UPDATE',
          payload: profileData,
          priority: 'MEDIUM',
          maxRetries: 2,
        });
      }
      throw error;
    }
  };

  return {
    saveScan,
    updateUserLocation,
    updateUserProfile,
  };
};
