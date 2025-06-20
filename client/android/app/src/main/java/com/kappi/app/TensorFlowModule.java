package com.kappi.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Log;
import android.graphics.Color;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.support.common.FileUtil;
import org.tensorflow.lite.support.common.ops.NormalizeOp;
import org.tensorflow.lite.support.image.ImageProcessor;
import org.tensorflow.lite.support.image.TensorImage;
import org.tensorflow.lite.support.image.ops.ResizeOp;
import org.tensorflow.lite.DataType;

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
    private Interpreter tflite;
    private ImageProcessor imageProcessor;
    private static final int INPUT_SIZE = 224;  // Changed to 224 for MobileNetV2
    private static final int NUM_CHANNELS = 3;
    private static final int NUM_BYTES_PER_CHANNEL = 4;
    private static final int NUM_CLASSES = 4;
    
    // Thresholds for validation
    private static final float MIN_GREEN_RATIO = 0.15f;  // Minimum ratio of green pixels
    private static final float MIN_CONFIDENCE = 0.6f;    // Minimum confidence for classification
    private static final float MAX_CONFIDENCE = 0.95f;   // Maximum realistic confidence

    public TensorFlowModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        try {
            tflite = new Interpreter(loadModelFile());
            imageProcessor = new ImageProcessor.Builder()
                    .add(new ResizeOp(INPUT_SIZE, INPUT_SIZE, ResizeOp.ResizeMethod.BILINEAR))
                    .add(new NormalizeOp(0f, 255f))
                    .build();
            Log.d(TAG, "Model loaded successfully");
        } catch (IOException e) {
            Log.e(TAG, "Error loading model: " + e.getMessage());
        }
    }

    @Override
    public String getName() {
        return "TensorFlowModule";
    }

    private MappedByteBuffer loadModelFile() throws IOException {
        String modelPath = "model.tflite";
        FileInputStream inputStream = new FileInputStream(getReactApplicationContext().getAssets().openFd(modelPath).getFileDescriptor());
        FileChannel fileChannel = inputStream.getChannel();
        long startOffset = getReactApplicationContext().getAssets().openFd(modelPath).getStartOffset();
        long declaredLength = getReactApplicationContext().getAssets().openFd(modelPath).getDeclaredLength();
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength);
    }

    private boolean hasEnoughGreen(Bitmap bitmap) {
        int totalPixels = bitmap.getWidth() * bitmap.getHeight();
        int greenPixels = 0;
        
        for (int x = 0; x < bitmap.getWidth(); x++) {
            for (int y = 0; y < bitmap.getHeight(); y++) {
                int pixel = bitmap.getPixel(x, y);
                int red = Color.red(pixel);
                int green = Color.green(pixel);
                int blue = Color.blue(pixel);
                
                // Check if the pixel is predominantly green
                if (green > red && green > blue && green > 50) {
                    greenPixels++;
                }
            }
        }
        
        float greenRatio = (float) greenPixels / totalPixels;
        Log.d(TAG, "Green ratio: " + greenRatio);
        return greenRatio >= MIN_GREEN_RATIO;
    }

    private boolean isImageTooDark(Bitmap bitmap) {
        int totalPixels = bitmap.getWidth() * bitmap.getHeight();
        int darkPixels = 0;
        
        for (int x = 0; x < bitmap.getWidth(); x++) {
            for (int y = 0; y < bitmap.getHeight(); y++) {
                int pixel = bitmap.getPixel(x, y);
                int red = Color.red(pixel);
                int green = Color.green(pixel);
                int blue = Color.blue(pixel);
                
                // Check if the pixel is too dark
                if (red < 30 && green < 30 && blue < 30) {
                    darkPixels++;
                }
            }
        }
        
        float darkRatio = (float) darkPixels / totalPixels;
        Log.d(TAG, "Dark ratio: " + darkRatio);
        return darkRatio > 0.5f;  // If more than 50% is dark
    }

    @ReactMethod
    public void classifyImage(String imagePath, Promise promise) {
        try {
            // Load and resize the image
            Bitmap bitmap = Bitmap.createScaledBitmap(
                BitmapFactory.decodeFile(imagePath),
                INPUT_SIZE,
                INPUT_SIZE,
                true
            );

            if (bitmap == null) {
                promise.reject("ERROR", "Failed to load image");
                return;
            }

            // Check if image is too dark
            if (isImageTooDark(bitmap)) {
                WritableMap result = Arguments.createMap();
                result.putString("disease", "Unknown");
                result.putString("severity", "Unknown");
                result.putString("stage", "Unknown");
                result.putDouble("confidence", 0.0);
                result.putString("error", "Image is too dark. Please ensure good lighting.");
                promise.resolve(result);
                return;
            }

            // Check if image has enough green
            if (!hasEnoughGreen(bitmap)) {
                WritableMap result = Arguments.createMap();
                result.putString("disease", "Unknown");
                result.putString("severity", "Unknown");
                result.putString("stage", "Unknown");
                result.putDouble("confidence", 0.0);
                result.putString("error", "No coffee leaf detected. Please ensure you're scanning a coffee leaf.");
                promise.resolve(result);
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
                // Normalize pixel values to [0, 1]
                inputBuffer.putFloat(((pixel >> 16) & 0xFF) / 255.0f);
                inputBuffer.putFloat(((pixel >> 8) & 0xFF) / 255.0f);
                inputBuffer.putFloat((pixel & 0xFF) / 255.0f);
            }

            // Log input shape
            Log.d(TAG, "Input shape: [1, " + INPUT_SIZE + ", " + INPUT_SIZE + ", " + NUM_CHANNELS + "]");

            // Output buffer for 4 classes
            float[][] outputBuffer = new float[1][NUM_CLASSES];

            // Run inference
            tflite.run(inputBuffer, outputBuffer);

            // Log output shape and values
            Log.d(TAG, "Raw output values: " + java.util.Arrays.toString(outputBuffer[0]));

            // Find the class with highest probability
            int maxIndex = 0;
            float maxProb = outputBuffer[0][0];
            for (int i = 1; i < NUM_CLASSES; i++) {
                if (outputBuffer[0][i] > maxProb) {
                    maxProb = outputBuffer[0][i];
                    maxIndex = i;
                }
            }

            // Log the probabilities for each class
            Log.d(TAG, "Class probabilities:");
            Log.d(TAG, "Healthy: " + outputBuffer[0][0]);
            Log.d(TAG, "Early: " + outputBuffer[0][1]);
            Log.d(TAG, "Progressive: " + outputBuffer[0][2]);
            Log.d(TAG, "Severe: " + outputBuffer[0][3]);
            Log.d(TAG, "Selected class index: " + maxIndex);

            // Check if the image is likely a leaf
            boolean isLikelyLeaf = false;
            float totalLeafProb = outputBuffer[0][0] + outputBuffer[0][1] + outputBuffer[0][2] + outputBuffer[0][3];
            if (totalLeafProb > 0.8) {  // If total probability is high enough
                isLikelyLeaf = true;
            }

            // Map class index to disease and severity
            String disease;
            String severity;
            String stage;
            float confidence = maxProb;

            // If not likely a leaf or confidence is too high/low, classify as unknown
            if (!isLikelyLeaf || maxProb < MIN_CONFIDENCE || maxProb > MAX_CONFIDENCE) {
                disease = "Unknown";
                severity = "Unknown";
                stage = "Unknown";
                confidence = 0.0f;
            } else {
            switch (maxIndex) {
                case 0:  // Healthy
                    disease = "Healthy";
                    severity = "None";
                    stage = "Healthy";
                    break;
                case 1:  // Early
                    disease = "Coffee Leaf Rust";
                    severity = "Low";
                    stage = "Early";
                    break;
                case 2:  // Progressive
                    disease = "Coffee Leaf Rust";
                    severity = "Medium";
                    stage = "Progressive";
                    break;
                case 3:  // Severe
                    disease = "Coffee Leaf Rust";
                    severity = "High";
                    stage = "Severe";
                    break;
                default:
                    disease = "Unknown";
                    severity = "Unknown";
                    stage = "Unknown";
                }
            }

            // Create result object
            WritableMap result = Arguments.createMap();
            result.putString("disease", disease);
            result.putString("severity", severity);
            result.putString("stage", stage);
            result.putDouble("confidence", confidence * 100);  // Convert to percentage

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