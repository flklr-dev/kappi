import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2  # Lighter model for CPU
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization, Input
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.metrics import Precision, Recall
from tensorflow.keras.regularizers import l2
import matplotlib.pyplot as plt
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint, TensorBoard

# Configuration
CONFIG = {
    'img_size': (224, 224),  # Smaller size for MobileNetV2
    'batch_size': 16,        # Reduced for better gradient updates
    'epochs': 100,           # Increased epochs for better convergence
    'learning_rate': 0.0005, # Lower learning rate for better precision
    'dropout_rate': 0.4,     # Increased dropout for better generalization
    'data_dir': os.path.join(os.path.dirname(__file__), 'data', 'processed'),
    'model_export_path': 'model_export',
    'l2_lambda': 0.0005,     # Increased regularization
    'early_stopping_patience': 15,
    'early_stopping_min_delta': 0.0005,
    'reduce_lr_patience': 8,
    'reduce_lr_factor': 0.3,
    'min_lr': 1e-7,
    'num_classes': 4,
    'label_smoothing': 0.05  # Reduced label smoothing
}

def calculate_class_weights(generator):
    """Calculate class weights based on the distribution of samples."""
    total_counts = generator.classes.shape[0]
    class_counts = np.bincount(generator.classes)
    class_weights = {i: total_counts / (len(class_counts) * count) 
                    for i, count in enumerate(class_counts)}
    return class_weights

def create_data_generators():
    """Create train and validation data generators with balanced augmentation."""
    base_path = os.path.abspath(os.path.dirname(__file__))
    data_path = os.path.join(base_path, 'data', 'processed')
    
    print(f"\nLoading data from: {data_path}")
    
    if not os.path.exists(data_path):
        raise ValueError(f"Data directory not found: {data_path}")
    
    # Print dataset statistics
    for split in ['train', 'val']:
        split_path = os.path.join(data_path, split)
        print(f"\n{split.upper()} set:")
        for category in os.listdir(split_path):
            category_path = os.path.join(split_path, category)
            if os.path.isdir(category_path):
                num_images = len([f for f in os.listdir(category_path) 
                                if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                print(f"{category}: {num_images} images")
    
    # Training data generator with balanced augmentation
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        brightness_range=[0.8, 1.2],
        validation_split=0.2
    )
    
    # Validation data generator
    valid_datagen = ImageDataGenerator(
        rescale=1./255
    )
    
    # Training data
    train_data = train_datagen.flow_from_directory(
        os.path.join(data_path, 'train'),
        target_size=CONFIG['img_size'],
        batch_size=CONFIG['batch_size'],
        class_mode='categorical',
        shuffle=True,
        seed=42
    )
    
    # Validation data
    valid_data = valid_datagen.flow_from_directory(
        os.path.join(data_path, 'val'),
        target_size=CONFIG['img_size'],
        batch_size=CONFIG['batch_size'],
        class_mode='categorical',
        shuffle=False
    )
    
    return train_data, valid_data

def build_model(num_classes):
    """Build a lighter model suitable for CPU training."""
    # Input layer
    inputs = Input(shape=(*CONFIG['img_size'], 3))
    
    # Load pre-trained MobileNetV2
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_tensor=inputs
    )
    
    # Freeze most of the base model
    for layer in base_model.layers[:-30]:  # Unfreeze last 30 layers for better adaptation
        layer.trainable = False
    
    # Add custom layers
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    
    # Enhanced architecture for better feature learning
    x = Dense(1024, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'])(x)
    
    x = Dense(512, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'])(x)
    
    # Output layer
    predictions = Dense(num_classes, activation='softmax')(x)
    
    # Create model
    model = Model(inputs=inputs, outputs=predictions)
    
    # Use Adam optimizer with better parameters
    optimizer = Adam(
        learning_rate=CONFIG['learning_rate'],
        beta_1=0.9,
        beta_2=0.999,
        epsilon=1e-07,
        amsgrad=True
    )
    
    # Compile model
    model.compile(
        optimizer=optimizer,
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=CONFIG['label_smoothing']),
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

def train_model():
    """Train the model with optimized settings for CPU."""
    # Create data generators
    train_data, valid_data = create_data_generators()
    
    # Calculate class weights
    class_weights = calculate_class_weights(train_data)
    print("\nClass weights:", class_weights)
    
    # Build model
    model = build_model(len(train_data.class_indices))
    
    # Create callbacks
    callbacks = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model.keras'),
            monitor='val_accuracy',
            save_best_only=True,
            mode='max',
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=CONFIG['reduce_lr_factor'],
            patience=CONFIG['reduce_lr_patience'],
            min_lr=CONFIG['min_lr'],
            verbose=1
        ),
        EarlyStopping(
            monitor='val_accuracy',
            patience=CONFIG['early_stopping_patience'],
            min_delta=CONFIG['early_stopping_min_delta'],
            restore_best_weights=True,
            verbose=1
        ),
        TensorBoard(
            log_dir=os.path.join(CONFIG['model_export_path'], 'logs'),
            histogram_freq=1
        )
    ]
    
    # Train model
    print("\nTraining model...")
    history = model.fit(
        train_data,
        validation_data=valid_data,
        epochs=CONFIG['epochs'],
        callbacks=callbacks,
        class_weight=class_weights,
        verbose=1
    )
    
    # Plot training history
    plot_training_history(history)
    
    # Convert to TFLite
    print("\nConverting model to TFLite format...")
    convert_to_tflite(model)
    
    return model, history

def main():
    print("\nStarting model training...")
    try:
        model, history = train_model()
        print("\nTraining completed successfully!")
        
    except Exception as e:
        print(f"\nError during training: {e}")
        raise

if __name__ == "__main__":
    main() 