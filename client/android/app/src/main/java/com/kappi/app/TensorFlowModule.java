package com.kappi.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Log;
import android.graphics.Color;
import android.content.res.AssetFileDescriptor;
import java.util.Arrays;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import org.tensorflow.lite.Interpreter;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;

public class TensorFlowModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TensorFlowModule";
    private final ReactApplicationContext reactContext;
    private Interpreter classificationModel;
    private Interpreter segmentationModel;
    private static final int INPUT_SIZE = 224;
    private static final int NUM_CHANNELS = 3;
    private static final int NUM_BYTES_PER_CHANNEL = 4;
    private static final int NUM_CLASSES = 5;
    private static final int NUM_SEGMENTATION_CLASSES = 3;
    
    // ✅ STRONGER THRESHOLDS for better rejection of non-leaf objects
    private static final float MIN_CONFIDENCE = 0.60f;  // Increased from 0.50
    private static final float MAX_CONFIDENCE = 0.99f;
    private static final float MIN_ENTROPY_THRESHOLD = 0.6f;  // Lowered from 0.8 (stricter)
    private static final float MAX_ENTROPY_THRESHOLD = 1.2f;  // Lowered from 1.4 (stricter)
    private static final float MIN_MARGIN_THRESHOLD = 0.25f;  // Increased from 0.15 (stricter)
    
    // ✅ ADDITIONAL CHECK for non-leaf rejection
    private static final float MAX_DISEASE_CONFIDENCE_FOR_NON_LEAF = 0.85f;

    public TensorFlowModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        try {
            Log.d(TAG, "=== TensorFlowModule Initialization Started ===");
            
            Interpreter.Options options = new Interpreter.Options();
            options.setNumThreads(Runtime.getRuntime().availableProcessors());
            options.setUseNNAPI(false);
            
            try {
                options.setUseXNNPACK(true);
                Log.d(TAG, "✅ XNNPack acceleration enabled");
            } catch (Exception e) {
                Log.w(TAG, "⚠️ XNNPack not available");
            }
            
            classificationModel = new Interpreter(loadModelFile("classification_model.tflite"), options);
            Log.d(TAG, "✅ Classification model loaded");
            
            segmentationModel = new Interpreter(loadModelFile("segmentation_model.tflite"), options);
            Log.d(TAG, "✅ Segmentation model loaded");
            
            Log.d(TAG, "=== Initialization Complete ===");
        } catch (IOException e) {
            Log.e(TAG, "❌ Error loading models: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public String getName() {
        return "TensorFlowModule";
    }

    private MappedByteBuffer loadModelFile(String modelPath) throws IOException {
        AssetFileDescriptor afd = getReactApplicationContext().getAssets().openFd(modelPath);
        FileInputStream inputStream = new FileInputStream(afd.getFileDescriptor());
        FileChannel fileChannel = inputStream.getChannel();
        long startOffset = afd.getStartOffset();
        long declaredLength = afd.getDeclaredLength();
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength);
    }

    /**
     * ✅ OPTIMIZED: Fast entropy calculation for uncertainty detection
     */
    private float calculateEntropy(float[] probabilities) {
        float entropy = 0.0f;
        for (float prob : probabilities) {
            if (prob > 0.001f) {  // Avoid log(0)
                entropy -= prob * (float)Math.log(prob);
            }
        }
        return entropy;
    }

    /**
     * ✅ OPTIMIZED: Calculate margin between top-2 predictions
     */
    private float calculateTop2Margin(float[] probabilities) {
        float[] sorted = Arrays.copyOf(probabilities, probabilities.length);
        Arrays.sort(sorted);
        return sorted[sorted.length - 1] - sorted[sorted.length - 2];
    }

    /**
     * ✅ OPTIMIZED: Multi-criteria quality check (replaces individual checks)
     */
    private ValidationResult validatePrediction(float[] probabilities, int predictedClass) {
        float maxProb = probabilities[predictedClass];
        float entropy = calculateEntropy(probabilities);
        float margin = calculateTop2Margin(probabilities);
        
        // Check 1: Confidence too low
        if (maxProb < MIN_CONFIDENCE) {
            return new ValidationResult(false, 
                "Low confidence (" + String.format("%.1f%%", maxProb * 100) + "). " +
                "Please ensure good lighting and clear leaf visibility.");
        }
        
        // Check 2: Model confused (high entropy)
        if (entropy > MAX_ENTROPY_THRESHOLD) {
            return new ValidationResult(false,
                "Unable to classify clearly. Please retake photo with leaf centered and well-lit.");
        }
        
        // Check 3: Top-2 predictions too close (ambiguous)
        if (margin < MIN_MARGIN_THRESHOLD) {
            return new ValidationResult(false,
                "Ambiguous detection. Please try a different angle or better lighting.");
        }
        
        // Check 4: Suspiciously perfect (potential overfitting/artifact)
        if (maxProb > MAX_CONFIDENCE) {
            return new ValidationResult(false,
                "Detection uncertain. Please ensure entire leaf is visible and in focus.");
        }
        
        // ✅ NEW: Additional check for non-leaf rejection
        // If disease confidence is too high for a non-leaf object, reject it
        if (predictedClass != 1 && maxProb > MAX_DISEASE_CONFIDENCE_FOR_NON_LEAF) {
            return new ValidationResult(false,
                "Object not recognized as a coffee leaf. Please scan a coffee leaf only.");
        }
        
        // All checks passed
        return new ValidationResult(true, null);
    }

    /**
     * ✅ NEW: Simple validation result class
     */
    private static class ValidationResult {
        boolean isValid;
        String errorMessage;
        
        ValidationResult(boolean isValid, String errorMessage) {
            this.isValid = isValid;
            this.errorMessage = errorMessage;
        }
    }

    /**
     * ✅ OPTIMIZED: Fast green pixel ratio check (downsampled for speed)
     */
    private float calculateGreenRatio(Bitmap bitmap) {
        int sampleSize = 8;  // Sample every 8th pixel for speed
        int greenCount = 0;
        int totalSampled = 0;
        
        for (int x = 0; x < bitmap.getWidth(); x += sampleSize) {
            for (int y = 0; y < bitmap.getHeight(); y += sampleSize) {
                int pixel = bitmap.getPixel(x, y);
                float[] hsv = new float[3];
                Color.RGBToHSV(Color.red(pixel), Color.green(pixel), Color.blue(pixel), hsv);
                
                // Green hue check: [25-120°], saturation >20%, value >15%
                if (hsv[0] >= 25 && hsv[0] <= 120 && hsv[1] >= 0.2f && hsv[2] >= 0.15f) {
                    greenCount++;
                }
                totalSampled++;
            }
        }
        
        return greenCount / (float)totalSampled;
    }
    

    private String getDiseaseName(int classIndex) {
        switch (classIndex) {
            case 0: return "Coffee Brown Spot";
            case 1: return "Healthy";
            case 2: return "Coffee Leaf Rust";
            case 3: return "Coffee Leaf Spot";
            case 4: return "Coffee Sooty Mold";
            default: return "Unknown";
        }
    }

    private float calculateSeverity(Bitmap bitmap) {
        try {
            long startTime = System.currentTimeMillis();
            
            ByteBuffer inputBuffer = ByteBuffer.allocateDirect(
                INPUT_SIZE * INPUT_SIZE * NUM_CHANNELS * NUM_BYTES_PER_CHANNEL
            );
            inputBuffer.order(ByteOrder.nativeOrder());

            int[] pixels = new int[INPUT_SIZE * INPUT_SIZE];
            bitmap.getPixels(pixels, 0, bitmap.getWidth(), 0, 0, bitmap.getWidth(), bitmap.getHeight());
            
            // Preprocessing: [-1, 1] normalization
            for (int pixel : pixels) {
                inputBuffer.putFloat((((pixel >> 16) & 0xFF) / 127.5f) - 1.0f);
                inputBuffer.putFloat((((pixel >> 8) & 0xFF) / 127.5f) - 1.0f);
                inputBuffer.putFloat(((pixel & 0xFF) / 127.5f) - 1.0f);
            }

            float[][][][] outputBuffer = new float[1][INPUT_SIZE][INPUT_SIZE][NUM_SEGMENTATION_CLASSES];
            segmentationModel.run(inputBuffer, outputBuffer);

            // Count pixels
            int leafPixels = 0;
            int lesionPixels = 0;
            
            for (int h = 0; h < INPUT_SIZE; h++) {
                for (int w = 0; w < INPUT_SIZE; w++) {
                    int maxClass = 0;
                    float maxProb = outputBuffer[0][h][w][0];
                    
                    for (int c = 1; c < NUM_SEGMENTATION_CLASSES; c++) {
                        if (outputBuffer[0][h][w][c] > maxProb) {
                            maxProb = outputBuffer[0][h][w][c];
                            maxClass = c;
                        }
                    }
                    
                    if (maxClass == 1) leafPixels++;
                    else if (maxClass == 2) lesionPixels++;
                }
            }

            if (leafPixels == 0) return 0.0f;
            
            float severityPercentage = (lesionPixels * 100.0f) / leafPixels;
            
            Log.d(TAG, "Severity: " + severityPercentage + "% (took " + 
                  (System.currentTimeMillis() - startTime) + "ms)");

            return severityPercentage;

        } catch (Exception e) {
            Log.e(TAG, "Severity calculation error: " + e.getMessage());
            return 0.0f;
        }
    }

    private String getSeverityLevel(float severityPercentage) {
        if (severityPercentage < 10.0f) return "low";
        else if (severityPercentage < 30.0f) return "medium";
        else return "high";
    }

    private String getStageFromSeverity(float severityPercentage) {
        if (severityPercentage < 10.0f) return "Early";
        else if (severityPercentage < 30.0f) return "Progressive";
        else return "Severe";
    }

    // ... existing code ...

    @ReactMethod
    public void classifyImage(String imagePath, Promise promise) {
        try {
            long totalStartTime = System.currentTimeMillis();
            
            // Check models loaded
            if (classificationModel == null || segmentationModel == null) {
                promise.reject("ERROR", "Models not loaded. Please restart app.");
                return;
            }
            
            // Load image
            BitmapFactory.Options bitmapOptions = new BitmapFactory.Options();
            bitmapOptions.inPreferredConfig = Bitmap.Config.ARGB_8888;
            Bitmap originalBitmap = BitmapFactory.decodeFile(imagePath, bitmapOptions);
            
            if (originalBitmap == null) {
                promise.reject("ERROR", "Failed to load image");
                return;
            }
            
            // ✅ OPTIMIZED: Direct resize (no extraction - model trained with backgrounds handles this)
            Bitmap bitmap = Bitmap.createScaledBitmap(originalBitmap, INPUT_SIZE, INPUT_SIZE, true);
            originalBitmap.recycle();
            
            // ✅ OPTIMIZED: Quick green check (downsampled)
            float greenRatio = calculateGreenRatio(bitmap);
            Log.d(TAG, "Green ratio: " + greenRatio);
            
            if (greenRatio < 0.08f) {  // Less than 8% green
                WritableMap result = Arguments.createMap();
                result.putString("disease", "Unknown");
                result.putString("error", "No leaf detected. Please scan a coffee leaf.");
                result.putDouble("confidence", 0.0);
                promise.resolve(result);
                bitmap.recycle();
                return;
            }
            
            // Create input buffer
            ByteBuffer inputBuffer = ByteBuffer.allocateDirect(
                INPUT_SIZE * INPUT_SIZE * NUM_CHANNELS * NUM_BYTES_PER_CHANNEL
            );
            inputBuffer.order(ByteOrder.nativeOrder());

            // Preprocessing
            int[] pixels = new int[INPUT_SIZE * INPUT_SIZE];
            bitmap.getPixels(pixels, 0, bitmap.getWidth(), 0, 0, bitmap.getWidth(), bitmap.getHeight());
            
            for (int pixel : pixels) {
                inputBuffer.putFloat((((pixel >> 16) & 0xFF) / 127.5f) - 1.0f);
                inputBuffer.putFloat((((pixel >> 8) & 0xFF) / 127.5f) - 1.0f);
                inputBuffer.putFloat(((pixel & 0xFF) / 127.5f) - 1.0f);
            }

            // Classification inference
            float[][] outputBuffer = new float[1][NUM_CLASSES];
            long classificationStart = System.currentTimeMillis();
            classificationModel.run(inputBuffer, outputBuffer);
            Log.d(TAG, "Classification took: " + (System.currentTimeMillis() - classificationStart) + "ms");

            // Find predicted class
            int maxIndex = 0;
            float maxProb = outputBuffer[0][0];
            
            for (int i = 1; i < NUM_CLASSES; i++) {
                if (outputBuffer[0][i] > maxProb) {
                    maxProb = outputBuffer[0][i];
                    maxIndex = i;
                }
            }

            Log.d(TAG, "Predictions: " + Arrays.toString(outputBuffer[0]));
            Log.d(TAG, "Predicted class: " + maxIndex + " (confidence: " + maxProb + ")");

            // ✅ OPTIMIZED: Multi-criteria validation
            ValidationResult validation = validatePrediction(outputBuffer[0], maxIndex);
            
            if (!validation.isValid) {
                WritableMap result = Arguments.createMap();
                result.putString("disease", "Unknown");
                result.putString("error", validation.errorMessage);
                result.putDouble("confidence", 0.0);
                promise.resolve(result);
                bitmap.recycle();
                return;
            }

            // Map to disease
            String disease = getDiseaseName(maxIndex);
            String severity = "Unknown";
            String stage = "Unknown";
            float severityPercentage = 0.0f;

            // If diseased, calculate severity
            if (maxIndex != 1 && !disease.equals("Unknown")) {
                Log.d(TAG, "Disease detected: " + disease + ". Running segmentation...");
                severityPercentage = calculateSeverity(bitmap);
                severity = getSeverityLevel(severityPercentage);
                stage = getStageFromSeverity(severityPercentage);
            } else if (maxIndex == 1) {
                // Healthy
                severity = "healthy";
                stage = "Healthy";
            }

            // Create result
            WritableMap result = Arguments.createMap();
            result.putString("disease", disease);
            result.putString("severity", severity);
            result.putString("stage", stage);
            result.putDouble("confidence", maxProb * 100);
            result.putDouble("severityPercentage", severityPercentage);

            Log.d(TAG, "Total inference time: " + (System.currentTimeMillis() - totalStartTime) + "ms");
            Log.d(TAG, "Final result: " + disease + " (" + (maxProb * 100) + "%)");

            promise.resolve(result);
            bitmap.recycle();

        } catch (Exception e) {
            Log.e(TAG, "Classification error: " + e.getMessage());
            e.printStackTrace();
            promise.reject("ERROR", "Classification error: " + e.getMessage());
        }
    }
} 