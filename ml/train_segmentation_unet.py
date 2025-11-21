"""
U-Net Segmentation Model for Coffee Leaf Disease Severity Detection
Predicts pixel-wise masks for leaf and lesion areas
Outputs: Severity percentage = (lesion_pixels / leaf_pixels) * 100
"""

import os
import random
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import cv2
from pathlib import Path
import json
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt

# ============================================================================
# REPRODUCIBILITY
# ============================================================================

def set_global_seeds(seed=42):
    """Set all random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    print(f"\n🔒 Random seeds set to {seed} for reproducibility")

set_global_seeds(42)

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    'image_size': (224, 224),
    'batch_size': 8,  # Small for segmentation (memory intensive)
    'epochs': 100,
    'learning_rate': 1e-4,
    'backbone': 'mobilenetv2',  # 'mobilenetv2', 'efficientnetb0', or 'resnet50'
    'freeze_backbone': True,  # Freeze encoder during initial training
    'num_classes': 3,  # background, leaf, lesion
    'leaf_rgb': (36, 179, 83),
    'lesion_rgb': (226, 40, 25),
    'color_tolerance': 10,  # Tolerance for RGB matching (handles compression artifacts)
    'min_lesion_area_pct': 0.05,  # Remove lesions < 0.05% of leaf area (noise)
    'morphology_kernel_size': 3,
    'severity_thresholds': {
        'early': 10.0,      # <10% diseased area
        'progressive': 30.0  # 10-30% diseased area, >30% = severe
    },
    'model_export_path': 'model_export',
    'data_dir': Path('data/processed'),
    'masks_dir': Path('annotations/masks'),
    'manifest_path': Path('metadata/annotation_subset_manifest.json'),
}

print("\n" + "="*70)
print("U-NET SEGMENTATION MODEL TRAINING")
print("="*70)
print(f"Backbone: {CONFIG['backbone'].upper()} (pretrained on ImageNet)")
print(f"Image Size: {CONFIG['image_size']}")
print(f"Batch Size: {CONFIG['batch_size']}")
print(f"Classes: background, leaf, lesion")
print(f"Freeze Backbone: {CONFIG['freeze_backbone']}")
print("="*70)

# ============================================================================
# DATA LOADING
# ============================================================================

def load_dataset_with_masks(data_dir, masks_dir, manifest_path=None):
    """
    Load training images and their corresponding segmentation masks.
    Uses manifest for robust matching if available.
    
    Returns:
        images: List of image paths
        masks: List of mask paths  
        classes: List of disease classes
        splits: List of split names (train/val/test)
    """
    data_dir = Path(data_dir)
    masks_dir = Path(masks_dir)
    
    images = []
    masks = []
    classes = []
    splits = []
    
    # Try to load manifest first (most robust)
    if manifest_path and Path(manifest_path).exists():
        print(f"\n📂 Loading from manifest: {manifest_path}")
        
        # Load JSON
        with open(manifest_path, 'r') as f:
            manifest_data = json.load(f)
        
        # Handle different manifest formats
        if isinstance(manifest_data, dict) and 'images' in manifest_data:
            # New format: {"images": [{...}, {...}]}
            manifest = manifest_data['images']
        elif isinstance(manifest_data, list):
            # Old format: [{...}, {...}]
            manifest = manifest_data
        else:
            print("⚠️  Unknown manifest format, falling back to stem matching")
            manifest = []
        
        # Process manifest entries
        for entry in manifest:
            img_path = Path(entry['original_path'])
            
            # Get mask filename from annotation_path or filename
            if 'annotation_path' in entry:
                # Extract just the filename from path like "brown_spot\annotated_train\brown_spot_annotated_train_001.jpg"
                mask_filename = Path(entry['annotation_path']).name
                # Change .jpg to .png for mask
                mask_filename = mask_filename.replace('.jpg', '.png')
            elif 'filename' in entry:
                mask_filename = entry['filename'].replace('.jpg', '.png')
            else:
                continue
            
            mask_path = masks_dir / mask_filename
            
            if img_path.exists() and mask_path.exists():
                images.append(str(img_path))
                masks.append(str(mask_path))
                classes.append(entry['class'])
                # Extract split from annotated_split (e.g., "annotated_train" -> "train")
                split = entry.get('annotated_split', 'train').replace('annotated_', '')
                splits.append(split)
            elif not img_path.exists():
                print(f"⚠️  Image not found: {img_path}")
            elif not mask_path.exists():
                print(f"⚠️  Mask not found: {mask_path}")
    else:
        # Fallback: Match by stem (filename without extension)
        print(f"\n📂 Manifest not found, using stem matching...")
        mask_files = list(masks_dir.glob("*.png"))
        print(f"   Found {len(mask_files)} mask files")
        
        for mask_path in mask_files:
            mask_stem = mask_path.stem
            
            # Extract class from filename (e.g., brown_spot_annotated_train_001 -> brown_spot)
            parts = mask_stem.split('_')
            
            # Try to extract class name (first few parts before 'annotated')
            class_name = None
            for i in range(len(parts)):
                if parts[i] == 'annotated':
                    class_name = '_'.join(parts[:i])
                    break
            
            if not class_name:
                # Fallback: assume first 1-2 parts are class
                class_name = parts[0] if len(parts) == 1 else f"{parts[0]}_{parts[1]}"
            
            # Search for matching image in class directory
            class_dir = data_dir / class_name
            if not class_dir.exists():
                continue
            
            # Search in all split subdirectories
            for split_dir in ['train', 'val', 'test']:
                split_path = class_dir / split_dir
                if not split_path.exists():
                    continue
                
                # Look for images with similar stem
                for img_path in split_path.glob("*.jpg"):
                    # Match if class name is in both filenames
                    if class_name in img_path.stem.lower():
                        images.append(str(img_path))
                        masks.append(str(mask_path))
                        classes.append(class_name)
                        splits.append(split_dir)
                        break
                
                if len(masks) > len(images) - 1:
                    break
    
    print(f"✅ Matched {len(images)} image-mask pairs")
    
    # Print class and split distribution
    from collections import Counter
    class_counts = Counter(classes)
    split_counts = Counter(splits)
    
    print(f"\n📊 Class Distribution:")
    for cls, count in sorted(class_counts.items()):
        print(f"   {cls}: {count}")
    
    print(f"\n📊 Split Distribution:")
    for split, count in sorted(split_counts.items()):
        print(f"   {split}: {count}")
    
    return images, masks, classes, splits

def rgb_mask_to_categorical(mask_path, leaf_rgb, lesion_rgb, target_size, color_tolerance=10, 
                           min_lesion_pct=0.05, morph_kernel_size=3):
    """
    Convert RGB mask to categorical mask with noise cleanup.
    0 = background, 1 = leaf, 2 = lesion
    
    Args:
        color_tolerance: Tolerance for RGB matching (handles compression)
        min_lesion_pct: Remove lesions < this % of leaf area (noise removal)
        morph_kernel_size: Kernel size for morphological operations
    """
    mask = cv2.imread(str(mask_path))
    mask = cv2.cvtColor(mask, cv2.COLOR_BGR2RGB)
    mask = cv2.resize(mask, target_size, interpolation=cv2.INTER_NEAREST)
    
    categorical_mask = np.zeros(target_size, dtype=np.uint8)
    
    # Leaf pixels = 1 (with tolerance)
    leaf_mask = np.all(np.abs(mask - leaf_rgb) <= color_tolerance, axis=2).astype(np.uint8)
    
    # Lesion pixels = 2 (with tolerance)
    lesion_mask = np.all(np.abs(mask - lesion_rgb) <= color_tolerance, axis=2).astype(np.uint8)
    
    # Morphological cleanup to remove noise
    kernel = np.ones((morph_kernel_size, morph_kernel_size), np.uint8)
    
    # Clean leaf mask
    leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_CLOSE, kernel)
    leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_OPEN, kernel)
    
    # Clean lesion mask
    lesion_mask = cv2.morphologyEx(lesion_mask, cv2.MORPH_OPEN, kernel)
    
    # Remove tiny lesion components (noise)
    leaf_pixels = np.sum(leaf_mask)
    if leaf_pixels > 0:
        min_area_px = max(5, int(min_lesion_pct * 0.01 * leaf_pixels))  # 0.05% of leaf area
        
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(lesion_mask, 8, cv2.CV_32S)
        for i in range(1, num_labels):  # Skip background (0)
            area = stats[i, cv2.CC_STAT_AREA]
            if area < min_area_px:
                labels[labels == i] = 0
        lesion_mask = (labels > 0).astype(np.uint8)
    
    # Build categorical mask
    categorical_mask[leaf_mask > 0] = 1
    categorical_mask[lesion_mask > 0] = 2  # Lesion overrides leaf
    
    return categorical_mask

# ============================================================================
# DATA GENERATOR
# ============================================================================

class SegmentationDataGenerator(tf.keras.utils.Sequence):
    """Custom data generator for segmentation with augmentation."""
    
    def __init__(self, image_paths, mask_paths, batch_size, image_size, 
                 leaf_rgb, lesion_rgb, color_tolerance=10, min_lesion_pct=0.05,
                 morph_kernel_size=3, augment=False, shuffle=True):
        self.image_paths = image_paths
        self.mask_paths = mask_paths
        self.batch_size = batch_size
        self.image_size = image_size
        self.leaf_rgb = leaf_rgb
        self.lesion_rgb = lesion_rgb
        self.color_tolerance = color_tolerance
        self.min_lesion_pct = min_lesion_pct
        self.morph_kernel_size = morph_kernel_size
        self.augment = augment
        self.shuffle = shuffle
        self.indexes = np.arange(len(self.image_paths))
        self.on_epoch_end()
    
    def __len__(self):
        return int(np.ceil(len(self.image_paths) / self.batch_size))
    
    def __getitem__(self, idx):
        batch_indexes = self.indexes[idx * self.batch_size:(idx + 1) * self.batch_size]
        
        batch_images = []
        batch_masks = []
        
        for i in batch_indexes:
            # Load image
            img = cv2.imread(self.image_paths[i])
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, self.image_size)
            
            # Load mask with noise cleanup
            mask = rgb_mask_to_categorical(
                self.mask_paths[i], 
                self.leaf_rgb, 
                self.lesion_rgb, 
                self.image_size,
                color_tolerance=self.color_tolerance,
                min_lesion_pct=self.min_lesion_pct,
                morph_kernel_size=self.morph_kernel_size
            )
            
            # Augmentation (same for image and mask)
            if self.augment and random.random() > 0.5:
                # Horizontal flip
                img = np.fliplr(img)
                mask = np.fliplr(mask)
            
            if self.augment and random.random() > 0.5:
                # Random rotation
                angle = random.randint(-15, 15)
                M = cv2.getRotationMatrix2D((self.image_size[0]//2, self.image_size[1]//2), angle, 1.0)
                img = cv2.warpAffine(img, M, self.image_size)
                mask = cv2.warpAffine(mask, M, self.image_size, flags=cv2.INTER_NEAREST)
            
            # Normalize image
            img = img.astype(np.float32) / 255.0
            
            batch_images.append(img)
            batch_masks.append(mask)
        
        return np.array(batch_images), np.array(batch_masks)
    
    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.indexes)

# ============================================================================
# U-NET MODEL ARCHITECTURE WITH PRETRAINED BACKBONE
# ============================================================================

def build_unet_with_backbone(input_size=(224, 224, 3), num_classes=3, backbone='mobilenetv2'):
    """
    Build U-Net with pretrained backbone (MobileNetV2/EfficientNetB0/ResNet50).
    
    Benefits:
    - Transfer learning from ImageNet
    - Faster convergence
    - Better feature extraction
    - Consistent with classification model
    
    Args:
        backbone: 'mobilenetv2', 'efficientnetb0', or 'resnet50'
    """
    inputs = layers.Input(input_size)
    
    # Load pretrained backbone
    if backbone == 'mobilenetv2':
        from tensorflow.keras.applications import MobileNetV2
        base_model = MobileNetV2(
            input_tensor=inputs,
            weights='imagenet',
            include_top=False,
            alpha=1.0
        )
        # Skip connection layers (from different depths)
        skip_layers = [
            'block_1_expand_relu',   # 112x112
            'block_3_expand_relu',   # 56x56
            'block_6_expand_relu',   # 28x28
            'block_13_expand_relu',  # 14x14
        ]
    elif backbone == 'efficientnetb0':
        from tensorflow.keras.applications import EfficientNetB0
        base_model = EfficientNetB0(
            input_tensor=inputs,
            weights='imagenet',
            include_top=False
        )
        skip_layers = [
            'block2a_expand_activation',
            'block3a_expand_activation',
            'block4a_expand_activation',
            'block6a_expand_activation',
        ]
    elif backbone == 'resnet50':
        from tensorflow.keras.applications import ResNet50
        base_model = ResNet50(
            input_tensor=inputs,
            weights='imagenet',
            include_top=False
        )
        skip_layers = [
            'conv1_relu',
            'conv2_block3_out',
            'conv3_block4_out',
            'conv4_block6_out',
        ]
    else:
        raise ValueError(f"Unsupported backbone: {backbone}")
    
    # Extract skip connection outputs
    skip_outputs = [base_model.get_layer(name).output for name in skip_layers]
    
    # Bottleneck (deepest features)
    bottleneck = base_model.output
    
    # Decoder (Upsampling path with skip connections)
    # Start from bottleneck
    x = bottleneck
    
    # Gradually upsample and concatenate with encoder features
    decoder_filters = [512, 256, 128, 64]
    
    for i, filters in enumerate(decoder_filters):
        # Upsample
        x = layers.UpSampling2D((2, 2))(x)
        
        # Concatenate with corresponding skip connection (reversed order)
        skip_idx = len(skip_outputs) - 1 - i
        if skip_idx >= 0:
            x = layers.concatenate([x, skip_outputs[skip_idx]])
        
        # Conv block
        x = layers.Conv2D(filters, (3, 3), activation='relu', padding='same')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(filters, (3, 3), activation='relu', padding='same')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)
    
    # Final upsampling to original size if needed
    # MobileNetV2/EfficientNet output is 7x7, need to upsample to 224x224
    current_size = x.shape[1]
    if current_size < input_size[0]:
        scale_factor = input_size[0] // current_size
        x = layers.UpSampling2D((scale_factor, scale_factor))(x)
    
    # Output layer (pixel-wise classification)
    outputs = layers.Conv2D(num_classes, (1, 1), activation='softmax', name='segmentation_output')(x)
    
    model = keras.Model(inputs=[inputs], outputs=[outputs], name=f'unet_{backbone}')
    
    return model

def build_unet(input_size=(224, 224, 3), num_classes=3):
    """
    Build standard U-Net architecture (no pretrained weights).
    Note: build_unet_with_backbone() is preferred for better performance.
    """
    inputs = layers.Input(input_size)
    
    # Encoder (Downsampling)
    c1 = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(inputs)
    c1 = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(c1)
    p1 = layers.MaxPooling2D((2, 2))(c1)
    
    c2 = layers.Conv2D(128, (3, 3), activation='relu', padding='same')(p1)
    c2 = layers.Conv2D(128, (3, 3), activation='relu', padding='same')(c2)
    p2 = layers.MaxPooling2D((2, 2))(c2)
    
    c3 = layers.Conv2D(256, (3, 3), activation='relu', padding='same')(p2)
    c3 = layers.Conv2D(256, (3, 3), activation='relu', padding='same')(c3)
    p3 = layers.MaxPooling2D((2, 2))(c3)
    
    c4 = layers.Conv2D(512, (3, 3), activation='relu', padding='same')(p3)
    c4 = layers.Conv2D(512, (3, 3), activation='relu', padding='same')(c4)
    p4 = layers.MaxPooling2D((2, 2))(c4)
    
    # Bottleneck
    c5 = layers.Conv2D(1024, (3, 3), activation='relu', padding='same')(p4)
    c5 = layers.Conv2D(1024, (3, 3), activation='relu', padding='same')(c5)
    
    # Decoder (Upsampling)
    u6 = layers.UpSampling2D((2, 2))(c5)
    u6 = layers.concatenate([u6, c4])
    c6 = layers.Conv2D(512, (3, 3), activation='relu', padding='same')(u6)
    c6 = layers.Conv2D(512, (3, 3), activation='relu', padding='same')(c6)
    
    u7 = layers.UpSampling2D((2, 2))(c6)
    u7 = layers.concatenate([u7, c3])
    c7 = layers.Conv2D(256, (3, 3), activation='relu', padding='same')(u7)
    c7 = layers.Conv2D(256, (3, 3), activation='relu', padding='same')(c7)
    
    u8 = layers.UpSampling2D((2, 2))(c7)
    u8 = layers.concatenate([u8, c2])
    c8 = layers.Conv2D(128, (3, 3), activation='relu', padding='same')(u8)
    c8 = layers.Conv2D(128, (3, 3), activation='relu', padding='same')(c8)
    
    u9 = layers.UpSampling2D((2, 2))(c8)
    u9 = layers.concatenate([u9, c1])
    c9 = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(u9)
    c9 = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(c9)
    
    # Output layer
    outputs = layers.Conv2D(num_classes, (1, 1), activation='softmax')(c9)
    
    model = keras.Model(inputs=[inputs], outputs=[outputs])
    
    return model

# ============================================================================
# TRAINING
# ============================================================================

def train_model():
    """Main training function."""
    
    # Load dataset
    print("\n📂 Loading dataset...")
    images, masks, classes, splits = load_dataset_with_masks(
        CONFIG['data_dir'],
        CONFIG['masks_dir'],
        CONFIG['manifest_path']
    )
    
    if len(images) == 0:
        print("❌ No images found! Check your data paths.")
        return None
    
    # Split data - preserve original splits if available
    if len(set(splits)) > 1:  # If we have train/val/test splits from manifest
        print(f"\n📊 Using pre-defined splits from manifest")
        X_train = [img for img, spl in zip(images, splits) if spl == 'train']
        y_train = [msk for msk, spl in zip(masks, splits) if spl == 'train']
        X_val = [img for img, spl in zip(images, splits) if spl in ['val', 'test']]
        y_val = [msk for msk, spl in zip(masks, splits) if spl in ['val', 'test']]
    else:
        print(f"\n📊 Creating random train/val split (stratified by class)")
        X_train, X_val, y_train, y_val = train_test_split(
            images, masks, test_size=0.2, random_state=42, stratify=classes
        )
    
    print(f"   Training: {len(X_train)} images")
    print(f"   Validation: {len(X_val)} images")
    
    # Create generators
    train_gen = SegmentationDataGenerator(
        X_train, y_train,
        batch_size=CONFIG['batch_size'],
        image_size=CONFIG['image_size'],
        leaf_rgb=CONFIG['leaf_rgb'],
        lesion_rgb=CONFIG['lesion_rgb'],
        color_tolerance=CONFIG['color_tolerance'],
        min_lesion_pct=CONFIG['min_lesion_area_pct'],
        morph_kernel_size=CONFIG['morphology_kernel_size'],
        augment=True,
        shuffle=True
    )
    
    val_gen = SegmentationDataGenerator(
        X_val, y_val,
        batch_size=CONFIG['batch_size'],
        image_size=CONFIG['image_size'],
        leaf_rgb=CONFIG['leaf_rgb'],
        lesion_rgb=CONFIG['lesion_rgb'],
        color_tolerance=CONFIG['color_tolerance'],
        min_lesion_pct=CONFIG['min_lesion_area_pct'],
        morph_kernel_size=CONFIG['morphology_kernel_size'],
        augment=False,
        shuffle=False
    )
    
    # Build model with pretrained backbone
    print(f"\n🏗️  Building U-Net with {CONFIG['backbone'].upper()} backbone...")
    model = build_unet_with_backbone(
        input_size=(*CONFIG['image_size'], 3),
        num_classes=CONFIG['num_classes'],
        backbone=CONFIG['backbone']
    )
    
    # Optionally freeze backbone for initial training
    if CONFIG['freeze_backbone']:
        print("   ❄️  Freezing backbone layers (transfer learning)")
        # Find backbone model
        for layer in model.layers:
            if 'mobilenet' in layer.name.lower() or 'efficientnet' in layer.name.lower() or 'resnet' in layer.name.lower():
                layer.trainable = False
        
        # Only decoder layers will train initially
        trainable_count = sum([1 for layer in model.layers if layer.trainable])
        frozen_count = sum([1 for layer in model.layers if not layer.trainable])
        print(f"   📊 Trainable layers: {trainable_count}")
        print(f"   📊 Frozen layers: {frozen_count}")
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=CONFIG['learning_rate']),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']  # Remove MeanIoU - causes shape issues with variable batch sizes
    )
    
    print(f"\n📊 Model Summary:")
    print(f"   Architecture: U-Net + {CONFIG['backbone'].upper()}")
    print(f"   Total params: {model.count_params():,}")
    trainable_params = sum([tf.size(w).numpy() for w in model.trainable_weights])
    print(f"   Trainable params: {trainable_params:,}")
    
    # Callbacks
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], f'best_segmentation_{CONFIG["backbone"]}.keras'),
            save_best_only=True,
            monitor='val_loss',
            verbose=1
        ),
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            verbose=1,
            min_lr=1e-7
        )
    ]
    
    # Train
    print("\n🚀 Starting training...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=CONFIG['epochs'],
        callbacks=callbacks,
        verbose=1
    )
    
    # Save final model
    os.makedirs(CONFIG['model_export_path'], exist_ok=True)
    final_path = os.path.join(CONFIG['model_export_path'], f'segmentation_{CONFIG["backbone"]}_final.keras')
    model.save(final_path)
    
    print("\n✅ Training complete!")
    print(f"   Model saved to: {final_path}")
    
    # Save training history plot (accuracy & loss)
    try:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        ax1.plot(history.history.get('accuracy', []), label='Training')
        ax1.plot(history.history.get('val_accuracy', []), label='Validation')
        ax1.set_title('Segmentation Accuracy')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Accuracy')
        ax1.legend()
        ax2.plot(history.history.get('loss', []), label='Training')
        ax2.plot(history.history.get('val_loss', []), label='Validation')
        ax2.set_title('Segmentation Loss')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Loss')
        ax2.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(CONFIG['model_export_path'], f'training_history_segmentation_{CONFIG["backbone"]}.png'))
        plt.close()
        print(f"   📈 Training history saved: training_history_segmentation_{CONFIG['backbone']}.png")
    except Exception as e:
        print(f"   ⚠️  Could not save training history plot: {e}")
    
    # Save training metrics JSON
    try:
        # Friendly model name mapping
        backbone_name_map = {
            'mobilenetv2': 'MobileNetV2',
            'efficientnetb0': 'EfficientNetB0',
            'resnet50': 'ResNet50',
        }
        model_name = f"Segmentation_{backbone_name_map.get(CONFIG['backbone'], CONFIG['backbone'])}"
        metrics = {
            'model_name': model_name,
            'final_train_accuracy': float(history.history.get('accuracy', [0])[-1]) if history.history.get('accuracy') else None,
            'final_val_accuracy': float(history.history.get('val_accuracy', [0])[-1]) if history.history.get('val_accuracy') else None,
            'best_val_accuracy': float(max(history.history.get('val_accuracy', [0]))) if history.history.get('val_accuracy') else None,
            'final_train_loss': float(history.history.get('loss', [0])[-1]) if history.history.get('loss') else None,
            'final_val_loss': float(history.history.get('val_loss', [0])[-1]) if history.history.get('val_loss') else None,
            'best_val_loss': float(min(history.history.get('val_loss', [0]))) if history.history.get('val_loss') else None,
            'total_epochs': len(history.history.get('loss', [])),
            'config': CONFIG
        }
        with open(os.path.join(CONFIG['model_export_path'], f"{model_name}_metrics.json"), 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"   🧾 Metrics JSON saved: {model_name}_metrics.json")
    except Exception as e:
        print(f"   ⚠️  Could not save metrics JSON: {e}")
    
    # Compute and save per-pixel confusion matrix on validation set
    try:
        from sklearn.metrics import confusion_matrix
        labels = [0, 1, 2]  # background, leaf, lesion
        y_true_list = []
        y_pred_list = []
        for i in range(len(val_gen)):
            batch_imgs, batch_masks = val_gen[i]
            preds = model.predict(batch_imgs, verbose=0)
            pred_classes = np.argmax(preds, axis=-1)
            y_true_list.append(batch_masks.reshape(-1))
            y_pred_list.append(pred_classes.reshape(-1))
        y_true = np.concatenate(y_true_list)
        y_pred = np.concatenate(y_pred_list)
        cm = confusion_matrix(y_true, y_pred, labels=labels)
        # IoU and Dice per class
        eps = 1e-7
        iou_per_class = {}
        dice_per_class = {}
        class_labels = ['background', 'leaf', 'lesion']
        for idx, cls_name in enumerate(class_labels):
            tp = float(cm[idx, idx])
            fp = float(cm[:, idx].sum() - tp)
            fn = float(cm[idx, :].sum() - tp)
            iou = tp / (tp + fp + fn + eps)
            dice = (2 * tp) / (2 * tp + fp + fn + eps)
            iou_per_class[cls_name] = iou
            dice_per_class[cls_name] = dice
        seg_metrics = {
            'confusion_matrix': cm.tolist(),
            'class_labels': class_labels,
            'iou_per_class': iou_per_class,
            'dice_per_class': dice_per_class
        }
        with open(os.path.join(CONFIG['model_export_path'], f'test_metrics_segmentation_{CONFIG["backbone"]}.json'), 'w') as f:
            json.dump(seg_metrics, f, indent=2)
        # Plot confusion matrix
        plt.figure(figsize=(8, 6))
        plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
        plt.title(f'Confusion Matrix - Segmentation ({CONFIG["backbone"]})')
        plt.colorbar()
        tick_marks = np.arange(len(class_labels))
        plt.xticks(tick_marks, class_labels, rotation=45)
        plt.yticks(tick_marks, class_labels)
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                plt.text(j, i, format(cm[i, j], 'd'), ha='center', va='center',
                         color='white' if cm[i, j] > (cm.max() / 2.0) else 'black')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig(os.path.join(CONFIG['model_export_path'], f'confusion_matrix_segmentation_{CONFIG["backbone"]}.png'))
        plt.close()
        print(f"   🔢 Confusion matrix saved: confusion_matrix_segmentation_{CONFIG['backbone']}.png")
    except Exception as e:
        print(f"   ⚠️  Could not compute/save confusion matrix: {e}")
    
    return model, history

# ============================================================================
# MAIN
# ============================================================================

def main():
    try:
        model, history = train_model()
        if model:
            print("\n🎉 Segmentation model training successful!")
            print("\n📝 Next steps:")
            print("1. Evaluate model on test set")
            print("2. Convert to TFLite for mobile deployment")
            print("3. Integrate severity calculation in app")
    except Exception as e:
        print(f"\n❌ Error during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
