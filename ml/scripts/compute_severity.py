"""
Compute Severity from CVAT Annotations
Converts CVAT masks/polygons to severity percentages for each annotated image
Outputs: metadata/severity.csv with severity_pct for each image
"""

import os
import json
import cv2
import numpy as np
import pandas as pd
from pathlib import Path
from PIL import Image
import warnings
warnings.filterwarnings('ignore')

def convert_coco_to_masks(coco_json_path, output_dir):
    """
    Convert COCO format annotations to binary masks.
    
    Args:
        coco_json_path: Path to COCO annotations JSON
        output_dir: Directory to save masks
    
    Returns:
        Dictionary mapping image_id -> {leaf_mask_path, lesion_mask_path}
    """
    from pycocotools.coco import COCO
    from pycocotools import mask as coco_mask
    
    coco = COCO(coco_json_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    mask_paths = {}
    
    # Get all images
    img_ids = coco.getImgIds()
    
    for img_id in img_ids:
        img_info = coco.loadImgs(img_id)[0]
        filename = img_info['file_name']
        height = img_info['height']
        width = img_info['width']
        
        # Get annotations for this image
        ann_ids = coco.getAnnIds(imgIds=img_id)
        anns = coco.loadAnns(ann_ids)
        
        # Create binary masks
        leaf_mask = np.zeros((height, width), dtype=np.uint8)
        lesion_mask = np.zeros((height, width), dtype=np.uint8)
        
        for ann in anns:
            cat_id = ann['category_id']
            cat_info = coco.loadCats(cat_id)[0]
            cat_name = cat_info['name'].lower()
            
            # Convert annotation to mask
            if 'segmentation' in ann:
                if isinstance(ann['segmentation'], list):
                    # Polygon format
                    rles = coco_mask.frPyObjects(ann['segmentation'], height, width)
                    rle = coco_mask.merge(rles)
                else:
                    # RLE format
                    rle = ann['segmentation']
                
                m = coco_mask.decode(rle)
                
                # Add to appropriate mask
                if 'leaf' in cat_name:
                    leaf_mask = np.maximum(leaf_mask, m)
                elif 'lesion' in cat_name:
                    lesion_mask = np.maximum(lesion_mask, m)
        
        # Save masks
        stem = Path(filename).stem
        leaf_path = output_dir / f"{stem}_leaf.png"
        lesion_path = output_dir / f"{stem}_lesion.png"
        
        cv2.imwrite(str(leaf_path), leaf_mask * 255)
        cv2.imwrite(str(lesion_path), lesion_mask * 255)
        
        mask_paths[filename] = {
            'leaf_mask': str(leaf_path),
            'lesion_mask': str(lesion_path)
        }
    
    return mask_paths

def load_cvat_rgb_masks(masks_dir, labelmap_path=None):
    """
    Load CVAT SegmentationClass RGB masks.
    
    CVAT exports single PNG files with RGB colors for each label:
    - leaf: RGB(36, 179, 83)
    - lesion: RGB(226, 40, 25)
    - background: RGB(0, 0, 0)
    
    Args:
        masks_dir: Path to SegmentationClass directory
        labelmap_path: Optional path to labelmap.txt (for auto-detection)
    
    Returns:
        Dictionary mapping filename -> mask_path
    """
    masks_dir = Path(masks_dir)
    mask_paths = {}
    
    # Find all PNG masks
    png_files = list(masks_dir.glob("*.png"))
    
    for mask_path in png_files:
        filename = mask_path.name
        mask_paths[filename] = str(mask_path)
    
    return mask_paths

def load_png_masks(masks_dir):
    """
    Load pre-existing PNG masks (separate leaf/lesion files).
    
    Expected structure:
    masks_dir/
    ├── image001_leaf.png
    ├── image001_lesion.png
    ├── image002_leaf.png
    └── image002_lesion.png
    
    Returns:
        Dictionary mapping base_filename -> {leaf_mask_path, lesion_mask_path}
    """
    masks_dir = Path(masks_dir)
    mask_paths = {}
    
    # Find all leaf masks
    leaf_masks = list(masks_dir.glob("*_leaf.png"))
    
    for leaf_path in leaf_masks:
        stem = leaf_path.stem.replace('_leaf', '')
        lesion_path = masks_dir / f"{stem}_lesion.png"
        
        if lesion_path.exists():
            mask_paths[stem] = {
                'leaf_mask': str(leaf_path),
                'lesion_mask': str(lesion_path)
            }
        else:
            print(f"⚠️  Warning: Missing lesion mask for {stem}")
    
    return mask_paths

def compute_severity_from_cvat_mask(rgb_mask_path, leaf_rgb=(36, 179, 83), lesion_rgb=(226, 40, 25)):
    """
    Compute severity from CVAT RGB segmentation mask.
    
    Args:
        rgb_mask_path: Path to CVAT SegmentationClass PNG
        leaf_rgb: RGB color for leaf label (default from CVAT)
        lesion_rgb: RGB color for lesion label (default from CVAT)
    
    Returns:
        Dictionary with severity metrics
    """
    # Load RGB mask
    mask = cv2.imread(str(rgb_mask_path))
    
    if mask is None:
        return {
            'severity_pct': None,
            'leaf_pixels': 0,
            'lesion_pixels': 0,
            'status': 'error_loading_mask'
        }
    
    # Convert BGR to RGB (OpenCV loads as BGR)
    mask_rgb = cv2.cvtColor(mask, cv2.COLOR_BGR2RGB)
    
    # Extract leaf and lesion masks by color matching
    # Allow small tolerance for JPEG compression artifacts
    leaf_mask = np.all(np.abs(mask_rgb - leaf_rgb) <= 5, axis=2)
    lesion_mask = np.all(np.abs(mask_rgb - lesion_rgb) <= 5, axis=2)
    
    # Count pixels
    leaf_pixels = np.sum(leaf_mask)
    lesion_pixels = np.sum(lesion_mask)
    
    # Compute severity
    if leaf_pixels == 0:
        return {
            'severity_pct': None,
            'leaf_pixels': 0,
            'lesion_pixels': int(lesion_pixels),
            'status': 'no_leaf_detected'
        }
    
    severity_pct = (lesion_pixels / leaf_pixels) * 100.0
    
    # Classify severity stage (based on coffee-leaf segmentation research)
    # Early (mild): <25% area diseased
    # Progressive: 25-50% area diseased
    # Severe: >50% area diseased
    if severity_pct < 25.0:
        stage = 'early'
    elif severity_pct <= 50.0:
        stage = 'progressive'
    else:
        stage = 'severe'
    
    return {
        'severity_pct': round(severity_pct, 2),
        'leaf_pixels': int(leaf_pixels),
        'lesion_pixels': int(lesion_pixels),
        'severity_stage': stage,
        'status': 'success'
    }

def compute_severity_from_masks(leaf_mask_path, lesion_mask_path):
    """
    Compute severity percentage from binary masks (separate files).
    
    severity_pct = (lesion_pixels / leaf_pixels) × 100
    
    Args:
        leaf_mask_path: Path to leaf binary mask
        lesion_mask_path: Path to lesion binary mask
    
    Returns:
        Dictionary with severity metrics
    """
    # Load masks
    leaf_mask = cv2.imread(str(leaf_mask_path), cv2.IMREAD_GRAYSCALE)
    lesion_mask = cv2.imread(str(lesion_mask_path), cv2.IMREAD_GRAYSCALE)
    
    if leaf_mask is None or lesion_mask is None:
        return {
            'severity_pct': None,
            'leaf_pixels': 0,
            'lesion_pixels': 0,
            'status': 'error_loading_masks'
        }
    
    # Threshold to binary (>127 = 1, else 0)
    leaf_binary = (leaf_mask > 127).astype(np.uint8)
    lesion_binary = (lesion_mask > 127).astype(np.uint8)
    
    # Count pixels
    leaf_pixels = np.sum(leaf_binary)
    lesion_pixels = np.sum(lesion_binary)
    
    # Compute severity
    if leaf_pixels == 0:
        return {
            'severity_pct': None,
            'leaf_pixels': 0,
            'lesion_pixels': lesion_pixels,
            'status': 'no_leaf_detected'
        }
    
    severity_pct = (lesion_pixels / leaf_pixels) * 100.0
    
    # Classify severity stage (based on coffee-leaf segmentation research)
    # Early (mild): <25% area diseased
    # Progressive: 25-50% area diseased
    # Severe: >50% area diseased
    if severity_pct < 25.0:
        stage = 'early'
    elif severity_pct <= 50.0:
        stage = 'progressive'
    else:
        stage = 'severe'
    
    return {
        'severity_pct': round(severity_pct, 2),
        'leaf_pixels': int(leaf_pixels),
        'lesion_pixels': int(lesion_pixels),
        'severity_stage': stage,
        'status': 'success'
    }

def assign_severity_bins(severity_pct):
    """Assign severity stage based on percentage (coffee-leaf segmentation research).
    
    Thresholds based on research (oaji.net):
    - Early (mild): <25% area diseased
    - Progressive: 25-50% area diseased  
    - Severe: >50% area diseased
    """
    if severity_pct is None or severity_pct < 0:
        return 'unknown'
    elif severity_pct < 25.0:
        return 'early'
    elif severity_pct <= 50.0:
        return 'progressive'
    else:
        return 'severe'

def main():
    """Main severity computation process."""
    print("\n" + "="*60)
    print("SEVERITY COMPUTATION FROM CVAT ANNOTATIONS")
    print("="*60)
    
    base_path = Path(__file__).parent
    
    # Input options
    print("\nInput format options:")
    print("1. CVAT SegmentationClass (RGB masks)")
    print("2. COCO JSON (from CVAT export)")
    print("3. PNG masks (separate leaf/lesion files)")
    
    input_type = input("\nSelect input type (1, 2, or 3): ").strip()
    
    if input_type == "1":
        # CVAT SegmentationClass RGB masks
        masks_path = input("Enter path to SegmentationClass directory: ").strip()
        masks_dir = Path(masks_path)
        
        if not masks_dir.exists():
            print(f"❌ Error: Directory not found: {masks_dir}")
            return
        
        print(f"\nLoading CVAT RGB masks from: {masks_dir}")
        mask_paths = load_cvat_rgb_masks(masks_dir)
        
        if not mask_paths:
            print("❌ Error: No PNG files found!")
            return
        
        print(f"✅ Found {len(mask_paths)} RGB masks")
        use_cvat_rgb = True
    
    elif input_type == "2":
        # COCO format
        coco_path = input("Enter path to COCO JSON file: ").strip()
        coco_path = Path(coco_path)
        
        if not coco_path.exists():
            print(f"❌ Error: File not found: {coco_path}")
            return
        
        masks_dir = base_path / 'annotations' / 'masks'
        print(f"\nConverting COCO annotations to masks...")
        print(f"Output: {masks_dir}")
        
        try:
            mask_paths = convert_coco_to_masks(coco_path, masks_dir)
            print(f"✅ Converted {len(mask_paths)} images to masks")
            use_cvat_rgb = False
        except ImportError:
            print("❌ Error: pycocotools not installed!")
            print("   Install with: pip install pycocotools")
            return
        except Exception as e:
            print(f"❌ Error converting COCO: {e}")
            return
    
    elif input_type == "3":
        # PNG masks (separate files)
        masks_path = input("Enter path to masks directory: ").strip()
        masks_dir = Path(masks_path)
        
        if not masks_dir.exists():
            print(f"❌ Error: Directory not found: {masks_dir}")
            return
        
        print(f"\nLoading PNG masks from: {masks_dir}")
        mask_paths = load_png_masks(masks_dir)
        
        if not mask_paths:
            print("❌ Error: No mask pairs found!")
            print("   Expected: *_leaf.png and *_lesion.png")
            return
        
        print(f"✅ Found {len(mask_paths)} mask pairs")
        use_cvat_rgb = False
    
    else:
        print("❌ Invalid selection!")
        return
    
    # Compute severity for each image
    print(f"\n{'='*60}")
    print("Computing severity...")
    print(f"{'='*60}\n")
    
    results = []
    
    for filename, path_info in mask_paths.items():
        print(f"Processing: {filename}...", end=" ")
        
        if use_cvat_rgb:
            # CVAT RGB mask (single file)
            metrics = compute_severity_from_cvat_mask(path_info)
            result = {
                'filename': filename,
                'mask_path': path_info,
                **metrics
            }
        else:
            # Separate leaf/lesion masks
            metrics = compute_severity_from_masks(
                path_info['leaf_mask'],
                path_info['lesion_mask']
            )
            result = {
                'filename': filename,
                'leaf_mask': path_info['leaf_mask'],
                'lesion_mask': path_info['lesion_mask'],
                **metrics
            }
        
        results.append(result)
        
        if metrics['status'] == 'success':
            print(f"✅ {metrics['severity_pct']:.2f}% ({metrics['severity_stage']})")
        else:
            print(f"⚠️  {metrics['status']}")
    
    # Create DataFrame
    df = pd.DataFrame(results)
    
    # Save to CSV
    output_path = base_path / 'metadata' / 'severity.csv'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"\n{'='*60}")
    print("SEVERITY COMPUTATION COMPLETE")
    print(f"{'='*60}")
    print(f"\n✅ Saved results: {output_path}")
    print(f"   Total images: {len(results)}")
    
    # Summary statistics
    successful = df[df['status'] == 'success']
    
    if len(successful) > 0:
        print(f"\n📊 Severity Statistics:")
        print(f"   Mean severity: {successful['severity_pct'].mean():.2f}%")
        print(f"   Median severity: {successful['severity_pct'].median():.2f}%")
        print(f"   Min severity: {successful['severity_pct'].min():.2f}%")
        print(f"   Max severity: {successful['severity_pct'].max():.2f}%")
        
        print(f"\n📊 Severity Stage Distribution:")
        stage_counts = successful['severity_stage'].value_counts()
        for stage, count in stage_counts.items():
            pct = (count / len(successful)) * 100
            print(f"   {stage.capitalize()}: {count} ({pct:.1f}%)")
    
    print("\n🎯 Next Steps:")
    print("1. Review severity.csv for quality")
    print("2. Train classification model (use train_mobilenetv2.py)")
    print("3. Train multi-task model with severity head")
    print("4. Or train separate severity regression model")

if __name__ == '__main__':
    main()
