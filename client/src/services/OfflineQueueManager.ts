import { create } from 'zustand';
import { secureStorage } from '../utils/secureStorage';
import { QueueItem, QueueConfig, QueueState } from '../types/QueueTypes';
import api from './api';

const QUEUE_KEY = '@kappi_offline_queue';
const DEFAULT_CONFIG: QueueConfig = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  batchSize: 5,
  syncInterval: 30000, // 30 seconds
};

// Process individual queue item
async function processQueueItem(item: QueueItem): Promise<void> {
  try {
    console.log(`Processing queue item: ${item.type}`, item.id);
    
    let result;
    switch (item.type) {
      case 'SCAN_UPLOAD':
        result = await uploadScan(item.payload);
        break;
      case 'USER_UPDATE':
        result = await updateUser(item.payload);
        break;
      case 'LOCATION_UPDATE':
        result = await updateLocation(item.payload);
        break;
      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }

    console.log(`Queue item ${item.id} processed successfully`);
    return result;
  } catch (error) {
    console.error(`Failed to process queue item ${item.id}:`, error);
    throw error;
  }
}

// API functions for different operations
async function uploadScan(scanData: any) {
  const formData = new FormData();
  formData.append('disease', scanData.disease);
  formData.append('confidence', scanData.confidence.toString());
  formData.append('severity', scanData.severity);
  formData.append('stage', scanData.stage);
  
  if (scanData.coordinates) {
    formData.append('coordinates', JSON.stringify(scanData.coordinates));
  }
  if (scanData.address) {
    formData.append('address', JSON.stringify(scanData.address));
  }

  if (scanData.imageUri) {
    const fileExtension = scanData.imageUri.split('.').pop()?.toLowerCase() || 'jpeg';
    const fileName = `scan-${scanData.id}.${fileExtension}`;
    const fileType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

    formData.append('image', {
      uri: scanData.imageUri,
      type: fileType,
      name: fileName,
    } as any);
  }

  const response = await api.post('/scans', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
}

async function updateUser(userData: any) {
  const response = await api.put('/auth/profile', userData);
  return response.data;
}

async function updateLocation(locationData: any) {
  const response = await api.put('/auth/location', locationData);
  return response.data;
}

export const useOfflineQueue = create<QueueState>((set, get) => ({
  items: [],
  isOnline: true,
  isProcessing: false,
  config: DEFAULT_CONFIG,

  addItem: async (itemData) => {
    const newItem: QueueItem = {
      ...itemData,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    };

    const { items } = get();
    const updatedItems = [...items, newItem].sort((a, b) => {
      // Sort by priority, then by timestamp
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || 
             a.timestamp - b.timestamp;
    });

    set({ items: updatedItems });
    await secureStorage.setItem(QUEUE_KEY, updatedItems);
    
    console.log(`Added item to queue: ${newItem.type}`, newItem.id);
    
    // Process immediately if online
    if (get().isOnline) {
      get().processQueue();
    }
  },

  processQueue: async () => {
    const { items, isOnline, isProcessing, config } = get();
    
    if (!isOnline || isProcessing || items.length === 0) {
      console.log('Skipping queue processing:', { isOnline, isProcessing, itemsCount: items.length });
      return;
    }

    console.log('Starting queue processing...');
    set({ isProcessing: true });

    try {
      const pendingItems = items
        .filter(item => item.status === 'PENDING' || item.status === 'FAILED')
        .slice(0, config.batchSize);

      console.log(`Processing ${pendingItems.length} items from queue`);

      for (const item of pendingItems) {
        try {
          // Update status to processing
          const currentItems = get().items;
          const updatedItems = currentItems.map(i => 
            i.id === item.id ? { ...i, status: 'PROCESSING' as const } : i
          );
          set({ items: updatedItems });
          await secureStorage.setItem(QUEUE_KEY, updatedItems);

          // Process the item
          await processQueueItem(item);

          // Mark as completed
          const completedItems = get().items.map(i => 
            i.id === item.id ? { ...i, status: 'COMPLETED' as const } : i
          );
          set({ items: completedItems });
          await secureStorage.setItem(QUEUE_KEY, completedItems);

          console.log(`Queue item ${item.id} completed successfully`);

        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          
          const failedItems = get().items.map(i => 
            i.id === item.id 
              ? { 
                  ...i, 
                  status: 'FAILED' as const, 
                  retryCount: i.retryCount + 1 
                } 
              : i
          );
          set({ items: failedItems });
          await secureStorage.setItem(QUEUE_KEY, failedItems);
        }
      }
    } finally {
      set({ isProcessing: false });
      console.log('Queue processing completed');
    }
  },

  retryFailedItems: async () => {
    const { items, config } = get();
    const failedItems = items.filter(item => 
      item.status === 'FAILED' && 
      item.retryCount < config.maxRetries
    );

    console.log(`Retrying ${failedItems.length} failed items`);

    for (const item of failedItems) {
      // Add exponential backoff
      const delay = config.retryDelay * Math.pow(2, item.retryCount);
      setTimeout(() => {
        get().processQueue();
      }, delay);
    }
  },

  clearCompletedItems: async () => {
    const { items } = get();
    const activeItems = items.filter(item => item.status !== 'COMPLETED');
    set({ items: activeItems });
    await secureStorage.setItem(QUEUE_KEY, activeItems);
    console.log(`Cleared ${items.length - activeItems.length} completed items`);
  },

  setOnlineStatus: (isOnline) => {
    console.log('Network status changed:', isOnline ? 'online' : 'offline');
    set({ isOnline });
    if (isOnline) {
      get().processQueue();
    }
  },
}));

// Initialize queue from storage on app start
export const initializeQueue = async () => {
  try {
    const storedItems = await secureStorage.getItem(QUEUE_KEY) as QueueItem[] || [];
    useOfflineQueue.setState({ items: storedItems });
    console.log(`Initialized queue with ${storedItems.length} items`);
  } catch (error) {
    console.error('Failed to initialize queue:', error);
  }
};
