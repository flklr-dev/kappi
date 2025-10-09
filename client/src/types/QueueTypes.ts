export interface QueueItem {
  id: string;
  type: 'SCAN_UPLOAD' | 'USER_UPDATE' | 'LOCATION_UPDATE';
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED';
}

export interface QueueConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  syncInterval: number;
}

export interface QueueState {
  items: QueueItem[];
  isOnline: boolean;
  isProcessing: boolean;
  config: QueueConfig;
  
  // Actions
  addItem: (item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>) => void;
  processQueue: () => Promise<void>;
  retryFailedItems: () => Promise<void>;
  clearCompletedItems: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
}
