import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization, Input
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.metrics import Precision, Recall
from tensorflow.keras.regularizers import l2
import matplotlib.pyplot as plt
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint, TensorBoard, LearningRateScheduler
from tensorflow.keras.metrics import TopKCategoricalAccuracy
import json
import math

CONFIG = {
    'img_size': (224, 224),  
    'batch_size': 32,  # Increased batch size for better gradient estimates
    'epochs': 150,  # More epochs for better convergence
    'learning_rate': 0.001,  # Slightly higher LR for faster initial learning
    'dropout_rate': 0.3,  # Reduced dropout for better feature learning
    'data_dir': os.path.join(os.path.dirname(__file__), 'data', 'processed'),
    'model_export_path': 'model_export',
    'l2_lambda': 0.0001,  # Reduced L2 regularization
    'early_stopping_patience': 20,  # More patience for better convergence
    'early_stopping_min_delta': 0.0001,  # Smaller delta for finer optimization
    'reduce_lr_patience': 10,  # More patience before reducing LR
    'reduce_lr_factor': 0.5,  # Less aggressive LR reduction
    'min_lr': 1e-6,  # Higher minimum LR
    'num_classes': 4,
    'label_smoothing': 0.1,  # Increased label smoothing for better generalization
    'warmup_epochs': 5,  # Add warmup for stable training
    'cosine_restarts': True  # Use cosine annealing with restarts
}

def cosine_annealing_schedule(epoch, lr):
    """Cosine annealing learning rate schedule."""
    if epoch < CONFIG['warmup_epochs']:
        # Warmup phase
        return CONFIG['learning_rate'] * (epoch + 1) / CONFIG['warmup_epochs']
    else:
        # Cosine annealing
        progress = (epoch - CONFIG['warmup_epochs']) / (CONFIG['epochs'] - CONFIG['warmup_epochs'])
        return CONFIG['learning_rate'] * (1 + math.cos(math.pi * progress)) / 2

def save_training_metrics(history, model_name="MobileNetV2"):
    """Save training metrics to JSON for analysis."""
    metrics = {
        'model_name': model_name,
        'final_train_accuracy': float(history.history['accuracy'][-1]),
        'final_val_accuracy': float(history.history['val_accuracy'][-1]),
        'best_val_accuracy': float(max(history.history['val_accuracy'])),
        'final_train_loss': float(history.history['loss'][-1]),
        'final_val_loss': float(history.history['val_loss'][-1]),
        'best_val_loss': float(min(history.history['val_loss'])),
        'total_epochs': len(history.history['accuracy']),
        'config': CONFIG
    }
    
    os.makedirs(CONFIG['model_export_path'], exist_ok=True)
    with open(os.path.join(CONFIG['model_export_path'], f'{model_name}_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
    
def calculate_class_weights(generator):
    """Calculate class weights based on the distribution of samples."""
    total_counts = generator.classes.shape[0]
    class_counts = np.bincount(generator.classes)
    class_weights = {i: total_counts / (len(class_counts) * count) 
                    for i, count in enumerate(class_counts)}
    return class_weights
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
    
    # Training data generator with balanced augmentation and MobileNetV2 preprocessing
    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        brightness_range=[0.8, 1.2]
    )
    
    # Validation data generator
    valid_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
    
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
    
    # Freeze most of the base model initially
    for layer in base_model.layers[:-20]:  # Unfreeze last 20 layers for better adaptation
        layer.trainable = False
    
    # Add custom layers
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    
    # Enhanced architecture for better feature learning
    x = Dense(512, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'])(x)
    
    x = Dense(256, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'] * 0.5)(x)  # Less dropout in final layers
    
    # Output layer
    predictions = Dense(num_classes, activation='softmax')(x)
    
    # Create model
    model = Model(inputs=inputs, outputs=predictions)
    
    # Use AdamW optimizer with better parameters for plant disease classification
    from tensorflow.keras.optimizers import AdamW
    try:
        optimizer = AdamW(
            learning_rate=CONFIG['learning_rate'],
            weight_decay=0.0001,  # L2 regularization via weight decay
            beta_1=0.9,
            beta_2=0.999,
            epsilon=1e-07,
            amsgrad=True
        )
    except:
        # Fallback to Adam if AdamW is not available
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
        metrics=['accuracy', 
                Precision(name='precision'), 
                Recall(name='recall'),
                TopKCategoricalAccuracy(k=2, name='top_2_accuracy')]  # Add top-2 accuracy for multi-class
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
    try:
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
    except Exception:
        pass
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
    
    # Phase 1: train classification head with enhanced callbacks
    print("\nPhase 1: Training classification head...")
    from tensorflow.keras.callbacks import LearningRateScheduler
    
    callbacks_phase1 = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model_phase1.keras'),
            monitor='val_accuracy',  # Monitor accuracy instead of loss
            save_best_only=True,
            mode='max',  # Maximize accuracy
            verbose=1,
            save_weights_only=False
        ),
        LearningRateScheduler(cosine_annealing_schedule, verbose=1),
        EarlyStopping(
            monitor='val_accuracy',
            patience=CONFIG['early_stopping_patience'],
            min_delta=CONFIG['early_stopping_min_delta'],
            restore_best_weights=True,
            verbose=1,
            mode='max'
        ),
        TensorBoard(
            log_dir=os.path.join(CONFIG['model_export_path'], 'logs'),
            histogram_freq=1,
            write_graph=True,
            write_images=True
        )
    ]
    history1 = model.fit(
        train_data,
        validation_data=valid_data,
        epochs=CONFIG['epochs'],
        callbacks=callbacks_phase1,
        class_weight=class_weights,
        verbose=1
    )

    # Phase 2: fine-tune deeper layers with lower LR and improved callbacks
    print("\nPhase 2: Fine-tuning deeper layers...")
    unfreeze_from = max(0, len(model.layers) - 40)  # Unfreeze more layers
    for layer in model.layers[unfreeze_from:]:
        if not isinstance(layer, BatchNormalization):
            layer.trainable = True
    
    # Recompile with lower learning rate for fine-tuning
    try:
        from tensorflow.keras.optimizers import AdamW
        fine_tune_optimizer = AdamW(
            learning_rate=CONFIG['learning_rate'] * 0.1,  # Lower LR for fine-tuning
            weight_decay=0.00005,
            amsgrad=True
        )
    except:
        fine_tune_optimizer = Adam(
            learning_rate=CONFIG['learning_rate'] * 0.1,
            amsgrad=True
        )
    
    model.compile(
        optimizer=fine_tune_optimizer,
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=CONFIG['label_smoothing']),
        metrics=['accuracy', Precision(name='precision'), Recall(name='recall')]
    )
    callbacks_phase2 = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model.keras'),
            monitor='val_accuracy',
            save_best_only=True,
            mode='max',
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_accuracy',
            factor=CONFIG['reduce_lr_factor'],
            patience=CONFIG['reduce_lr_patience'],
            min_lr=CONFIG['min_lr'],
            verbose=1,
            mode='max'
        ),
        EarlyStopping(
            monitor='val_accuracy',
            patience=CONFIG['early_stopping_patience'],
            min_delta=CONFIG['early_stopping_min_delta'],
            restore_best_weights=True,
            verbose=1,
            mode='max'
        )
    ]
    history2 = model.fit(
        train_data,
        validation_data=valid_data,
        epochs=CONFIG['epochs'],
        callbacks=callbacks_phase2,
        class_weight=class_weights,
        verbose=1
    )
    
    # Plot training history (final phase)
    plot_training_history(history2)
    
    # Save training metrics
    metrics = save_training_metrics(history2, "MobileNetV2")
    print(f"\nFinal Training Results:")
    print(f"Best Validation Accuracy: {metrics['best_val_accuracy']:.4f}")
    print(f"Final Validation Accuracy: {metrics['final_val_accuracy']:.4f}")
    
    # Convert to TFLite
    print("\nConverting model to TFLite format...")
    convert_to_tflite(model)
    
    return model, history2

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