import { create } from 'zustand';
import { NativeModules } from 'react-native';

const { TensorFlowModule } = NativeModules;

// Minimum processing time in milliseconds
const MIN_PROCESSING_TIME = 2000; // 2 seconds

export interface ScanResult {
  disease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'healthy' | 'Unknown';
  stage: 'Early' | 'Progressive' | 'Severe' | 'Healthy' | 'Unknown';
  error?: string;  // Optional error message
}

interface ScanState {
  isProcessing: boolean;
  error: string | null;
  setProcessing: (value: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  classifyImage: (imagePath: string) => Promise<ScanResult>;
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
  }
})); 