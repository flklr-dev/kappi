package com.kappi.app;

import android.content.Context;
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

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class TensorFlowModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TensorFlowModule";
    private final ReactApplicationContext reactContext;
    private Interpreter classificationModel;
    private Interpreter segmentationModel;
    private static final int INPUT_SIZE = 224;  // Both models use 224x224
    private static final int NUM_CHANNELS = 3;
    private static final int NUM_BYTES_PER_CHANNEL = 4;
    private static final int NUM_CLASSES = 5;
    private static final int NUM_SEGMENTATION_CLASSES = 3; // background, leaf, lesion
    
    // Thresholds for validation
    private static final float MIN_CONFIDENCE = 0.60f;    // Minimum confidence for classification
    private static final float MAX_CONFIDENCE = 0.99f;   // Maximum realistic confidence

    public TensorFlowModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        try {
            // Configure interpreter options for MAXIMUM PERFORMANCE
            Interpreter.Options options = new Interpreter.Options();
            options.setNumThreads(Runtime.getRuntime().availableProcessors()); // Use all CPU cores
            options.setUseNNAPI(false);  // Disable NNAPI for compatibility
            
            // Enable XNNPack delegate for faster CPU inference
            try {
                options.setUseXNNPACK(true);
                Log.d(TAG, "XNNPack acceleration enabled");
            } catch (Exception e) {
                Log.w(TAG, "XNNPack not available: " + e.getMessage());
            }
            
            // Load classification model (MobileNetV2/EfficientNetB0/ResNet50 - all use [-1,1] preprocessing)
            classificationModel = new Interpreter(loadModelFile("classification_model.tflite"), options);
            Log.d(TAG, "Classification model loaded successfully");
            
            // Load segmentation model (MobileNetV2 U-Net)
            segmentationModel = new Interpreter(loadModelFile("segmentation_model.tflite"), options);
            Log.d(TAG, "Segmentation model loaded successfully");
        } catch (IOException e) {
            Log.e(TAG, "Error loading models: " + e.getMessage());
            e.printStackTrace();
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error initializing TensorFlow: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public String getName() {
        return "TensorFlowModule";
    }

    private MappedByteBuffer loadModelFile(String modelPath) throws IOException {
        Log.d(TAG, "Attempting to load model from: " + modelPath);
        try {
            AssetFileDescriptor afd = getReactApplicationContext().getAssets().openFd(modelPath);
            FileInputStream inputStream = new FileInputStream(afd.getFileDescriptor());
            FileChannel fileChannel = inputStream.getChannel();
            long startOffset = afd.getStartOffset();
            long declaredLength = afd.getDeclaredLength();
            Log.d(TAG, "Model file found. Size: " + declaredLength + " bytes, Offset: " + startOffset);
            return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength);
        } catch (IOException e) {
            Log.e(TAG, "Failed to load model file: " + modelPath + ". Error: " + e.getMessage());
            throw e;
        }
    }

    private float getImageBrightness(Bitmap bitmap) {
        int totalPixels = bitmap.getWidth() * bitmap.getHeight();
        int sampleSize = 10; // Sample every 10th pixel for performance
        int[] brightnessValues = new int[((bitmap.getWidth() / sampleSize) + 1) * ((bitmap.getHeight() / sampleSize) + 1)];
        int index = 0;
        
        // Sample pixels and convert to HSV to get brightness (V channel)
        for (int x = 0; x < bitmap.getWidth(); x += sampleSize) {
            for (int y = 0; y < bitmap.getHeight(); y += sampleSize) {
                int pixel = bitmap.getPixel(x, y);
                int red = Color.red(pixel);
                int green = Color.green(pixel);
                int blue = Color.blue(pixel);
                
                // Convert RGB to HSV and extract brightness (Value)
                float[] hsv = new float[3];
                Color.RGBToHSV(red, green, blue, hsv);
                brightnessValues[index++] = (int) hsv[2]; // V channel (0-255)
            }
        }
        
        // Calculate median brightness
        Arrays.sort(brightnessValues, 0, index);
        float medianBrightness = index % 2 == 0 ? 
            (brightnessValues[index/2] + brightnessValues[index/2 - 1]) / 2.0f : 
            brightnessValues[index/2];
        
        Log.d(TAG, "Median brightness (V): " + medianBrightness + " (sampled " + index + " pixels)");
        return medianBrightness;
    }
    

    
    private String getDiseaseName(int classIndex) {
        switch (classIndex) {
            case 0:  // Brown Spot
                return "Coffee Brown Spot";
            case 1:  // Healthy
                return "Healthy";
            case 2:  // Leaf Rust
                return "Coffee Leaf Rust";
            case 3:  // Leaf Spot
                return "Coffee Leaf Spot";
            case 4:  // Sooty Mold
                return "Coffee Sooty Mold";
            default:
                return "Unknown";
        }
    }

    private float calculateSeverity(Bitmap bitmap) {
        try {
            long startTime = System.currentTimeMillis();
            Log.d(TAG, "Starting severity calculation...");
            
            // Create input buffer for segmentation
            ByteBuffer inputBuffer = ByteBuffer.allocateDirect(
                INPUT_SIZE * INPUT_SIZE * NUM_CHANNELS * NUM_BYTES_PER_CHANNEL
            );
            inputBuffer.order(ByteOrder.nativeOrder());

            // Preprocess the image (same as classification)
            int[] pixels = new int[INPUT_SIZE * INPUT_SIZE];
            bitmap.getPixels(pixels, 0, bitmap.getWidth(), 0, 0, bitmap.getWidth(), bitmap.getHeight());
            
            long preprocessStart = System.currentTimeMillis();
            // CRITICAL FIX: Segmentation preprocessing MUST match training
            // Use [-1, 1] range to match ImageNet-pretrained backbone
            // Formula: (pixel / 127.5) - 1.0  → range [-1, 1]
            for (int pixel : pixels) {
                inputBuffer.putFloat((((pixel >> 16) & 0xFF) / 127.5f) - 1.0f);  // R
                inputBuffer.putFloat((((pixel >> 8) & 0xFF) / 127.5f) - 1.0f);   // G
                inputBuffer.putFloat(((pixel & 0xFF) / 127.5f) - 1.0f);          // B
            }
            long preprocessEnd = System.currentTimeMillis();
            Log.d(TAG, "Segmentation preprocessing took: " + (preprocessEnd - preprocessStart) + "ms");

            // Output buffer: [1, 224, 224, 3] - pixel-wise class probabilities
            float[][][][] outputBuffer = new float[1][INPUT_SIZE][INPUT_SIZE][NUM_SEGMENTATION_CLASSES];

            // Run segmentation inference
            long inferenceStart = System.currentTimeMillis();
            segmentationModel.run(inputBuffer, outputBuffer);
            long inferenceEnd = System.currentTimeMillis();
            Log.d(TAG, "Segmentation inference took: " + (inferenceEnd - inferenceStart) + "ms");

            // Apply morphological cleanup to remove noise (matching training pipeline)
            int[][] pixelClasses = new int[INPUT_SIZE][INPUT_SIZE];
            
            // First pass: assign classes to each pixel
            for (int h = 0; h < INPUT_SIZE; h++) {
                for (int w = 0; w < INPUT_SIZE; w++) {
                    // Find class with highest probability for this pixel
                    int maxClass = 0;
                    float maxProb = outputBuffer[0][h][w][0];
                    
                    for (int c = 1; c < NUM_SEGMENTATION_CLASSES; c++) {
                        if (outputBuffer[0][h][w][c] > maxProb) {
                            maxProb = outputBuffer[0][h][w][c];
                            maxClass = c;
                        }
                    }
                    pixelClasses[h][w] = maxClass;
                }
            }
            
            // Simple morphological cleanup: remove small isolated noise regions
            // This matches the training pipeline's noise reduction (morphology + min area filtering)
            int[][] cleanedClasses = applyMorphologicalCleanup(pixelClasses);
            
            // Count pixels for each class after cleanup
            int backgroundPixels = 0;
            int leafPixels = 0;
            int lesionPixels = 0;
            
            for (int h = 0; h < INPUT_SIZE; h++) {
                for (int w = 0; w < INPUT_SIZE; w++) {
                    int pixelClass = cleanedClasses[h][w];
                    
                    // Count pixels: 0=background, 1=leaf, 2=lesion
                    if (pixelClass == 0) backgroundPixels++;
                    else if (pixelClass == 1) leafPixels++;
                    else if (pixelClass == 2) lesionPixels++;
                }
            }

            Log.d(TAG, "Segmentation results - Background: " + backgroundPixels + ", Leaf: " + leafPixels + ", Lesion: " + lesionPixels);

            // Calculate severity as percentage of lesion area over leaf area
            if (leafPixels == 0) {
                Log.w(TAG, "No leaf pixels detected in segmentation");
                return 0.0f;
            }

            float severityPercentage = (lesionPixels * 100.0f) / leafPixels;
            
            long totalTime = System.currentTimeMillis() - startTime;
            Log.d(TAG, "Calculated severity: " + severityPercentage + "% (total time: " + totalTime + "ms)");

            return severityPercentage;

        } catch (Exception e) {
            Log.e(TAG, "Error calculating severity: " + e.getMessage());
            e.printStackTrace();
            return 0.0f;
        }
    }

    private String getSeverityLevel(float severityPercentage) {
        // Aligned with Android thresholds: Early <10%, Progressive 10-30%, Severe >30%
        if (severityPercentage < 10.0f) {
            return "low";
        } else if (severityPercentage < 30.0f) {
            return "medium";
        } else {
            return "high";
        }
    }

    private String getStageFromSeverity(float severityPercentage) {
        // Android thresholds: Early <10%, Progressive 10-30%, Severe >30%
        if (severityPercentage < 10.0f) {
            return "Early";
        } else if (severityPercentage < 30.0f) {
            return "Progressive";
        } else {
            return "Severe";
        }
    }

    /**
     * Apply morphological cleanup to segmentation output.
     * Matches training pipeline: removes small isolated noise regions.
     * Uses simple 3x3 kernel erosion + dilation (opening operation).
     */
    private int[][] applyMorphologicalCleanup(int[][] pixelClasses) {
        int height = pixelClasses.length;
        int width = pixelClasses[0].length;
        int[][] cleaned = new int[height][width];
        
        // Copy original
        for (int h = 0; h < height; h++) {
            System.arraycopy(pixelClasses[h], 0, cleaned[h], 0, width);
        }
        
        // Simple erosion-dilation (opening) for lesion class (2) to remove small noise
        // This matches the cv2.morphologyEx(MORPH_OPEN) from training
        int[][] temp = new int[height][width];
        
        // Erosion pass (shrink small regions)
        for (int h = 1; h < height - 1; h++) {
            for (int w = 1; w < width - 1; w++) {
                if (cleaned[h][w] == 2) {  // Only process lesion pixels
                    // Check 3x3 neighborhood
                    boolean hasNonLesion = false;
                    for (int dh = -1; dh <= 1; dh++) {
                        for (int dw = -1; dw <= 1; dw++) {
                            if (cleaned[h + dh][w + dw] != 2) {
                                hasNonLesion = true;
                                break;
                            }
                        }
                        if (hasNonLesion) break;
                    }
                    temp[h][w] = hasNonLesion ? 0 : 2;  // Erode if has non-lesion neighbor
                } else {
                    temp[h][w] = cleaned[h][w];
                }
            }
        }
        
        // Dilation pass (restore valid regions)
        for (int h = 1; h < height - 1; h++) {
            for (int w = 1; w < width - 1; w++) {
                if (temp[h][w] == 0) {  // Check if can dilate back
                    boolean hasLesion = false;
                    for (int dh = -1; dh <= 1; dh++) {
                        for (int dw = -1; dw <= 1; dw++) {
                            if (temp[h + dh][w + dw] == 2) {
                                hasLesion = true;
                                break;
                            }
                        }
                        if (hasLesion) break;
                    }
                    // Only dilate if original was lesion AND has lesion neighbors
                    if (hasLesion && cleaned[h][w] == 2) {
                        cleaned[h][w] = 2;
                    } else {
                        cleaned[h][w] = temp[h][w];
                    }
                } else {
                    cleaned[h][w] = temp[h][w];
                }
            }
        }
        
        return cleaned;
    }

    @ReactMethod
    public void classifyImage(String imagePath, Promise promise) {
        try {
            // Check if models loaded successfully
            if (classificationModel == null || segmentationModel == null) {
                Log.e(TAG, "TensorFlow Lite models are not loaded.");
                promise.reject("ERROR", "Models not loaded. Please restart the app.");
                return;
            }
            
            // Load and resize the image with optimized settings
            BitmapFactory.Options bitmapOptions = new BitmapFactory.Options();
            bitmapOptions.inPreferredConfig = Bitmap.Config.ARGB_8888;
            Bitmap originalBitmap = BitmapFactory.decodeFile(imagePath, bitmapOptions);
            
            Bitmap bitmap = Bitmap.createScaledBitmap(
                originalBitmap,
                INPUT_SIZE,
                INPUT_SIZE,
                true
            );
            
            // Free original bitmap memory
            if (originalBitmap != bitmap) {
                originalBitmap.recycle();
            }

            if (bitmap == null) {
                promise.reject("ERROR", "Failed to load image");
                return;
            }


            
            // Create input buffer with correct size
            ByteBuffer inputBuffer = ByteBuffer.allocateDirect(
                INPUT_SIZE * INPUT_SIZE * NUM_CHANNELS * NUM_BYTES_PER_CHANNEL
            );
            inputBuffer.order(ByteOrder.nativeOrder());

            // Preprocess the image
            int[] pixels = new int[INPUT_SIZE * INPUT_SIZE];
            bitmap.getPixels(pixels, 0, bitmap.getWidth(), 0, 0, bitmap.getWidth(), bitmap.getHeight());
            
            for (int pixel : pixels) {
                // Standardized preprocessing for ALL models: scale to [-1, 1] range
                // Formula: (pixel / 127.5) - 1.0
                // This matches training preprocessing for MobileNetV2
                float r = (((pixel >> 16) & 0xFF) / 127.5f) - 1.0f;
                float g = (((pixel >> 8) & 0xFF) / 127.5f) - 1.0f;
                float b = ((pixel & 0xFF) / 127.5f) - 1.0f;
                
                inputBuffer.putFloat(r);
                inputBuffer.putFloat(g);
                inputBuffer.putFloat(b);
            }

            // Log input shape
            Log.d(TAG, "Input shape: [1, " + INPUT_SIZE + ", " + INPUT_SIZE + ", " + NUM_CHANNELS + "]");

            // Output buffer for classification
            float[][] outputBuffer = new float[1][NUM_CLASSES];

            // Run classification inference
            long classificationStart = System.currentTimeMillis();
            classificationModel.run(inputBuffer, outputBuffer);
            long classificationEnd = System.currentTimeMillis();
            Log.d(TAG, "Classification inference took: " + (classificationEnd - classificationStart) + "ms");

            // Log output shape and values
            Log.d(TAG, "Raw output values: " + java.util.Arrays.toString(outputBuffer[0]));

            // Find the class with highest probability and second highest
            int maxIndex = 0;
            float maxProb = outputBuffer[0][0];
            int secondMaxIndex = -1;
            float secondMaxProb = 0.0f;
            
            for (int i = 1; i < NUM_CLASSES; i++) {
                if (outputBuffer[0][i] > maxProb) {
                    // Update second highest before updating highest
                    secondMaxIndex = maxIndex;
                    secondMaxProb = maxProb;
                    // Update highest
                    maxProb = outputBuffer[0][i];
                    maxIndex = i;
                } else if (outputBuffer[0][i] > secondMaxProb) {
                    // Update second highest
                    secondMaxIndex = i;
                    secondMaxProb = outputBuffer[0][i];
                }
            }

            // Log the probabilities for each class
            Log.d(TAG, "Class probabilities:");
            Log.d(TAG, "Class 0: " + outputBuffer[0][0]);
            Log.d(TAG, "Class 1: " + outputBuffer[0][1]);
            Log.d(TAG, "Class 2: " + outputBuffer[0][2]);
            Log.d(TAG, "Class 3: " + outputBuffer[0][3]);
            Log.d(TAG, "Class 4: " + outputBuffer[0][4]);
            Log.d(TAG, "Selected class index: " + maxIndex);

            // Check if the image is likely a leaf
            boolean isLikelyLeaf = false;
            float totalLeafProb = outputBuffer[0][0] + outputBuffer[0][1] + outputBuffer[0][2] + outputBuffer[0][3] + outputBuffer[0][4];
            if (totalLeafProb > 0.5) {  // Lowered from 0.8 to 0.5 for better detection
                isLikelyLeaf = true;
            }

            Log.d(TAG, "Total leaf probability: " + totalLeafProb);
            Log.d(TAG, "Is likely leaf: " + isLikelyLeaf);

            // Map class index to disease
            String disease = "Unknown";
            String severity = "Unknown";
            String stage = "Unknown";
            float confidence = maxProb;
            float severityPercentage = 0.0f;

            if (!isLikelyLeaf || maxProb < MIN_CONFIDENCE || maxProb > MAX_CONFIDENCE) {
                confidence = 0.0f;
            } else {
                // Step 1: Classify disease type
                switch (maxIndex) {
                    case 0:  // Brown Spot
                        disease = "Coffee Brown Spot";
                        break;
                    case 1:  // Healthy
                        disease = "Healthy";
                        severity = "healthy";
                        stage = "Healthy";
                        break;
                    case 2:  // Leaf Rust
                        disease = "Coffee Leaf Rust";
                        break;
                    case 3:  // Leaf Spot
                        disease = "Coffee Leaf Spot";
                        break;
                    case 4:  // Sooty Mold
                        disease = "Coffee Sooty Mold";
                        break;
                    default:
                        disease = "Unknown";
                        severity = "Unknown";
                        stage = "Unknown";
                }

                // Step 2: If not healthy, run segmentation to calculate severity
                if (maxIndex != 1 && !disease.equals("Unknown")) {
                    Log.d(TAG, "Disease detected: " + disease + ". Running segmentation...");
                    severityPercentage = calculateSeverity(bitmap);
                    severity = getSeverityLevel(severityPercentage);
                    stage = getStageFromSeverity(severityPercentage);
                    Log.d(TAG, "Severity: " + severity + " (" + severityPercentage + "%), Stage: " + stage);
                }
            }

            // Create result object
            WritableMap result = Arguments.createMap();
            result.putString("disease", disease);
            result.putString("severity", severity);
            result.putString("stage", stage);
            result.putDouble("confidence", confidence * 100);  // Convert to percentage
            result.putDouble("severityPercentage", severityPercentage);  // Add raw severity percentage
            

            
            // Add secondary prediction if available and different from primary
            if (secondMaxIndex != -1 && secondMaxIndex != maxIndex && secondMaxProb > 0.1f) {
                String secondaryDisease = getDiseaseName(secondMaxIndex);
                WritableMap secondaryPrediction = Arguments.createMap();
                secondaryPrediction.putString("disease", secondaryDisease);
                secondaryPrediction.putDouble("confidence", secondMaxProb * 100);
                result.putMap("secondaryPrediction", secondaryPrediction);
            }

            Log.d(TAG, "Final classification:");
            Log.d(TAG, "Disease: " + disease);
            Log.d(TAG, "Severity: " + severity);
            Log.d(TAG, "Stage: " + stage);
            Log.d(TAG, "Confidence: " + confidence);

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error classifying image: " + e.getMessage());
            promise.reject("ERROR", "Error classifying image: " + e.getMessage());
        }
    }
} 