"""
Collect negative samples for Outlier Exposure training.
Downloads images of non-coffee-leaf objects to help the model reject random inputs.
"""

from bing_image_downloader import downloader
import os
from pathlib import Path
from PIL import Image
import time

def convert_to_jpg(image_path, quality=90):
    """Convert image to JPG format if not already."""
    try:
        if image_path.suffix.lower() in ['.png', '.webp', '.bmp', '.gif']:
            img = Image.open(image_path)
            # Convert to RGB if needed (removes alpha channel)
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = rgb_img
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Save as JPG
            jpg_path = image_path.with_suffix('.jpg')
            img.save(jpg_path, 'JPEG', quality=quality)
            
            # Delete original if conversion successful
            if jpg_path.exists() and jpg_path != image_path:
                image_path.unlink()
                return jpg_path
            return image_path
        return image_path
    except Exception as e:
        print(f"      ⚠️  Failed to convert {image_path.name}: {str(e)[:30]}...")
        return image_path

def collect_negative_samples():
    """Download negative samples for outlier exposure training."""
    
    # Define output directory
    OUTPUT_DIR = Path(__file__).parent.parent / 'data' / 'negative_samples'
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"📂 Creating negative samples directory: {OUTPUT_DIR}")
    
    # Category: Query mappings with more specific terms to avoid ambiguity
    categories = {
        'electronics': [
            ('laptop computer screen', 15),
            ('smartphone mobile phone', 15),
            ('tablet device ipad', 10)
        ],
        'people': [
            ('portrait photography face', 15),  # More specific for actual faces
            ('selfie photograph person', 15),   # Real selfies, not diagrams
            ('human hand holding', 10)           # Actual hands
        ],
        'furniture': [
            ('wooden desk office', 12),         # More specific
            ('dining table wood', 12),          # More specific
            ('white wall background', 8)        # Simpler query
        ],
        'textures': [
            ('concrete wall texture', 10),
            ('hardwood floor pattern', 10),
            ('fabric cloth texture', 8)
        ],
        'other_plants': [
            ('tomato plant leaves', 10),
            ('rose flower garden', 10),
            ('green grass lawn', 8)
        ]
    }
    
    total_downloaded = 0
    total_converted = 0
    
    for category, queries in categories.items():
        print(f"\n{'='*50}")
        print(f"📥 Downloading: {category}")
        print('='*50)
        
        category_path = OUTPUT_DIR / category
        category_path.mkdir(exist_ok=True)
        
        category_total = 0
        
        for query_info in queries:
            if isinstance(query_info, tuple):
                query, limit = query_info
            else:
                query, limit = query_info, 15
                
            print(f"  → Searching for: {query} (limit: {limit})")
            
            try:
                # Download with shorter timeout per image
                downloader.download(
                    query,
                    limit=limit,
                    output_dir=str(category_path),
                    adult_filter_off=True,
                    force_replace=False,
                    timeout=15,  # Reduced timeout to prevent hanging
                    verbose=False
                )
                
                # Wait a bit to ensure download completes
                time.sleep(1)
                
                # Find and convert downloaded images
                query_folder = category_path / query
                if query_folder.exists() and query_folder.is_dir():
                    images = list(query_folder.glob('*'))
                    print(f"    📥 Downloaded {len(images)} images")
                    
                    # Convert images to JPG
                    converted_count = 0
                    for img_path in images:
                        if img_path.is_file() and img_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']:
                            new_path = convert_to_jpg(img_path)
                            if new_path.suffix.lower() in ['.jpg', '.jpeg']:
                                converted_count += 1
                    
                    if converted_count > 0:
                        print(f"    🔄 Converted {converted_count} images to JPG")
                        total_converted += converted_count
                    
                    category_total += len(list(query_folder.glob('*.jpg'))) + len(list(query_folder.glob('*.jpeg')))
                    print(f"    ✅ Final count: {category_total} JPG images")
                else:
                    print(f"    ⚠️  No images downloaded for '{query}'")
                    
            except Exception as e:
                print(f"    ⚠️  Failed to download '{query}': {str(e)[:50]}...")
                # Continue with next query even if one fails
                continue
        
        print(f"  📊 Category total: {category_total} images")
        total_downloaded += category_total
    
    print(f"\n{'='*50}")
    print("✅ Collection complete!")
    print(f"📁 Negative samples saved to: {OUTPUT_DIR}")
    print(f"📊 Total negative images: {total_downloaded}")
    print(f"🔄 Total images converted to JPG: {total_converted}")
    
    # Show directory structure
    print(f"\n📁 Directory structure:")
    for root, dirs, files in os.walk(OUTPUT_DIR):
        level = root.replace(str(OUTPUT_DIR), '').count(os.sep)
        indent = ' ' * 2 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 2 * (level + 1)
        if level < 2:  # Only show top 2 levels
            jpg_files = [f for f in files if f.lower().endswith(('.jpg', '.jpeg'))]
            for file in jpg_files[:5]:  # Show first 5 JPG files
                print(f"{subindent}{file}")
            if len(jpg_files) > 5:
                print(f"{subindent}... and {len(jpg_files) - 5} more JPG files")

if __name__ == "__main__":
    collect_negative_samples()