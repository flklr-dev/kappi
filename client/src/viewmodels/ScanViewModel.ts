import { create } from 'zustand';
import { NativeModules } from 'react-native';
import { secureStorage } from '../utils/secureStorage';
import { useAuthStore } from '../stores/authStore';
import { useOfflineQueue } from '../services/OfflineQueueManager';
import api from '../services/api';
import { eventBus } from '../utils/eventBus';

const { TensorFlowModule } = NativeModules;

// Minimum processing time in milliseconds
const MIN_PROCESSING_TIME = 2000; // 2 seconds

const SCANS_KEY = '@kappi_scan_results';

export interface ScanResult {
  disease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'healthy' | 'Unknown';
  stage: 'Early' | 'Progressive' | 'Severe' | 'Healthy' | 'Unknown';
  error?: string;  // Optional error message
}

interface LocalScanResult extends ScanResult {
  id: string;
  imageUri?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: {
    barangay: string;
    cityMunicipality: string;
    province: string;
  };
  createdAt: number;
  deleted?: boolean; // Soft delete flag
}

interface ScanState {
  isProcessing: boolean;
  error: string | null;
  setProcessing: (value: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  classifyImage: (imagePath: string) => Promise<ScanResult>;
  saveScanResult: (scan: Omit<LocalScanResult, 'id' | 'createdAt'>) => Promise<void>;
  getLocalScans: (options?: { includeDeleted?: boolean }) => Promise<LocalScanResult[]>;
  syncScans: () => Promise<void>;
  softDeleteScan: (id: string) => Promise<void>;
}

export const useScanStore = create<ScanState>((set, get) => ({
  isProcessing: false,
  error: null,

  setProcessing: (value) => set({ isProcessing: value }),
  setError: (error) => set({ error }),
  reset: () => set({ isProcessing: false, error: null }),

  classifyImage: async (imagePath: string): Promise<ScanResult> => {
    const startTime = Date.now();
    try {
      set({ isProcessing: true, error: null });

      // Remove 'file://' prefix if present
      const cleanPath = imagePath.replace('file://', '');
      
      // Call the native TensorFlow module to classify the image
      const result = await TensorFlowModule.classifyImage(cleanPath);
      
      // Log the COMPLETELY raw model output
      console.log('=== RAW MODEL OUTPUT ===');
      console.log('Full result object:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));
      console.log('Raw disease value:', result.disease);
      console.log('Raw confidence value:', result.confidence);
      console.log('Raw severity value:', result.severity);
      console.log('Raw stage value:', result.stage);
      console.log('=====================');

      // Check for healthy plant - handle different possible formats
      const diseaseName = result.disease?.toLowerCase() || '';
      const isHealthy = diseaseName === 'healthy' || 
                       diseaseName === 'healthy plant' || 
                       diseaseName.includes('healthy');

      console.log('Processed disease name:', diseaseName);
      console.log('Is healthy?', isHealthy);

      if (isHealthy) {
        const healthyResult = {
          disease: 'Healthy Plant',
          confidence: Math.round(result.confidence),
          severity: 'healthy' as const,
          stage: 'Healthy' as const
        };
        console.log('Processed healthy result:', healthyResult);
        
        // Ensure minimum processing time
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < MIN_PROCESSING_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_PROCESSING_TIME - elapsedTime));
        }
        
        return healthyResult;
      }

      // Map the disease name to the correct format
      let formattedDiseaseName = result.disease;
      if (formattedDiseaseName.startsWith('CLR_')) {
        formattedDiseaseName = 'Coffee Leaf Rust';
      }
      
      // Use the model's severity and stage directly
      const severity = result.severity?.toLowerCase() as 'low' | 'medium' | 'high';
      const stage = result.stage as 'Early' | 'Progressive' | 'Severe';
      
      const finalResult: ScanResult = {
        disease: formattedDiseaseName,
        confidence: Math.round(result.confidence),
        severity,
        stage
      };

      console.log('Final processed result:', finalResult);
      
      // Ensure minimum processing time
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < MIN_PROCESSING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_PROCESSING_TIME - elapsedTime));
      }
      
      return finalResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Classification error:', errorMessage);
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isProcessing: false });
    }
  },

  saveScanResult: async (scan) => {
    // Generate a unique id and timestamp
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = Date.now();
    const scanWithMeta: LocalScanResult = { ...scan, id, createdAt };
    
    // Save locally first
    const existing = (await secureStorage.getItem(SCANS_KEY)) as LocalScanResult[] || [];
    await secureStorage.setItem(SCANS_KEY, [scanWithMeta, ...existing]);

    // Add to offline queue for sync
    const { addItem } = useOfflineQueue.getState();
    await addItem({
      type: 'SCAN_UPLOAD',
      payload: scanWithMeta,
      priority: 'HIGH',
      maxRetries: 3,
    });
    
    console.log('Scan saved locally and added to sync queue');
  },

  getLocalScans: async (options = {}) => {
    const all = (await secureStorage.getItem(SCANS_KEY)) as LocalScanResult[] || [];
    if (options.includeDeleted) return all;
    return all.filter(scan => !scan.deleted);
  },

  syncScans: async () => {
    const { user } = useAuthStore.getState();
    const tokenData = await secureStorage.getItem('@kappi_auth_token');
    if (!user || !tokenData) {
      console.log('No user or token, skipping sync');
      return;
    }
    let scans = (await secureStorage.getItem(SCANS_KEY)) as LocalScanResult[] || [];
    let unsynced: LocalScanResult[] = [];
    for (const scan of scans) {
      try {
        console.log('Syncing scan to backend (axios):', scan);

        const formData = new FormData();
        formData.append('disease', scan.disease);
        formData.append('confidence', scan.confidence.toString());
        formData.append('severity', scan.severity);
        formData.append('stage', scan.stage);
        if (scan.coordinates) {
          formData.append('coordinates', JSON.stringify(scan.coordinates));
        }
        if (scan.address) {
          formData.append('address', JSON.stringify(scan.address));
        }

        if (scan.imageUri) {
          // Determine file type from URI or default to jpeg
          const fileExtension = scan.imageUri.split('.').pop()?.toLowerCase() || 'jpeg';
          const fileName = `scan-${scan.id}.${fileExtension}`;
          const fileType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

          formData.append('image', {
            uri: scan.imageUri,
            type: fileType,
            name: fileName,
          } as any);
        }

        const response = await api.post('/scans', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Sync response:', response.data);
        // Only keep in local storage if sync failed
        const data = response.data as any;
        if (!data || !data.scan || response.status >= 400) {
          unsynced.push(scan);
        } else {
          // notify listeners a new scan has been synced
          eventBus.emit('scan:added', data.scan);
          // Don't add to unsynced list since it was successfully synced
        }
      } catch (error: any) {
        console.log('Sync error:', error?.response?.data || error.message || error);
        unsynced.push(scan); // Keep unsynced if error
      }
    }
    // Update local storage with only unsynced scans
    await secureStorage.setItem(SCANS_KEY, unsynced);
  },

  softDeleteScan: async (id) => {
    const all = (await secureStorage.getItem(SCANS_KEY)) as LocalScanResult[] || [];
    const updated = all.map(scan => scan.id === id ? { ...scan, deleted: true } : scan);
    await secureStorage.setItem(SCANS_KEY, updated);
  }
})); 