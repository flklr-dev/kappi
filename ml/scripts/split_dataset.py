"""
Data Splitting Script for Coffee Plant Disease Classification
Performs stratified 70/15/15 split on raw images before preprocessing
"""

import os
import random
import shutil
import json
from pathlib import Path

# Set random seeds for reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# Split ratios
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

def split_dataset():
    """Split raw dataset into train/val/test sets with stratification."""
    
    # Define paths
    base_path = Path(__file__).parent.parent.absolute()
    raw_path = base_path / 'data' / 'raw'
    processed_path = base_path / 'data' / 'processed'
    
    print(f"\n{'='*60}")
    print("DATASET SPLITTING - Raw Images")
    print(f"{'='*60}")
    print(f"Base path: {base_path}")
    print(f"Raw path: {raw_path}")
    print(f"Processed path: {processed_path}")
    print(f"Random seed: {RANDOM_SEED}")
    print(f"Split ratio: Train={TRAIN_RATIO}, Val={VAL_RATIO}, Test={TEST_RATIO}")
    
    # Define disease classes
    classes = [
        'healthy',
        'leaf_rust',
        'leaf_spot',
        'brown_spot',
        'sooty_mold'
    ]
    
    # Create processed directory structure
    if processed_path.exists():
        print(f"\nRemoving existing processed directory...")
        shutil.rmtree(processed_path)
    
    print(f"Creating processed directory structure...")
    for split in ['train', 'val', 'test']:
        for class_name in classes:
            (processed_path / split / class_name).mkdir(parents=True, exist_ok=True)
    
    # Statistics
    split_stats = {
        'random_seed': RANDOM_SEED,
        'split_ratio': {
            'train': TRAIN_RATIO,
            'val': VAL_RATIO,
            'test': TEST_RATIO
        },
        'class_distribution': {}
    }
    
    total_train = 0
    total_val = 0
    total_test = 0
    
    print(f"\n{'='*60}")
    print("Processing Classes")
    print(f"{'='*60}")
    
    # Process each class
    for class_name in classes:
        class_path = raw_path / class_name
        
        if not class_path.exists():
            print(f"\n⚠️  Warning: Class directory not found: {class_path}")
            continue
        
        # Get all image files
        image_files = [
            f for f in class_path.iterdir()
            if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg', '.png']
        ]
        
        n_images = len(image_files)
        
        if n_images == 0:
            print(f"\n⚠️  Warning: No images found in {class_name}")
            continue
        
        print(f"\n📁 Class: {class_name}")
        print(f"   Total images: {n_images}")
        
        # Shuffle images
        random.shuffle(image_files)
        
        # Calculate split indices
        n_train = int(n_images * TRAIN_RATIO)
        n_val = int(n_images * VAL_RATIO)
        n_test = n_images - n_train - n_val  # Remaining goes to test
        
        # Ensure at least 1 image per split if we have enough images
        if n_images >= 3:
            if n_train == 0:
                n_train = 1
            if n_val == 0:
                n_val = 1
            if n_test == 0:
                n_test = 1
            
            # Adjust if total exceeds available
            total = n_train + n_val + n_test
            if total > n_images:
                n_test = n_images - n_train - n_val
        
        # Split the files
        train_files = image_files[:n_train]
        val_files = image_files[n_train:n_train + n_val]
        test_files = image_files[n_train + n_val:n_train + n_val + n_test]
        
        print(f"   Train: {len(train_files)} ({len(train_files)/n_images*100:.1f}%)")
        print(f"   Val:   {len(val_files)} ({len(val_files)/n_images*100:.1f}%)")
        print(f"   Test:  {len(test_files)} ({len(test_files)/n_images*100:.1f}%)")
        
        # Copy files to respective directories
        for img_file in train_files:
            dest = processed_path / 'train' / class_name / img_file.name
            shutil.copy2(img_file, dest)
        
        for img_file in val_files:
            dest = processed_path / 'val' / class_name / img_file.name
            shutil.copy2(img_file, dest)
        
        for img_file in test_files:
            dest = processed_path / 'test' / class_name / img_file.name
            shutil.copy2(img_file, dest)
        
        # Update statistics
        split_stats['class_distribution'][class_name] = {
            'total': n_images,
            'train': len(train_files),
            'val': len(val_files),
            'test': len(test_files)
        }
        
        total_train += len(train_files)
        total_val += len(val_files)
        total_test += len(test_files)
    
    # Add totals to stats
    split_stats['totals'] = {
        'train': total_train,
        'val': total_val,
        'test': total_test,
        'total': total_train + total_val + total_test
    }
    
    # Save split information
    metadata_path = base_path / 'data' / 'metadata'
    metadata_path.mkdir(parents=True, exist_ok=True)
    
    with open(metadata_path / 'split_info.json', 'w') as f:
        json.dump(split_stats, f, indent=2)
    
    print(f"\n{'='*60}")
    print("SPLIT SUMMARY")
    print(f"{'='*60}")
    print(f"Total Train: {total_train}")
    print(f"Total Val:   {total_val}")
    print(f"Total Test:  {total_test}")
    print(f"Total:       {total_train + total_val + total_test}")
    print(f"\n✅ Split information saved to: {metadata_path / 'split_info.json'}")
    print(f"✅ Dataset splitting complete!")

if __name__ == '__main__':
    split_dataset()
