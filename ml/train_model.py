import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.metrics import Precision, Recall
from tensorflow.keras.regularizers import l2
import matplotlib.pyplot as plt

# GPU Configuration
def configure_gpu():
    """Configure GPU for optimal performance."""
    try:
        # List all GPUs
        gpus = tf.config.list_physical_devices('GPU')
        if not gpus:
            print("No GPU devices found. Running on CPU.")
            return False
        
        print(f"Found {len(gpus)} GPU(s):")
        for gpu in gpus:
            print(f" - {gpu}")
            
        # Enable memory growth for all GPUs
        for gpu in gpus:
            try:
                tf.config.experimental.set_memory_growth(gpu, True)
                print(f"Memory growth enabled for {gpu}")
            except RuntimeError as e:
                print(f"Error enabling memory growth: {e}")
        
        # Set mixed precision policy
        policy = tf.keras.mixed_precision.Policy('mixed_float16')
        tf.keras.mixed_precision.set_global_policy(policy)
        print("Mixed precision policy set to float16")
        
        return True
    except Exception as e:
        print(f"Error configuring GPU: {e}")
        return False

# Configuration
CONFIG = {
    'img_size': (224, 224),
    'batch_size': 32,  # Reduced batch size for stability
    'epochs': 10,
    'learning_rate': 0.001,
    'train_split': 0.8,
    'random_seed': 42,
    'model_export_path': 'model_export',
    'l2_lambda': 0.01,
    'early_stopping_patience': 10,
    'early_stopping_min_delta': 0.001,
    'reduce_lr_patience': 5,
    'reduce_lr_factor': 0.5,
    'min_lr': 1e-6
}

def calculate_class_weights(generator):
    """Calculate class weights based on the distribution of samples."""
    total_counts = generator.classes.shape[0]
    class_counts = np.bincount(generator.classes)
    class_weights = {i: total_counts / (len(class_counts) * count) 
                    for i, count in enumerate(class_counts)}
    return class_weights

def create_data_generators():
    """Create train and validation data generators with augmentation."""
    # Training data generator with augmentation
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        zoom_range=0.2,
        shear_range=0.2,
        brightness_range=[0.8, 1.2],
        fill_mode='nearest',
        validation_split=1 - CONFIG['train_split']
    )
    
    # Validation data generator with only rescaling
    valid_datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=1 - CONFIG['train_split']
    )
    
    # Training data
    train_data = train_datagen.flow_from_directory(
        'data/processed',
        target_size=CONFIG['img_size'],
        batch_size=CONFIG['batch_size'],
        class_mode='categorical',
        subset='training',
        shuffle=True,
        seed=CONFIG['random_seed']
    )
    
    # Validation data
    valid_data = valid_datagen.flow_from_directory(
        'data/processed',
        target_size=CONFIG['img_size'],
        batch_size=CONFIG['batch_size'],
        class_mode='categorical',
        subset='validation',
        shuffle=False,
        seed=CONFIG['random_seed']
    )
    
    return train_data, valid_data

def build_model(num_classes):
    """Build and compile the model with L2 regularization."""
    # Load the pretrained EfficientNetB0 model
    base_model = EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=(*CONFIG['img_size'], 3)
    )
    
    # Unfreeze the last 30 layers
    for layer in base_model.layers[-30:]:
        layer.trainable = True
    
    # Add custom classification head with L2 regularization
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(1024, activation='relu', 
              kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(0.5)(x)
    x = Dense(512, activation='relu',
              kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    outputs = Dense(num_classes, activation='softmax',
                   kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    
    # Create the full model
    model = Model(inputs=base_model.input, outputs=outputs)
    
    # Compile the model
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate']),
        loss='categorical_crossentropy',
        metrics=['accuracy', Precision(), Recall()]
    )
    
    return model

def plot_training_history(history):
    """Plot training history."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    
    # Plot accuracy
    ax1.plot(history.history['accuracy'], label='Training')
    ax1.plot(history.history['val_accuracy'], label='Validation')
    ax1.set_title('Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    
    # Plot loss
    ax2.plot(history.history['loss'], label='Training')
    ax2.plot(history.history['val_loss'], label='Validation')
    ax2.set_title('Model Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    
    plt.tight_layout()
    
    # Create model_export directory if it doesn't exist
    os.makedirs(CONFIG['model_export_path'], exist_ok=True)
    plt.savefig(os.path.join(CONFIG['model_export_path'], 'training_history.png'))
    plt.close()

def convert_to_tflite(model):
    """Convert Keras model to TFLite format."""
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    
    # Save TFLite model
    tflite_path = os.path.join(CONFIG['model_export_path'], 'model.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)

def main():
    # Configure GPU
    print("\nConfiguring GPU...")
    gpu_available = configure_gpu()
    if gpu_available:
        print("GPU configuration completed successfully.")
    else:
        print("Warning: Training will proceed on CPU.")
    
    # Create data generators
    print("\nCreating data generators...")
    train_generator, valid_generator = create_data_generators()
    
    # Calculate class weights
    print("\nCalculating class weights...")
    class_weights = calculate_class_weights(train_generator)
    print("Class weights:", class_weights)
    
    # Build and compile model
    print("\nBuilding model...")
    model = build_model(num_classes=len(train_generator.class_indices))
    
    # Print model summary
    model.summary()
    
    # Create model_export directory
    os.makedirs(CONFIG['model_export_path'], exist_ok=True)
    
        # Train model
    print("\nTraining model...")
    try:
        history = model.fit(
            train_generator,
            validation_data=valid_generator,
            epochs=CONFIG['epochs'],
            class_weight=class_weights,
            callbacks=[
                tf.keras.callbacks.ModelCheckpoint(
                    os.path.join(CONFIG['model_export_path'], 'model.h5'),
                    save_best_only=True,
                    monitor='val_accuracy',
                    mode='max'
                ),
                tf.keras.callbacks.EarlyStopping(
                    monitor='val_accuracy',
                    patience=CONFIG['early_stopping_patience'],
                    restore_best_weights=True,
                    mode='max',
                    min_delta=CONFIG['early_stopping_min_delta'],
                    verbose=1
                ),
                tf.keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=CONFIG['reduce_lr_factor'],
                    patience=CONFIG['reduce_lr_patience'],
                    min_lr=CONFIG['min_lr'],
                    verbose=1
                ),
                tf.keras.callbacks.TensorBoard(
                    log_dir='./logs',
                    histogram_freq=1,
                    update_freq='epoch'
                )
            ]
        )
        
        # Plot training history
        print("\nPlotting training history...")
        plot_training_history(history)
        
        # Save model in TFLite format
        print("\nConverting to TFLite format...")
        convert_to_tflite(model)
        
        print("\nTraining completed! Model saved in", CONFIG['model_export_path'])
        
        # Print final metrics
        final_metrics = model.evaluate(valid_generator)
        metrics_names = ['Loss', 'Accuracy', 'Precision', 'Recall']
        print("\nFinal Metrics:")
        for name, value in zip(metrics_names, final_metrics):
            print(f"{name}: {value:.4f}")
    except Exception as e:
        print(f"\nError during training: {e}")
        raise

if __name__ == "__main__":
    main() 