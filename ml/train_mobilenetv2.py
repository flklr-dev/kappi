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

# Add after imports
from pathlib import Path

# ADD FOCAL LOSS for hard samples (brown_spot vs leaf_rust)
def focal_loss(gamma=2.0, alpha=0.25):
    """
    Focal loss to focus on hard-to-classify samples.
    Helps with brown_spot vs leaf_rust confusion.
    """
    def focal_loss_fixed(y_true, y_pred):
        epsilon = tf.keras.backend.epsilon()
        y_pred = tf.clip_by_value(y_pred, epsilon, 1.0 - epsilon)
        
        # Calculate cross entropy
        ce = -y_true * tf.math.log(y_pred)
        
        # Calculate focal term: (1 - p_t)^gamma
        p_t = tf.reduce_sum(y_true * y_pred, axis=-1, keepdims=True)
        focal_term = tf.pow(1.0 - p_t, gamma)
        
        # Focal loss
        loss = alpha * focal_term * ce
        
        return tf.reduce_mean(tf.reduce_sum(loss, axis=-1))
    
    return focal_loss_fixed

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
    'batch_size': 32 if gpu_available else 16,  # Adaptive batch size (reduced for 5 classes)
    'epochs': 100,  # Sufficient epochs for 5-class problem
    'learning_rate': 0.00015,  # Slightly higher for better discrimination
    'dropout_rate': 0.35,  # Reduced slightly for better feature learning
    'data_dir': os.path.join(os.path.dirname(__file__), 'data', 'augmented_backgrounds'),  # ✅ NEW DATA
    'model_export_path': os.path.join('model_export', 'mobilenetv2-v2'),  # Versioned output directory
    'l2_lambda': 0.0001,
    'early_stopping_patience': 12,  # More patience
    'early_stopping_min_delta': 0.0001,
    'reduce_lr_patience': 6,  # Increased patience
    'reduce_lr_factor': 0.5,
    'min_lr': 1e-7,
    'num_classes': 5,  # 5 disease classes: healthy, leaf_rust, leaf_spot, brown_spot, sooty_mold
    'label_smoothing': 0.05,  # Add mild label smoothing
    'warmup_epochs': 5,  # Short warmup to stabilize early training
    'cosine_restarts': False,
    'gpu_enabled': gpu_available  # Flag for GPU-specific optimizations
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
    """Enhanced class weights with manual boost for problematic classes."""
    total_counts = generator.classes.shape[0]
    class_counts = np.bincount(generator.classes)
    
    # Base weights
    class_weights = {i: total_counts / (len(class_counts) * count) 
                    for i, count in enumerate(class_counts)}
    
    # Manually boost brown_spot weight due to low recall
    class_indices = generator.class_indices if hasattr(generator, 'class_indices') else {}
    if isinstance(class_indices, dict) and 'brown_spot' in class_indices:
        bs_idx = class_indices['brown_spot']
        class_weights[bs_idx] = class_weights.get(bs_idx, 1.0) * 1.5
        print(f"\n🎯 Boosted brown_spot class weight: {class_weights[bs_idx]:.4f}")
    
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

def create_negative_data_generator():
    """Create generator for negative (non-coffee-leaf) samples."""
    negative_path = Path('data/negative_samples')
    
    if not negative_path.exists():
        print("⚠️  No negative samples found. Training without outlier exposure.")
        return None
    
    print(f"\n📂 Loading negative samples from: {negative_path}")
    
    # Use same preprocessing as positive data
    negative_datagen = ImageDataGenerator(
        preprocessing_function=standardized_preprocess_input,
        rotation_range=15,
        horizontal_flip=True,
        zoom_range=0.1
    )
    
    # Try to load negative samples
    try:
        negative_data = negative_datagen.flow_from_directory(
            str(negative_path),
            target_size=CONFIG['img_size'],
            batch_size=CONFIG['batch_size'],
            class_mode='categorical',
            shuffle=True,
            seed=42
        )
        
        print(f"✅ Loaded {negative_data.n} negative samples")
        return negative_data
        
    except Exception as e:
        print(f"⚠️  Could not load negative samples: {e}")
        return None

class OutlierExposureGenerator(tf.keras.utils.Sequence):
    """
    Mixed generator that combines coffee leaves (positive) and random objects (negative).
    
    Research-backed approach from Hendrycks et al. (2019) "Deep Anomaly Detection with Outlier Exposure"
    """
    
    def __init__(self, positive_gen, negative_gen, negative_ratio=0.3):
        """
        Args:
            positive_gen: Generator for coffee leaf images
            negative_gen: Generator for negative samples (laptops, people, etc.)
            negative_ratio: Proportion of negative samples per batch (0.2-0.4 recommended)
        """
        self.positive_gen = positive_gen
        self.negative_gen = negative_gen
        self.negative_ratio = negative_ratio
        self.num_classes = positive_gen.num_classes if hasattr(positive_gen, 'num_classes') else CONFIG['num_classes']
        
        print(f"\n🎯 Outlier Exposure enabled:")
        print(f"   Positive samples per batch: {int(CONFIG['batch_size'] * (1 - negative_ratio))}")
        print(f"   Negative samples per batch: {int(CONFIG['batch_size'] * negative_ratio)}")
    
    @property
    def classes(self):
        """Return classes from the positive generator for class weight calculation."""
        return self.positive_gen.classes
    
    @property
    def class_indices(self):
        """Return class indices from the positive generator."""
        return self.positive_gen.class_indices
    
    def __len__(self):
        return len(self.positive_gen)
    
    def __getitem__(self, idx):
        # Get positive batch (coffee leaves)
        pos_x, pos_y = self.positive_gen[idx]
        
        # Determine how many negatives to include
        num_negatives = int(len(pos_x) * self.negative_ratio)
        num_positives = len(pos_x) - num_negatives
        
        if num_negatives > 0 and self.negative_gen is not None:
            # Get negative batch
            neg_idx = idx % len(self.negative_gen)
            neg_x, _ = self.negative_gen[neg_idx]
            
            # Take only what we need
            neg_x = neg_x[:num_negatives]
            
            # Create uniform distribution labels for negatives
            # (model should be uncertain about these)
            neg_y = np.ones((num_negatives, self.num_classes)) / self.num_classes
            
            # Combine positives and negatives
            batch_x = np.concatenate([pos_x[:num_positives], neg_x], axis=0)
            batch_y = np.concatenate([pos_y[:num_positives], neg_y], axis=0)
            
            # Shuffle within batch
            indices = np.random.permutation(len(batch_x))
            batch_x = batch_x[indices]
            batch_y = batch_y[indices]
        else:
            batch_x = pos_x
            batch_y = pos_y
        
        return batch_x, batch_y
    
    def on_epoch_end(self):
        """Shuffle both generators"""
        self.positive_gen.on_epoch_end()
        if self.negative_gen is not None:
            self.negative_gen.on_epoch_end()

def create_data_generators():
    """Create train/val generators with optional outlier exposure."""
    base_path = os.path.abspath(os.path.dirname(__file__))
    data_path = os.path.join(base_path, 'data', 'augmented_backgrounds')
    
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
    
    # Identify minority classes (those with <50% of max class count)
    # NOTE: sooty_mold now has 500 images, no longer needs strong augmentation
    minority_classes = []
    if class_counts:
        max_count = max(class_counts.values())
        for class_name, count in class_counts.items():
            # Exclude sooty_mold from minority class treatment (now has 500 images)
            if count < max_count * 0.5 and class_name != 'sooty_mold':
                minority_classes.append(class_name)
        
        # Force brown_spot into strong augmentation
        if 'brown_spot' not in minority_classes:
            minority_classes.append('brown_spot')
            print("🎯 FORCING brown_spot strong augmentation due to confusion with leaf_rust")
        
        if minority_classes:
            print(f"\n⚠️  Minority classes detected: {', '.join(minority_classes)}")
            print(f"   Applying STRONG augmentation to: {', '.join(minority_classes)}")
            print(f"   Applying MILD augmentation to: {', '.join([c for c in class_counts.keys() if c not in minority_classes])}")
        else:
            print(f"\n✅ All classes balanced - applying MILD augmentation to all classes")
    
    # MILD augmentation for majority classes (350 images)
    # NOTE: Using standardized preprocessing ([-1, 1] range) for all models
    mild_datagen = ImageDataGenerator(
        preprocessing_function=standardized_preprocess_input,  # Standardized: (x/127.5) - 1.0
        rotation_range=20,          # ±20° rotation (increased for more variation)
        horizontal_flip=True,       # Random horizontal flip
        width_shift_range=0.15,     # ±15% horizontal shift (increased)
        height_shift_range=0.15,    # ±15% vertical shift (increased)
        zoom_range=[0.8, 1.2],      # Zoom 80%-120% (allows zoom OUT to add border context)
        brightness_range=[0.7, 1.3], # ±30% brightness (more variation)
        fill_mode='reflect'         # Reflect pixels at borders instead of white
    )
    
    # STRONG augmentation for minority classes (sooty_mold: 140 images)
    strong_datagen = ImageDataGenerator(
        preprocessing_function=standardized_preprocess_input,  # Standardized: (x/127.5) - 1.0
        rotation_range=35,          # ±35° rotation (stronger)
        horizontal_flip=True,       # Random horizontal flip
        vertical_flip=True,         # Vertical flip
        width_shift_range=0.25,     # ±25% horizontal shift (stronger)
        height_shift_range=0.25,    # ±25% vertical shift (stronger)
        zoom_range=[0.7, 1.3],      # Zoom 70%-130% (allows zoom OUT)
        shear_range=0.20,           # Stronger shear transformation
        brightness_range=[0.5, 1.5], # ±50% brightness (stronger)
        channel_shift_range=25.0,   # ✅ INCREASED: Better color discrimination
        fill_mode='reflect'         # Reflect pixels at borders
    )
    
    # Validation data generator (no augmentation)
    valid_datagen = ImageDataGenerator(preprocessing_function=standardized_preprocess_input)  # Standardized
    
    # Test data generator (no augmentation)
    test_datagen = ImageDataGenerator(preprocessing_function=standardized_preprocess_input)  # Standardized
    
    # Training data with class-specific augmentation
    if minority_classes:
        print(f"\n🎯 Using TRUE class-specific augmentation strategy")
        print(f"   Minority classes get STRONG aug: {', '.join(minority_classes)}")
        print(f"   Majority classes get MILD aug: {', '.join([c for c in class_counts.keys() if c not in minority_classes])}")
        
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
    
    # Load negative samples
    negative_data = create_negative_data_generator()
    
    # Wrap training generator with outlier exposure if available
    if negative_data is not None:
        print("\n✅ Enabling Outlier Exposure (OE) training")
        print("   This will help reject non-coffee-leaf inputs")
        
        train_data = OutlierExposureGenerator(
            positive_gen=train_data,
            negative_gen=negative_data,
            negative_ratio=0.25  # ✅ INCREASED to 25% negatives for better outlier rejection
        )
    else:
        print("\n⚠️  Training without Outlier Exposure")
        print("   Model may be overconfident on random inputs")
    
    return train_data, valid_data, test_data

def build_model(num_classes):
    """Build MobileNetV2 model with standardized architecture."""
    # Input layer
    inputs = Input(shape=(*CONFIG['img_size'], 3))
    
    # Load pre-trained MobileNetV2
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_tensor=inputs,
        alpha=1.4
    )
    
    # Freeze most of the base model initially
    for layer in base_model.layers[:-30]:  # Unfreeze last 30 layers for better adaptation
        layer.trainable = False
    
    # Add custom layers - STANDARDIZED ARCHITECTURE
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    
    # Two-layer classification head (same as ResNet50)
    x = Dense(768, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'])(x)
    x = Dense(384, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(0.25)(x)
    
    # Output layer
    predictions = Dense(num_classes, activation='softmax')(x)
    
    # Create model
    model = Model(inputs=inputs, outputs=predictions)
    
    # ✅ CRITICAL: Use Focal Loss instead of regular categorical crossentropy
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate'], amsgrad=True),
        loss=focal_loss(gamma=2.0, alpha=0.25),  # ✅ NEW: Focuses on hard samples
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
        
        # Save model in SavedModel format (Keras 3 compatible)
        print("   → Saving as SavedModel format...")
        tf.saved_model.save(model, temp_model_path)
        
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
        ),
        LearningRateScheduler(cosine_annealing_schedule)
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
    unfreeze_from = max(0, len(model.layers) - 30)  # Unfreeze last 30 layers
    
    # Unfreeze layers for fine-tuning
    for layer in model.layers[unfreeze_from:]:
        if not isinstance(layer, BatchNormalization):
            layer.trainable = True
    
    # Recompile with lower learning rate for fine-tuning
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate'] * 0.1, amsgrad=True),
        loss=focal_loss(gamma=2.0, alpha=0.25),  # ✅ NEW: Focuses on hard samples
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
        ),
        LearningRateScheduler(cosine_annealing_schedule)
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