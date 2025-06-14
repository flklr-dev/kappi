package com.kappi.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Log;

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

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;

public class TensorFlowModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TensorFlowModule";
    private final ReactApplicationContext reactContext;
    private Interpreter tflite;
    private ImageProcessor imageProcessor;

    public TensorFlowModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        try {
            tflite = new Interpreter(loadModelFile());
            imageProcessor = new ImageProcessor.Builder()
                    .add(new ResizeOp(224, 224, ResizeOp.ResizeMethod.BILINEAR))
                    .add(new NormalizeOp(0f, 255f))
                    .build();
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
        File file = new File(reactContext.getFilesDir(), modelPath);
        if (!file.exists()) {
            // Copy from assets if not exists
            try (InputStream inputStream = reactContext.getAssets().open(modelPath);
                 FileOutputStream outputStream = new FileOutputStream(file)) {
                byte[] buffer = new byte[1024];
                int read;
                while ((read = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, read);
                }
            }
        }
        return FileUtil.loadMappedFile(reactContext, modelPath);
    }

    @ReactMethod
    public void classifyImage(String imagePath, Promise promise) {
        try {
            // Load and preprocess image
            Bitmap bitmap = BitmapFactory.decodeFile(imagePath);
            TensorImage tensorImage = new TensorImage();
            tensorImage.load(bitmap);
            tensorImage = imageProcessor.process(tensorImage);

            // Run inference
            float[][] outputBuffer = new float[1][4]; // Adjust size based on your model's output
            tflite.run(tensorImage.getBuffer(), outputBuffer);

            // Process results
            WritableMap result = Arguments.createMap();
            result.putDouble("confidence", outputBuffer[0][0]);
            result.putString("disease", getDiseaseName(outputBuffer[0]));
            result.putString("severity", getSeverity(outputBuffer[0]));

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", "Error classifying image: " + e.getMessage());
        }
    }

    private String getDiseaseName(float[] output) {
        // Implement your disease classification logic here
        // This is a placeholder - adjust based on your model's output
        int maxIndex = 0;
        float maxValue = output[0];
        for (int i = 1; i < output.length; i++) {
            if (output[i] > maxValue) {
                maxValue = output[i];
                maxIndex = i;
            }
        }

        switch (maxIndex) {
            case 0: return "Coffee Leaf Rust";
            case 1: return "Thread Blight";
            case 2: return "Anthracnose";
            case 3: return "Healthy";
            default: return "Unknown";
        }
    }

    private String getSeverity(float[] output) {
        // Implement your severity classification logic here
        float maxValue = 0;
        for (float value : output) {
            if (value > maxValue) maxValue = value;
        }

        if (maxValue > 0.8) return "high";
        if (maxValue > 0.5) return "medium";
        return "low";
    }
} 