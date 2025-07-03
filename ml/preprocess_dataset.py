import os
import cv2
import numpy as np
from PIL import Image
import random
import shutil
from tqdm import tqdm

# Constants
INPUT_SIZE = (224, 224)  # Match with model input size
MIN_IMAGE_SIZE = 1024  # Minimum size in bytes for valid images
TARGET_IMAGES_PER_CLASS = 1000  # Increased target for better augmentation

def create_processed_dirs(base_path):
    """Create processed directories for train and validation sets."""
    processed_dir = os.path.join(base_path, 'processed')
    if os.path.exists(processed_dir):
        print(f"Cleaning existing processed directory: {processed_dir}")
        shutil.rmtree(processed_dir)
    os.makedirs(processed_dir)
    
    train_dir = os.path.join(processed_dir, 'train')
    val_dir = os.path.join(processed_dir, 'val')
    os.makedirs(train_dir)
    os.makedirs(val_dir)
    
    classes = ['Healthy', 'CLR_Early', 'CLR_Progressive', 'CLR_SEVERE']
    for class_name in classes:
        os.makedirs(os.path.join(train_dir, class_name))
        os.makedirs(os.path.join(val_dir, class_name))
    
    return train_dir, val_dir

def is_valid_image(image_path):
    """Check if image is valid and not corrupted."""
    try:
        img = Image.open(image_path)
        img.verify()
        return os.path.getsize(image_path) >= MIN_IMAGE_SIZE
    except Exception as e:
        print(f"Invalid image {image_path}: {str(e)}")
        return False

def preprocess_image(image_path, target_size=INPUT_SIZE):
    """Enhanced preprocessing for a single image."""
    try:
        # Read image with PIL
        img = Image.open(image_path)
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Convert to numpy array
        img_array = np.array(img)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        enhanced = cv2.merge((cl,a,b))
        img_array = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
        
        # Resize image
        img_array = cv2.resize(img_array, target_size, interpolation=cv2.INTER_AREA)
        
        # Normalize pixel values
        img_array = img_array.astype(np.float32) / 255.0
        
        return img_array
    except Exception as e:
        print(f"Error preprocessing {image_path}: {e}")
        return None

def apply_opencv_augmentation(img):
    """Enhanced augmentation techniques."""
    if img is None:
        return None
        
    try:
        # Convert to numpy array if not already
        if not isinstance(img, np.ndarray):
            img = np.array(img)
        
        # Ensure image is in BGR format for OpenCV
        if len(img.shape) == 2:  # Grayscale
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif img.shape[2] == 4:  # RGBA
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        elif img.shape[2] == 3 and img.dtype == np.float32:  # RGB float
            img = (img * 255).astype(np.uint8)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        
        # Random rotation
        angle = np.random.uniform(-15, 15)
        h, w = img.shape[:2]
        M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1)
        img = cv2.warpAffine(img, M, (w, h))
        
        # Random flip
        if np.random.random() > 0.5:
            img = cv2.flip(img, 1)  # Horizontal flip
        
        # Random brightness and contrast
        alpha = np.random.uniform(0.8, 1.2)  # Contrast
        beta = np.random.uniform(-10, 10)    # Brightness
        img = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)
        
        # Random noise
        if np.random.random() > 0.5:
            noise = np.random.normal(0, 10, img.shape).astype(np.uint8)
            img = cv2.add(img, noise)
        
        # Random blur
        if np.random.random() > 0.7:
            kernel_size = np.random.choice([3, 5])
            img = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
        
        # Convert back to RGB for saving
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        return img
    except Exception as e:
        print(f"Error in augmentation: {e}")
        return None

def save_image(image, path):
    """Save image with validation."""
    try:
        if image is None:
            print(f"Cannot save None image to {path}")
            return False
            
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Convert float32 to uint8 if needed
        if image.dtype == np.float32:
            image = (image * 255).astype(np.uint8)
        
        # Save image
        cv2.imwrite(path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
        
        # Verify the saved image
        if os.path.exists(path) and os.path.getsize(path) >= MIN_IMAGE_SIZE:
            return True
        else:
            print(f"Failed to save valid image to {path}")
            if os.path.exists(path):
                os.remove(path)
            return False
    except Exception as e:
        print(f"Error saving image to {path}: {e}")
        if os.path.exists(path):
            os.remove(path)
        return False

def main():
    """Main function to preprocess and augment the dataset."""
    base_path = os.path.abspath(os.path.dirname(__file__))
    data_path = os.path.join(base_path, 'data')
    
    print(f"Base path: {base_path}")
    print(f"Data path: {data_path}")
    
    # Create processed directories
    train_dir, val_dir = create_processed_dirs(data_path)
    
    # Define class mappings
    class_mappings = {
        'Healthy': os.path.join(data_path, 'Healthy', 'leaf'),
        'CLR_Early': os.path.join(data_path, 'CoffeeLeafRust', 'leaf_early'),
        'CLR_Progressive': os.path.join(data_path, 'CoffeeLeafRust', 'leaf_progressive'),
        'CLR_SEVERE': os.path.join(data_path, 'CoffeeLeafRust', 'leaf_severe')
    }
    
    # Process each class
    for class_name, source_path in class_mappings.items():
        print(f"\nProcessing {class_name}...")
        print(f"Source path: {source_path}")
        
        if not os.path.exists(source_path):
            print(f"Error: Source path does not exist: {source_path}")
            continue
            
        # Get all images for this class
        images = [f for f in os.listdir(source_path) 
                 if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        if not images:
            print(f"Error: No images found in {source_path}")
            continue
            
        print(f"Found {len(images)} images")
        
        # Shuffle images
        random.shuffle(images)
        
        # Split into train/val (80/20)
        split_idx = int(len(images) * 0.8)
        train_images = images[:split_idx]
        val_images = images[split_idx:]
        
        # Process training images
        print(f"Processing {len(train_images)} training images...")
        train_success = 0
        for img_name in tqdm(train_images):
            img_path = os.path.join(source_path, img_name)
            if not is_valid_image(img_path):
                continue
                
            # Process original image
            img = preprocess_image(img_path)
            if img is not None:
                save_path = os.path.join(train_dir, class_name, 
                                       f"{os.path.splitext(img_name)[0]}_proc.jpg")
                if save_image(img, save_path):
                    train_success += 1
            
            # Apply augmentations
            for i in range(5):  # Create 5 augmented versions
                aug_img = apply_opencv_augmentation(img)
                if aug_img is not None:
                    save_path = os.path.join(train_dir, class_name,
                                           f"{os.path.splitext(img_name)[0]}_aug{i}.jpg")
                    if save_image(aug_img, save_path):
                        train_success += 1
        
        # Process validation images
        print(f"Processing {len(val_images)} validation images...")
        val_success = 0
        for img_name in tqdm(val_images):
            img_path = os.path.join(source_path, img_name)
            if not is_valid_image(img_path):
                continue
                
            # Process original image
            img = preprocess_image(img_path)
            if img is not None:
                save_path = os.path.join(val_dir, class_name,
                                       f"{os.path.splitext(img_name)[0]}_proc.jpg")
                if save_image(img, save_path):
                    val_success += 1
        
        # Print statistics
        print(f"\n{class_name} - Train: {train_success}, Validation: {val_success}")

if __name__ == '__main__':
    main() 