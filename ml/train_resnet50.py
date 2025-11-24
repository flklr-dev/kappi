import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.resnet import ResNet50, preprocess_input
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization, Input
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.metrics import Precision, Recall
from tensorflow.keras.regularizers import l2
import matplotlib.pyplot as plt
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint, TensorBoard
import json
import itertools
import random
from sklearn.metrics import classification_report, confusion_matrix

# Set random seeds for reproducibility
def set_global_seeds(seed=42):
    """Set all random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    print(f"\n🔒 Random seeds set to {seed} for reproducibility")

set_global_seeds(42)

# GPU configuration removed - training on CPU
print("\n💻 Training on CPU (no GPU detected/configured)")

CONFIG = {
    'img_size': (224, 224),
    'batch_size': 32,  # Optimized for small dataset with 5 classes
    'epochs': 100,
    'learning_rate': 0.0001,  # Lower LR for stable training
    'dropout_rate': 0.4,  # Increased dropout for generalization
    'data_dir': os.path.join(os.path.dirname(__file__), 'data', 'processed'),
    'model_export_path': 'model_export',
    'l2_lambda': 0.0001,
    'early_stopping_patience': 8,
    'early_stopping_min_delta': 0.0001,
    'reduce_lr_patience': 4,
    'reduce_lr_factor': 0.5,
    'min_lr': 1e-7,
    'num_classes': 5,  # 5 disease classes
    'label_smoothing': 0.0,  # No label smoothing for small dataset
    'gpu_enabled': True
}

def calculate_class_weights(generator):
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
                img_array = self.strong_datagen.random_transform(img_array)
            else:
                img_array = self.mild_datagen.random_transform(img_array)
            
            # CRITICAL FIX: Apply preprocessing consistently using preprocess_input
            # Don't use datagen.standardize() - it may use wrong normalization
            img_array = preprocess_input(img_array)
            
            batch_images.append(img_array)
            batch_labels.append(label)
        
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

    # Identify minority classes
    # NOTE: sooty_mold now has 500 images, no longer needs strong augmentation
    minority_classes = []
    if class_counts:
        max_count = max(class_counts.values())
        for class_name, count in class_counts.items():
            # Exclude sooty_mold from minority class treatment (now has 500 images)
            if count < max_count * 0.5 and class_name != 'sooty_mold':
                minority_classes.append(class_name)
        
        if minority_classes:
            print(f"\n⚠️  Minority classes detected: {', '.join(minority_classes)}")
            print(f"   STRONG aug: {', '.join(minority_classes)}")
            print(f"   MILD aug: {', '.join([c for c in class_counts.keys() if c not in minority_classes])}")
        else:
            print(f"\n✅ All classes balanced - applying MILD augmentation to all classes")

    # MILD augmentation for majority classes
    mild_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=15,
        horizontal_flip=True,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.1,
        brightness_range=[0.8, 1.2],
        fill_mode='nearest'
    )

    # STRONG augmentation for minority classes
    strong_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=30,
        horizontal_flip=True,
        vertical_flip=True,
        width_shift_range=0.2,
        height_shift_range=0.2,
        zoom_range=0.2,
        shear_range=0.15,
        brightness_range=[0.6, 1.4],
        fill_mode='nearest'
    )

    valid_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
    test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)

    # Training data with class-specific augmentation
    if minority_classes:
        print(f"\n🎯 Using class-specific augmentation")
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
        print(f"\n✅ No imbalance - mild aug for all")
        train_data = mild_datagen.flow_from_directory(
            os.path.join(data_path, 'train'),
            target_size=CONFIG['img_size'],
            batch_size=CONFIG['batch_size'],
            class_mode='categorical',
            shuffle=True,
            seed=42
        )

    valid_data = valid_datagen.flow_from_directory(
        os.path.join(data_path, 'val'),
        target_size=CONFIG['img_size'],
        batch_size=CONFIG['batch_size'],
        class_mode='categorical',
        shuffle=False
    )

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
    inputs = Input(shape=(*CONFIG['img_size'], 3))
    base_model = ResNet50(
        weights='imagenet',
        include_top=False,
        input_tensor=inputs
    )

    for layer in base_model.layers[:-20]:  # Unfreeze last 20 layers for better adaptation
        layer.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'])(x)
    x = Dense(256, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'] * 0.5)(x)
    predictions = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=inputs, outputs=predictions)

    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate'], amsgrad=True),
        loss='categorical_crossentropy',
        metrics=['accuracy', Precision(name='precision'), Recall(name='recall')]
    )
    return model

def save_training_metrics(history, model_name="ResNet50"):
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

def plot_training_history(history):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(history.history['accuracy'], label='Training')
    ax1.plot(history.history['val_accuracy'], label='Validation')
    ax1.set_title('Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    ax2.plot(history.history['loss'], label='Training')
    ax2.plot(history.history['val_loss'], label='Validation')
    ax2.set_title('Model Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    plt.tight_layout()
    os.makedirs(CONFIG['model_export_path'], exist_ok=True)
    plt.savefig(os.path.join(CONFIG['model_export_path'], 'training_history_resnet50.png'))
    plt.close()

def convert_to_tflite(model):
    """Convert Keras model to TFLite format with robust error handling - ResNet50 optimized."""
    import shutil
    temp_model_path = os.path.join(CONFIG['model_export_path'], 'temp_saved_model_resnet50')
    
    try:
        print("\n🔄 Converting ResNet50 to TFLite...")
        print("   ℹ️  ResNet50 is complex - conversion may take longer")
        
        # Clean up any existing temp model
        if os.path.exists(temp_model_path):
            shutil.rmtree(temp_model_path)
        
        # Save model in SavedModel format
        print("   → Saving as SavedModel format...")
        model.save(temp_model_path, save_format='tf')
        
        # Create converter
        print("   → Creating TFLite converter...")
        converter = tf.lite.TFLiteConverter.from_saved_model(temp_model_path)
        
        # CRITICAL for ResNet50: Enable SELECT_TF_OPS for complex operations
        print("   → Configuring converter for ResNet50 compatibility...")
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS,  # Enable TensorFlow Lite ops
            tf.lite.OpsSet.SELECT_TF_OPS      # Enable TensorFlow ops (REQUIRED for ResNet50)
        ]
        
        # Additional ResNet50-specific settings
        converter._experimental_lower_tensor_list_ops = False
        converter.allow_custom_ops = True  # Allow custom operations if needed
        
        # Apply optimizations (may increase conversion time)
        print("   → Applying optimizations...")
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        
        # Convert model
        print("   → Converting model (this may take 1-2 minutes)...")
        tflite_model = converter.convert()
        
        # Save TFLite model
        tflite_path = os.path.join(CONFIG['model_export_path'], 'model_resnet50.tflite')
        with open(tflite_path, 'wb') as f:
            f.write(tflite_model)
        
        print(f"   ✅ TFLite model saved: {tflite_path}")
        print(f"   📏 Size: {len(tflite_model) / 1024 / 1024:.2f} MB")
        print(f"   ⚠️  Note: This model uses SELECT_TF_OPS - ensure your deployment supports it")
        
        return True
        
    except Exception as e:
        print(f"   ❌ TFLite conversion failed: {str(e)}")
        print(f"   ℹ️  This is common with ResNet50 due to complex operations")
        print(f"   ℹ️  Model.keras is still saved and can be used for deployment")
        print(f"   💡 Alternative: Use model.keras directly or try ONNX format")
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
    with open(os.path.join(CONFIG['model_export_path'], 'test_metrics_resnet50.json'), 'w') as f:
        json.dump(metrics_data, f, indent=2)
    
    # Plot confusion matrix
    plt.figure(figsize=(8, 6))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix - ResNet50')
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
    plt.savefig(os.path.join(CONFIG['model_export_path'], 'confusion_matrix_resnet50.png'))
    plt.close()
    
    return metrics_data

def train_model():
    train_data, valid_data, test_data = create_data_generators()
    class_weights = calculate_class_weights(train_data)
    print("\nClass weights:", class_weights)

    model = build_model(len(train_data.class_indices))

    print("\nPhase 1: Training classification head...")
    callbacks_phase1 = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model_resnet50_phase1.keras'),
            monitor='val_loss', save_best_only=True, mode='min', verbose=1
        ),
        ReduceLROnPlateau(monitor='val_loss', factor=CONFIG['reduce_lr_factor'],
                          patience=CONFIG['reduce_lr_patience'], min_lr=CONFIG['min_lr'], 
                          verbose=1),
        EarlyStopping(monitor='val_loss', patience=CONFIG['early_stopping_patience'],
                      min_delta=CONFIG['early_stopping_min_delta'], restore_best_weights=True, 
                      verbose=1),
        TensorBoard(log_dir=os.path.join(CONFIG['model_export_path'], 'logs_resnet50'), histogram_freq=1)
    ]
    history1 = model.fit(train_data, validation_data=valid_data, epochs=CONFIG['epochs'],
                         callbacks=callbacks_phase1, class_weight=class_weights, verbose=1)

    print("\nPhase 2: Fine-tuning deeper layers...")
    unfreeze_from = max(0, len(model.layers) - 40)
    for layer in model.layers[unfreeze_from:]:
        if not isinstance(layer, BatchNormalization):
            layer.trainable = True
    model.compile(optimizer=Adam(learning_rate=CONFIG['learning_rate'] * 0.1, amsgrad=True),
                  loss='categorical_crossentropy',
                  metrics=['accuracy', Precision(name='precision'), Recall(name='recall')])
    callbacks_phase2 = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model_resnet50.keras'),
            monitor='val_loss', save_best_only=True, mode='min', verbose=1
        ),
        ReduceLROnPlateau(monitor='val_loss', factor=CONFIG['reduce_lr_factor'],
                          patience=CONFIG['reduce_lr_patience'], min_lr=CONFIG['min_lr'], 
                          verbose=1),
        EarlyStopping(monitor='val_loss', patience=CONFIG['early_stopping_patience'],
                      min_delta=CONFIG['early_stopping_min_delta'], restore_best_weights=True, 
                      verbose=1)
    ]
    history2 = model.fit(train_data, validation_data=valid_data, epochs=50,
                         callbacks=callbacks_phase2, class_weight=class_weights, verbose=1)

    # Create combined history
    class CombinedHistory:
        def __init__(self, hist1, hist2):
            self.history = {}
            for key in hist1.history.keys():
                self.history[key] = hist1.history[key] + hist2.history[key]
    
    combined_history = CombinedHistory(history1, history2)
    
    plot_training_history(combined_history)
    save_training_metrics(combined_history, "ResNet50")
    
    # Evaluate on test set if available
    if test_data is not None:
        test_metrics = evaluate_model(model, test_data)
        print("\nTest Set Evaluation Complete")
        if test_metrics:
            print(f"Test Accuracy: {test_metrics['per_class']['accuracy']:.4f}")
    
    print("\nConverting model to TFLite format...")
    convert_to_tflite(model)
    
    # Save final model
    model.save(os.path.join(CONFIG['model_export_path'], 'final_model_resnet50.keras'))
    
    return model, history2

def main():
    print("\nStarting model training (ResNet50)...")
    try:
        model, history = train_model()
        print("\nTraining completed successfully!")
    except Exception as e:
        print(f"\nError during training: {e}")
        raise

if __name__ == "__main__":
    main()


