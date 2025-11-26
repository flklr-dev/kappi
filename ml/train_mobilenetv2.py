import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
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
import itertools
import random

# Standardized preprocessing function for all models ([-1, 1] normalization)
def standardized_preprocess_input(x):
    """
    Standardized preprocessing for all classification models.
    Normalizes pixel values from [0, 255] to [-1, 1] range.
    
    This matches the mobile inference preprocessing in TensorFlowModule.java:
    (pixel / 127.5) - 1.0
    
    Args:
        x: Input image array with pixel values in [0, 255] range
    
    Returns:
        Preprocessed image array with values in [-1, 1] range
    """
    x = x.astype(np.float32)
    x = (x / 127.5) - 1.0
    return x

# Set random seeds for reproducibility
def set_global_seeds(seed=42):
    """Set all random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    print(f"\n🔒 Random seeds set to {seed} for reproducibility")

# Call at module load
set_global_seeds(42)

# GPU configuration removed - training on CPU
print("\n💻 Training on CPU (no GPU detected/configured)")
gpu_available = False

CONFIG = {
    'img_size': (224, 224),  
    'batch_size': 32,  # Standardized batch size for fair comparison
    'epochs': 100,  # Sufficient epochs for 5-class problem
    'learning_rate': 0.0001,  # Lower initial LR for stable training
    'dropout_rate': 0.4,  # Increased dropout for generalization
    'data_dir': os.path.join(os.path.dirname(__file__), 'data', 'processed'),
    'model_export_path': 'model_export',
    'l2_lambda': 0.0001,
    'early_stopping_patience': 8,  # Standard patience
    'early_stopping_min_delta': 0.0001,
    'reduce_lr_patience': 4,  # Reduce LR more responsively
    'reduce_lr_factor': 0.5,
    'min_lr': 1e-7,
    'num_classes': 5,  # 5 disease classes: healthy, leaf_rust, leaf_spot, brown_spot, sooty_mold
    'label_smoothing': 0.0,  # No label smoothing for small dataset
    'warmup_epochs': 0,  # No warmup needed
    'cosine_restarts': False,
    'gpu_enabled': gpu_available,  # Flag for GPU-specific optimizations
    'unfreeze_layers': 30  # Standardized fine-tuning depth
}

print(f"\n📊 Training Configuration:")
print(f"   Batch size: {CONFIG['batch_size']} ({'GPU optimized' if gpu_available else 'CPU optimized'})")
print(f"   Image size: {CONFIG['img_size']}")
print(f"   Max epochs: {CONFIG['epochs']}")

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

class ClassSpecificImageDataGenerator(tf.keras.utils.Sequence):
    """Custom generator that applies different augmentation per class."""
    
    def __init__(self, directory, mild_datagen, strong_datagen, minority_classes, 
                 target_size, batch_size, class_mode='categorical', shuffle=True, seed=42):
        self.directory = directory
        self.mild_datagen = mild_datagen
        self.strong_datagen = strong_datagen
        self.minority_classes = set(minority_classes)
        self.target_size = target_size
        self.batch_size = batch_size
        self.seed = seed
        self.shuffle = shuffle
        
        # Load all image paths and labels
        self.image_paths = []
        self.labels = []
        self.class_indices = {}
        
        class_dirs = sorted([d for d in os.listdir(directory) 
                           if os.path.isdir(os.path.join(directory, d))])
        
        for idx, class_name in enumerate(class_dirs):
            self.class_indices[class_name] = idx
            class_path = os.path.join(directory, class_name)
            
            for img_name in os.listdir(class_path):
                if img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                    self.image_paths.append(os.path.join(class_path, img_name))
                    self.labels.append(idx)
        
        self.n = len(self.image_paths)
        self.num_classes = len(class_dirs)
        self.indexes = np.arange(self.n)
        
        if self.shuffle:
            np.random.seed(self.seed)
            np.random.shuffle(self.indexes)
    
    def __len__(self):
        return int(np.ceil(self.n / self.batch_size))
    
    def __getitem__(self, idx):
        batch_indexes = self.indexes[idx * self.batch_size:(idx + 1) * self.batch_size]
        
        batch_images = []
        batch_labels = []
        
        for i in batch_indexes:
            img_path = self.image_paths[i]
            label = self.labels[i]
            
            # Load image
            from tensorflow.keras.preprocessing import image as keras_image
            img = keras_image.load_img(img_path, target_size=self.target_size)
            img_array = keras_image.img_to_array(img)
            
            # Get class name from path
            class_name = os.path.basename(os.path.dirname(img_path))
            
            # Apply appropriate augmentation
            if class_name in self.minority_classes:
                # Strong augmentation for minority classes
                img_array = self.strong_datagen.random_transform(img_array)
            else:
                # Mild augmentation for majority classes
                img_array = self.mild_datagen.random_transform(img_array)
            
            # CRITICAL: Apply standardized preprocessing for consistency across all models
            # This ensures inference preprocessing matches: (x/127.5) - 1.0 → [-1, 1]
            img_array = standardized_preprocess_input(img_array)
            
            batch_images.append(img_array)
            batch_labels.append(label)
        
        # Convert to arrays
        batch_images = np.array(batch_images)
        batch_labels = tf.keras.utils.to_categorical(batch_labels, self.num_classes)
        
        return batch_images, batch_labels
    
    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.indexes)
    
    @property
    def classes(self):
        return np.array(self.labels)

def create_data_generators():
    """Create train and validation data generators with class-specific augmentation."""
    base_path = os.path.abspath(os.path.dirname(__file__))
    data_path = os.path.join(base_path, 'data', 'processed')
    
    print(f"\nLoading data from: {data_path}")
    
    if not os.path.exists(data_path):
        raise ValueError(f"Data directory not found: {data_path}")
    
    # Print dataset statistics and identify minority classes
    class_counts = {}
    for split in ['train', 'val', 'test']:
        split_path = os.path.join(data_path, split)
        if os.path.exists(split_path):
            print(f"\n{split.upper()} set:")
            for category in os.listdir(split_path):
                category_path = os.path.join(split_path, category)
                if os.path.isdir(category_path):
                    num_images = len([f for f in os.listdir(category_path) 
                                    if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                    print(f"{category}: {num_images} images")
                    if split == 'train':
                        class_counts[category] = num_images
    
    # Identify challenging classes that benefit from strong augmentation
    # Apply strong augmentation to disease classes (excluding healthy) for better generalization
    challenging_classes = ['leaf_rust', 'leaf_spot', 'brown_spot', 'sooty_mold']
    minority_classes = []
    if class_counts:
        # Use challenging classes instead of minority classes
        minority_classes = [cls for cls in challenging_classes if cls in class_counts]
        
        if minority_classes:
            print(f"\n🎯 Targeted augmentation strategy:")
            print(f"   Applying STRONG augmentation to challenging classes: {', '.join(minority_classes)}")
            print(f"   Applying ENHANCED MILD augmentation to remaining classes: {', '.join([c for c in class_counts.keys() if c not in minority_classes])}")
        else:
            print(f"\n✅ Balanced dataset - applying enhanced mild augmentation to all classes")
    
    # MILD augmentation for all classes (enhanced for better generalization)
    # NOTE: Using standardized preprocessing ([-1, 1] range) for all models
    mild_datagen = ImageDataGenerator(
        preprocessing_function=standardized_preprocess_input,  # Standardized: (x/127.5) - 1.0
        rotation_range=15,          # ±15° rotation
        horizontal_flip=True,       # Random horizontal flip
        width_shift_range=0.1,      # ±10% horizontal shift
        height_shift_range=0.1,     # ±10% vertical shift
        zoom_range=0.15,            # 15% zoom in/out (increased)
        brightness_range=[0.6, 1.4], # ±40% brightness (match strong augmentation)
        shear_range=0.10,           # Add shear transformation
        channel_shift_range=30,     # Add channel shift for color variation
        fill_mode='nearest'
    )
    
    # STRONG augmentation for challenging classes
    strong_datagen = ImageDataGenerator(
        preprocessing_function=standardized_preprocess_input,  # Standardized: (x/127.5) - 1.0
        rotation_range=30,          # ±30° rotation (2x stronger)
        horizontal_flip=True,       # Random horizontal flip
        vertical_flip=True,         # Vertical flip (NEW)
        width_shift_range=0.2,      # ±20% horizontal shift (2x stronger)
        height_shift_range=0.2,     # ±20% vertical shift (2x stronger)
        zoom_range=0.2,             # 20% zoom in/out (2x stronger)
        shear_range=0.15,           # Shear transformation
        brightness_range=[0.5, 1.5], # ±50% brightness (even stronger)
        channel_shift_range=50,     # Stronger channel shift
        fill_mode='nearest'
    )
    
    # Validation data generator (no augmentation)
    valid_datagen = ImageDataGenerator(preprocessing_function=standardized_preprocess_input)  # Standardized
    
    # Test data generator (no augmentation)
    test_datagen = ImageDataGenerator(preprocessing_function=standardized_preprocess_input)  # Standardized
    
    # Training data with class-specific augmentation
    if minority_classes:
        print(f"\n🎯 Using targeted class-specific augmentation strategy")
        print(f"   Challenging classes get STRONG aug: {', '.join(minority_classes)}")
        print(f"   Other classes get ENHANCED MILD aug: {', '.join([c for c in class_counts.keys() if c not in minority_classes])}")
        
        # Use custom generator with class-specific augmentation
        train_data = ClassSpecificImageDataGenerator(
            directory=os.path.join(data_path, 'train'),
            mild_datagen=mild_datagen,
            strong_datagen=strong_datagen,
            minority_classes=minority_classes,
            target_size=CONFIG['img_size'],
            batch_size=CONFIG['batch_size'],
            shuffle=True,
            seed=42
        )
    else:
        # Use mild augmentation for all classes
        print(f"\n✅ No class imbalance detected - using mild augmentation for all")
        train_data = mild_datagen.flow_from_directory(
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
    
    # Test data
    test_data = None
    test_path = os.path.join(data_path, 'test')
    if os.path.exists(test_path):
        test_data = test_datagen.flow_from_directory(
            test_path,
            target_size=CONFIG['img_size'],
            batch_size=CONFIG['batch_size'],
            class_mode='categorical',
            shuffle=False
        )
    
    return train_data, valid_data, test_data

def build_model(num_classes):
    """Build MobileNetV2 model with standardized architecture."""
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
    
    # Add custom layers - STANDARDIZED ARCHITECTURE
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    
    # Two-layer classification head (same as ResNet50)
    x = Dense(512, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'])(x)
    x = Dense(256, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'] * 0.5)(x)
    
    # Output layer
    predictions = Dense(num_classes, activation='softmax')(x)
    
    # Create model
    model = Model(inputs=inputs, outputs=predictions)
    
    # Compile model - STANDARDIZED
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate'], amsgrad=True),
        loss='categorical_crossentropy',
        metrics=['accuracy', Precision(name='precision'), Recall(name='recall')]
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
    
    # Save with model-specific name
    os.makedirs(CONFIG['model_export_path'], exist_ok=True)
    plt.savefig(os.path.join(CONFIG['model_export_path'], 'training_history_mobilenetv2.png'))
    plt.close()

def convert_to_tflite(model):
    """Convert Keras model to TFLite format with robust error handling."""
    import shutil
    temp_model_path = os.path.join(CONFIG['model_export_path'], 'temp_saved_model_mobilenet')
    
    try:
        print("\n🔄 Converting MobileNetV2 to TFLite...")
        
        # Clean up any existing temp model
        if os.path.exists(temp_model_path):
            shutil.rmtree(temp_model_path)
        
        # Save model in SavedModel format
        print("   → Saving as SavedModel format...")
        model.save(temp_model_path, save_format='tf')
        
        # Create converter
        print("   → Creating TFLite converter...")
        converter = tf.lite.TFLiteConverter.from_saved_model(temp_model_path)
        
        # Set converter options for compatibility
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS,  # Enable TensorFlow Lite ops
            tf.lite.OpsSet.SELECT_TF_OPS      # Enable TensorFlow ops (fallback)
        ]
        converter._experimental_lower_tensor_list_ops = False
        
        # Apply optimizations
        print("   → Applying optimizations...")
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        
        # Convert model
        print("   → Converting model...")
        tflite_model = converter.convert()
        
        # Save TFLite model
        tflite_path = os.path.join(CONFIG['model_export_path'], 'model_mobilenetv2.tflite')
        with open(tflite_path, 'wb') as f:
            f.write(tflite_model)
        
        print(f"   ✅ TFLite model saved: {tflite_path}")
        print(f"   📏 Size: {len(tflite_model) / 1024 / 1024:.2f} MB")
        
        return True
        
    except Exception as e:
        print(f"   ❌ TFLite conversion failed: {str(e)}")
        print(f"   ℹ️  Model.keras is still saved and can be used")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Always cleanup temp model
        if os.path.exists(temp_model_path):
            try:
                shutil.rmtree(temp_model_path)
                print("   → Cleaned up temporary files")
            except Exception as e:
                print(f"   ⚠️  Could not clean up temp files: {e}")

def evaluate_model(model, test_data):
    """Evaluate model on test set with comprehensive metrics."""
    if test_data is None:
        print("No test data available for evaluation")
        return None
        
    print("\nEvaluating model on test set...")
    
    # Get predictions
    predictions = model.predict(test_data)
    predicted_classes = np.argmax(predictions, axis=1)
    
    # Get true classes
    true_classes = test_data.classes
    class_labels = list(test_data.class_indices.keys())
    
    # Calculate metrics
    from sklearn.metrics import classification_report, confusion_matrix
    
    # Per-class metrics
    report = classification_report(
        true_classes, 
        predicted_classes, 
        target_names=class_labels, 
        output_dict=True
    )
    
    # Confusion matrix
    cm = confusion_matrix(true_classes, predicted_classes)
    
    # Print detailed metrics
    print("\nPer-Class Metrics:")
    print("-" * 50)
    for class_name in class_labels:
        metrics = report.get(class_name, {})
        print(f"{class_name}:")
        print(f"  Precision: {metrics.get('precision', 0):.4f}")
        print(f"  Recall:    {metrics.get('recall', 0):.4f}")
        print(f"  F1-Score:  {metrics.get('f1-score', 0):.4f}")
        print()
    
    accuracy = report.get('accuracy', 0)
    macro_avg = report.get('macro avg', {})
    weighted_avg = report.get('weighted avg', {})
    print(f"Overall Accuracy: {accuracy:.4f}")
    print(f"Macro Average F1-Score: {macro_avg.get('f1-score', 0):.4f}")
    print(f"Weighted Average F1-Score: {weighted_avg.get('f1-score', 0):.4f}")
    
    # Save metrics
    metrics_data = {
        'per_class': report,
        'confusion_matrix': cm.tolist(),
        'class_labels': class_labels
    }
    
    os.makedirs(CONFIG['model_export_path'], exist_ok=True)
    with open(os.path.join(CONFIG['model_export_path'], 'test_metrics_mobilenetv2.json'), 'w') as f:
        json.dump(metrics_data, f, indent=2)
    
    # Plot confusion matrix
    plt.figure(figsize=(8, 6))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix - MobileNetV2')
    plt.colorbar()
    tick_marks = np.arange(len(class_labels))
    plt.xticks(tick_marks, class_labels, rotation=45)
    plt.yticks(tick_marks, class_labels)
    
    # Add text annotations
    thresh = cm.max() / 2.
    for i, j in itertools.product(range(cm.shape[0]), range(cm.shape[1])):
        plt.text(j, i, format(cm[i, j], 'd'),
                horizontalalignment="center",
                color="white" if cm[i, j] > thresh else "black")
    
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(os.path.join(CONFIG['model_export_path'], 'confusion_matrix_mobilenetv2.png'))
    plt.close()
    
    return metrics_data

def train_model():
    """Train the model with optimized settings for CPU."""
    # Create data generators
    train_data, valid_data, test_data = create_data_generators()
    
    # Calculate class weights to handle potential imbalance
    class_weights = calculate_class_weights(train_data)
    print("\nClass weights:", class_weights)
    
    # Build model
    model = build_model(len(train_data.class_indices))
    
    # Phase 1: train classification head
    print("\nPhase 1: Training classification head...")
    
    callbacks_phase1 = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model_phase1.keras'),
            monitor='val_loss',
            save_best_only=True,
            mode='min',
            verbose=1,
            save_weights_only=False
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=CONFIG['reduce_lr_factor'],
            patience=CONFIG['reduce_lr_patience'],
            min_lr=CONFIG['min_lr'],
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
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
    history1 = model.fit(
        train_data,
        validation_data=valid_data,
        epochs=CONFIG['epochs'],
        callbacks=callbacks_phase1,
        class_weight=class_weights,
        verbose=1
    )
    
    # Phase 2: fine-tune deeper layers with lower LR
    print("\nPhase 2: Fine-tuning deeper layers...")
    unfreeze_from = max(0, len(model.layers) - CONFIG['unfreeze_layers'])  # Standardized unfreezing
    
    # Unfreeze layers for fine-tuning
    for layer in model.layers[unfreeze_from:]:
        if not isinstance(layer, BatchNormalization):
            layer.trainable = True
    
    # Recompile with lower learning rate for fine-tuning
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate'] * 0.1, amsgrad=True),
        loss='categorical_crossentropy',
        metrics=['accuracy', Precision(name='precision'), Recall(name='recall')]
    )
    
    # Continue training with unfrozen layers
    callbacks_phase2 = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model_phase2.keras'),
            monitor='val_loss',
            save_best_only=True,
            mode='min',
            verbose=1,
            save_weights_only=False
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=CONFIG['reduce_lr_factor'],
            patience=CONFIG['reduce_lr_patience'],
            min_lr=CONFIG['min_lr'],
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=CONFIG['early_stopping_patience'],
            min_delta=CONFIG['early_stopping_min_delta'],
            restore_best_weights=True,
            verbose=1
        )
    ]
    
    # Train for additional epochs or until early stopping
    history2 = model.fit(
        train_data,
        validation_data=valid_data,
        epochs=50,  # Additional 50 epochs for fine-tuning
        callbacks=callbacks_phase2,
        class_weight=class_weights,
        verbose=1
    )
    
    # Create a mock history object for combined plotting
    class CombinedHistory:
        def __init__(self, hist1, hist2):
            self.history = {}
            for key in hist1.history.keys():
                self.history[key] = hist1.history[key] + hist2.history[key]
    
    combined_history = CombinedHistory(history1, history2)
    
    # Plot training history
    plot_training_history(combined_history)
    
    # Save training metrics
    save_training_metrics(combined_history, "MobileNetV2")
    
    # Evaluate on test set if available
    if test_data is not None:
        test_metrics = evaluate_model(model, test_data)
        print("\nTest Set Evaluation Complete")
        if test_metrics:
            print(f"Test Accuracy: {test_metrics['per_class']['accuracy']:.4f}")
    
    # Convert to TFLite
    convert_to_tflite(model)
    
    # Save final model
    model.save(os.path.join(CONFIG['model_export_path'], 'final_model.keras'))
    
    return model, combined_history  # Return both model and history

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